use serde::{Deserialize, Serialize};
use std::process::Command;
use std::time::Instant;
use regex::Regex;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CompileResult {
    pub success: bool,
    pub stdout: String,
    pub stderr: String,
    pub duration_ms: u64,
    pub errors: Vec<CompileError>,
    pub warnings: Vec<String>,
    pub raw_output: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct CompileError {
    pub file: String,
    pub line: u32,
    pub column: u32,
    pub severity: String,
    pub message: String,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RunResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
    pub timed_out: bool,
}

fn parse_compile_errors(stderr: &str) -> Vec<CompileError> {
    let re = Regex::new(r"(?m)^(.+?):(\d+):(\d+):\s*(error|warning|note|fatal error):\s*(.+)$").unwrap();
    let mut errors = Vec::new();

    for cap in re.captures_iter(stderr) {
        let file = cap[1].to_string();
        let line: u32 = cap[2].parse().unwrap_or(0);
        let column: u32 = cap[3].parse().unwrap_or(0);
        let severity = cap[4].to_string();
        let message = cap[5].to_string();

        errors.push(CompileError {
            file,
            line,
            column,
            severity,
            message,
        });
    }

    errors
}

#[tauri::command]
pub async fn compile_cpp(
    source_path: String,
    output_path: String,
    flags: Vec<String>,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<CompileResult, String> {
    // Kill any leftover running process that might be locking the exe
    {
        let mut proc = state.running_process.lock().map_err(|e| e.to_string())?;
        if let Some((pid, ref exe)) = proc.take() {
            super::process::force_kill_pid(pid);
            super::process::force_kill_by_name(exe);
            std::thread::sleep(std::time::Duration::from_millis(500));
            super::process::force_delete_exe(exe);
        }
    }

    // Also kill any process matching the target exe name and delete it
    super::process::force_kill_by_name(&output_path);
    std::thread::sleep(std::time::Duration::from_millis(300));
    super::process::force_delete_exe(&output_path);

    let start = Instant::now();

    let mut cmd = Command::new("g++");
    cmd.args(&flags)
        .arg(&source_path)
        .arg("-o")
        .arg(&output_path);

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let output = cmd.output().map_err(|e| {
        format!(
            "Failed to execute compiler 'g++': {}. Make sure g++ is installed and in PATH.",
            e
        )
    })?;

    let duration_ms = start.elapsed().as_millis() as u64;
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let errors = parse_compile_errors(&stderr);
    let warnings: Vec<String> = errors.iter()
        .filter(|e| e.severity == "warning")
        .map(|e| format!("{}:{}:{}: {}", e.file, e.line, e.column, e.message))
        .collect();
    let actual_errors: Vec<CompileError> = errors.into_iter()
        .filter(|e| e.severity != "warning" && e.severity != "note")
        .collect();

    Ok(CompileResult {
        success: output.status.success(),
        stdout,
        stderr: stderr.clone(),
        duration_ms,
        errors: actual_errors,
        warnings,
        raw_output: stderr,
    })
}

#[tauri::command]
pub async fn run_executable(
    exec_path: String,
    stdin: String,
    timeout_ms: u64,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<RunResult, String> {
    use std::io::Write;
    use std::process::Stdio;

    let start = Instant::now();

    let mut cmd = Command::new(&exec_path);
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child = cmd.spawn()
        .map_err(|e| format!("Failed to run executable '{}': {}", exec_path, e))?;

    let child_pid = child.id();

    // Store PID and exe path
    {
        let mut proc = state.running_process.lock().map_err(|e| e.to_string())?;
        *proc = Some((child_pid, exec_path.clone()));
    }

    // Write stdin
    if let Some(mut stdin_pipe) = child.stdin.take() {
        let _ = stdin_pipe.write_all(stdin.as_bytes());
        drop(stdin_pipe);
    }

    // Wait with a real timeout using a separate thread
    let timeout = std::time::Duration::from_millis(timeout_ms);
    let handle = std::thread::spawn(move || child.wait_with_output());

    let result = loop {
        if handle.is_finished() {
            break match handle.join() {
                Ok(Ok(output)) => {
                    let duration_ms = start.elapsed().as_millis() as u64;
                    Ok(RunResult {
                        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
                        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
                        exit_code: output.status.code(),
                        duration_ms,
                        timed_out: false,
                    })
                }
                Ok(Err(e)) => Err(format!("Process error: {}", e)),
                Err(_) => Err("Thread panic during execution".to_string()),
            };
        }
        if start.elapsed() > timeout {
            // Kill the process on timeout
            super::process::force_kill_pid(child_pid);
            break Ok(RunResult {
                stdout: String::new(),
                stderr: "Time Limit Exceeded".to_string(),
                exit_code: None,
                duration_ms: timeout_ms,
                timed_out: true,
            });
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
    };

    // Clear running process
    {
        let mut proc = state.running_process.lock().map_err(|e| e.to_string())?;
        *proc = None;
    }

    result
}
