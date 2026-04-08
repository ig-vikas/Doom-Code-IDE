use std::path::Path;
use std::time::{Duration, Instant};

use crate::state::RunningProcess;

const PROCESS_EXIT_WAIT_MS: u64 = 1200;

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
        try_remove_file_with_backoff(&running.exec_path, 16, Duration::from_millis(40));
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
