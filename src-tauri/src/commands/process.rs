#[tauri::command]
pub async fn kill_running_process(
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<(), String> {
    let entry = {
        let mut proc = state
            .running_process
            .lock()
            .map_err(|e| format!("Lock error: {}", e))?;
        proc.take()
    };

    if let Some((pid, exe_path)) = entry {
        // Kill by PID first
        force_kill_pid(pid);
        // Also kill by executable image name (catches detached/child processes)
        force_kill_by_name(&exe_path);
        // Wait for OS to release handles
        std::thread::sleep(std::time::Duration::from_millis(500));
        // Try deleting the exe
        force_delete_exe(&exe_path);
    }
    Ok(())
}

/// Force-kill a process and its entire tree by PID.
pub fn force_kill_pid(pid: u32) {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        // Kill entire process tree
        let mut cmd = std::process::Command::new("taskkill");
        cmd.args(["/F", "/T", "/PID", &pid.to_string()]);
        cmd.creation_flags(0x08000000);
        let _ = cmd.output();
        // Also kill without /T in case tree kill missed it
        let mut cmd2 = std::process::Command::new("taskkill");
        cmd2.args(["/F", "/PID", &pid.to_string()]);
        cmd2.creation_flags(0x08000000);
        let _ = cmd2.output();
    }
    #[cfg(not(windows))]
    {
        let _ = std::process::Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output();
    }
}

/// Force-kill all processes matching the executable's image name.
/// This catches processes that survived PID-based kill (detached children, etc.)
pub fn force_kill_by_name(exe_path: &str) {
    let p = std::path::Path::new(exe_path);
    if let Some(file_name) = p.file_name().and_then(|n| n.to_str()) {
        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            let mut cmd = std::process::Command::new("taskkill");
            cmd.args(["/F", "/IM", file_name]);
            cmd.creation_flags(0x08000000);
            let _ = cmd.output();
        }
        #[cfg(not(windows))]
        {
            let _ = std::process::Command::new("pkill")
                .args(["-9", "-f", file_name])
                .output();
        }
    }
}

/// Force-delete an exe file, retrying multiple times to wait for OS handle release.
/// If the file is locked, also re-attempts killing processes using it.
pub fn force_delete_exe(path: &str) {
    let p = std::path::Path::new(path);
    if !p.exists() {
        return;
    }
    for attempt in 0..20 {
        if std::fs::remove_file(p).is_ok() {
            return;
        }
        // Every 5th retry, try killing processes that might still hold the file
        if attempt % 5 == 4 {
            force_kill_by_name(path);
        }
        std::thread::sleep(std::time::Duration::from_millis(200));
    }
}
