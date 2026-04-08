use regex::Regex;
use serde::{Deserialize, Serialize};
use std::process::{Command, Stdio};
use std::sync::mpsc;
use std::sync::OnceLock;
use std::time::{Duration, Instant};

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
    static COMPILE_ERROR_RE: OnceLock<Regex> = OnceLock::new();
    let re = COMPILE_ERROR_RE.get_or_init(|| {
        Regex::new(r"(?m)^(.+?):(\d+):(\d+):\s*(error|warning|note|fatal error):\s*(.+)$")
            .expect("compile error regex should be valid")
    });

    let mut errors = Vec::new();
    for cap in re.captures_iter(stderr) {
        errors.push(CompileError {
            file: cap[1].to_string(),
            line: cap[2].parse().unwrap_or(0),
            column: cap[3].parse().unwrap_or(0),
            severity: cap[4].to_string(),
            message: cap[5].to_string(),
        });
    }

    errors
}

fn compiler_name_or_default(compiler_path: Option<String>) -> String {
    compiler_path
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "g++".to_string())
}

fn maybe_log_duration(label: &str, started: Instant) {
    if std::env::var_os("DOOM_CODE_METRICS").is_some() {
        eprintln!("[metrics] {}={}ms", label, started.elapsed().as_millis());
    }
}

#[tauri::command]
pub async fn compile_cpp(
    source_path: String,
    output_path: String,
    flags: Vec<String>,
    compiler_path: Option<String>,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<CompileResult, String> {
    // Kill only the known previously-started process, then attempt to delete stale executable.
    if let Some(running) = super::process::take_running_process(&state)? {
        super::process::terminate_and_wait(running.pid, Duration::from_millis(1200));
        super::process::try_remove_file_with_backoff(
            &running.exec_path,
            18,
            Duration::from_millis(35),
        );
    }
    super::process::try_remove_file_with_backoff(
        &output_path,
        18,
        Duration::from_millis(30),
    );

    let compiler = compiler_name_or_default(compiler_path);
    let total_started = Instant::now();

    let compile_result = tauri::async_runtime::spawn_blocking(move || {
        let started = Instant::now();
        let mut cmd = Command::new(&compiler);
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
                "Failed to execute compiler '{}': {}. Make sure it exists and is in PATH.",
                compiler, e
            )
        })?;

        let duration_ms = started.elapsed().as_millis() as u64;
        let stdout = String::from_utf8_lossy(&output.stdout).into_owned();
        let stderr = String::from_utf8_lossy(&output.stderr).into_owned();
        let parsed = parse_compile_errors(&stderr);

        let mut warnings = Vec::new();
        let mut actual_errors = Vec::new();
        for item in parsed {
            if item.severity == "warning" {
                warnings.push(format!(
                    "{}:{}:{}: {}",
                    item.file, item.line, item.column, item.message
                ));
            } else if item.severity != "note" {
                actual_errors.push(item);
            }
        }

        Ok::<CompileResult, String>(CompileResult {
            success: output.status.success(),
            stdout,
            stderr: stderr.clone(),
            duration_ms,
            errors: actual_errors,
            warnings,
            raw_output: stderr,
        })
    })
    .await
    .map_err(|e| format!("Compile worker failed: {}", e))??;

    maybe_log_duration("compile_cpp.total", total_started);
    Ok(compile_result)
}

#[tauri::command]
pub async fn run_executable(
    exec_path: String,
    stdin: String,
    timeout_ms: u64,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<RunResult, String> {
    use std::io::Write;

    let started = Instant::now();
    let mut cmd = Command::new(&exec_path);
    cmd.stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to run executable '{}': {}", exec_path, e))?;
    let pid = child.id();

    super::process::set_running_process(
        &state,
        crate::state::RunningProcess {
            pid,
            exec_path: exec_path.clone(),
        },
    )?;

    if let Some(mut stdin_pipe) = child.stdin.take() {
        let _ = stdin_pipe.write_all(stdin.as_bytes());
    }

    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(child.wait_with_output());
    });

    let timeout = Duration::from_millis(timeout_ms);
    let result = match rx.recv_timeout(timeout) {
        Ok(wait_result) => match wait_result {
            Ok(output) => Ok(RunResult {
                stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
                stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
                exit_code: output.status.code(),
                duration_ms: started.elapsed().as_millis() as u64,
                timed_out: false,
            }),
            Err(e) => Err(format!("Process error: {}", e)),
        },
        Err(mpsc::RecvTimeoutError::Timeout) => {
            super::process::terminate_and_wait(pid, Duration::from_millis(1200));
            Ok(RunResult {
                stdout: String::new(),
                stderr: "Time Limit Exceeded".to_string(),
                exit_code: None,
                duration_ms: timeout_ms,
                timed_out: true,
            })
        }
        Err(mpsc::RecvTimeoutError::Disconnected) => {
            Err("Runner thread disconnected unexpectedly".to_string())
        }
    };

    let _ = super::process::clear_running_process(&state, pid);
    maybe_log_duration("run_executable.total", started);
    result
}
