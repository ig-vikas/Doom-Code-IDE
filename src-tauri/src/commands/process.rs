use std::io::Read;
use std::path::Path;
use std::process::{Child, ExitStatus};
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::sync::{mpsc, Arc};
use std::time::{Duration, Instant};

use crate::state::RunningProcess;

const PROCESS_EXIT_WAIT_MS: u64 = 1200;
pub const OUTPUT_CAPTURE_LIMIT_BYTES: usize = 4 * 1024 * 1024;
pub const OUTPUT_CAPTURE_LIMIT_LABEL: &str = "4 MB";

pub struct CapturedProcessOutput {
    pub stdout: Vec<u8>,
    pub stderr: Vec<u8>,
    pub status: ExitStatus,
    pub timed_out: bool,
    pub output_limit_exceeded: bool,
}

#[tauri::command]
pub async fn kill_running_process(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let running = {
        let mut guard = state
            .running_process
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        guard.take()
    };

    if let Some(running) = running {
        terminate_and_wait(running.pid, Duration::from_millis(PROCESS_EXIT_WAIT_MS));
        if let Some(cleanup_path) = running.cleanup_path.as_deref() {
            try_remove_file_with_backoff(cleanup_path, 16, Duration::from_millis(40));
        }
    }

    Ok(())
}

pub fn set_running_process(
    state: &crate::state::AppState,
    process: RunningProcess,
) -> Result<(), String> {
    let mut guard = state.running_process.lock().map_err(|e| e.to_string())?;
    *guard = Some(process);
    Ok(())
}

pub fn clear_running_process(
    state: &crate::state::AppState,
    pid: u32,
) -> Result<(), String> {
    let mut guard = state.running_process.lock().map_err(|e| e.to_string())?;
    if guard.as_ref().map(|p| p.pid) == Some(pid) {
        *guard = None;
    }
    Ok(())
}

pub fn take_running_process(
    state: &crate::state::AppState,
) -> Result<Option<RunningProcess>, String> {
    let mut guard = state.running_process.lock().map_err(|e| e.to_string())?;
    Ok(guard.take())
}

pub fn terminate_and_wait(pid: u32, timeout: Duration) -> bool {
    terminate_pid(pid);
    wait_for_pid_exit(pid, timeout)
}

/// Force-kill a process and its tree by PID.
pub fn terminate_pid(pid: u32) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new("taskkill");
        cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
        cmd.creation_flags(0x08000000);
        let _ = cmd.output();
    }

    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }
}

pub fn try_remove_file_with_backoff(path: &str, attempts: usize, delay: Duration) -> bool {
    let p = Path::new(path);
    if !p.exists() {
        return true;
    }

    for _ in 0..attempts {
        match std::fs::remove_file(p) {
            Ok(_) => return true,
            Err(_) if !p.exists() => return true,
            Err(_) => std::thread::sleep(delay),
        }
    }

    false
}

pub fn collect_child_output(
    mut child: Child,
    timeout: Option<Duration>,
    max_output_bytes: usize,
) -> Result<CapturedProcessOutput, String> {
    let pid = child.id();
    let total_bytes = Arc::new(AtomicUsize::new(0));
    let output_limit_exceeded = Arc::new(AtomicBool::new(false));

    let stdout_handle = child.stdout.take().map(|stdout| {
        spawn_output_reader(
            stdout,
            pid,
            max_output_bytes,
            Arc::clone(&total_bytes),
            Arc::clone(&output_limit_exceeded),
        )
    });
    let stderr_handle = child.stderr.take().map(|stderr| {
        spawn_output_reader(
            stderr,
            pid,
            max_output_bytes,
            Arc::clone(&total_bytes),
            Arc::clone(&output_limit_exceeded),
        )
    });

    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let _ = tx.send(child.wait());
    });

    let mut timed_out = false;
    let status = match timeout {
        Some(timeout) => match rx.recv_timeout(timeout) {
            Ok(wait_result) => wait_result.map_err(|e| format!("Process error: {}", e))?,
            Err(mpsc::RecvTimeoutError::Timeout) => {
                timed_out = true;
                terminate_and_wait(pid, Duration::from_millis(PROCESS_EXIT_WAIT_MS));
                rx.recv_timeout(Duration::from_millis(PROCESS_EXIT_WAIT_MS + 400))
                    .map_err(|_| "Process did not exit after timeout".to_string())?
                    .map_err(|e| format!("Process error after timeout: {}", e))?
            }
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                return Err("Runner thread disconnected unexpectedly".to_string());
            }
        },
        None => rx
            .recv()
            .map_err(|_| "Runner thread disconnected unexpectedly".to_string())?
            .map_err(|e| format!("Process error: {}", e))?,
    };

    let stdout = join_output_reader(stdout_handle);
    let stderr = join_output_reader(stderr_handle);

    Ok(CapturedProcessOutput {
        stdout,
        stderr,
        status,
        timed_out,
        output_limit_exceeded: output_limit_exceeded.load(Ordering::SeqCst),
    })
}

fn join_output_reader(handle: Option<std::thread::JoinHandle<Vec<u8>>>) -> Vec<u8> {
    match handle {
        Some(reader) => reader.join().unwrap_or_default(),
        None => Vec::new(),
    }
}

fn spawn_output_reader<R: Read + Send + 'static>(
    mut reader: R,
    pid: u32,
    max_output_bytes: usize,
    total_bytes: Arc<AtomicUsize>,
    output_limit_exceeded: Arc<AtomicBool>,
) -> std::thread::JoinHandle<Vec<u8>> {
    std::thread::spawn(move || {
        let mut captured = Vec::new();
        let mut buffer = [0u8; 8192];

        loop {
            match reader.read(&mut buffer) {
                Ok(0) => break,
                Ok(bytes_read) => {
                    let previous_total = total_bytes.fetch_add(bytes_read, Ordering::SeqCst);
                    let bytes_allowed = max_output_bytes.saturating_sub(previous_total).min(bytes_read);

                    if bytes_allowed > 0 {
                        captured.extend_from_slice(&buffer[..bytes_allowed]);
                    }

                    if previous_total + bytes_read > max_output_bytes {
                        if !output_limit_exceeded.swap(true, Ordering::SeqCst) {
                            terminate_pid(pid);
                        }
                        break;
                    }
                }
                Err(_) => break,
            }
        }

        captured
    })
}

fn wait_for_pid_exit(pid: u32, timeout: Duration) -> bool {
    let started = Instant::now();
    while started.elapsed() < timeout {
        if !is_pid_running(pid) {
            return true;
        }
        std::thread::sleep(Duration::from_millis(25));
    }
    !is_pid_running(pid)
}

fn is_pid_running(pid: u32) -> bool {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        let mut cmd = std::process::Command::new("tasklist");
        cmd.args(["/FI", &format!("PID eq {}", pid), "/FO", "CSV", "/NH"]);
        cmd.creation_flags(0x08000000);

        if let Ok(output) = cmd.output() {
            let text = String::from_utf8_lossy(&output.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if trimmed.is_empty() {
                    continue;
                }
                if trimmed.starts_with("INFO:") {
                    return false;
                }
                if trimmed.contains(&format!(",\"{}\"", pid)) || trimmed.ends_with(&format!(",\"{}\"", pid)) {
                    return true;
                }
            }
        }
        false
    }

    #[cfg(not(windows))]
    {
        std::process::Command::new("kill")
            .args(["-0", &pid.to_string()])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }
}
