use crate::utils::format_timestamp;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::process::Stdio;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShellOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub success: bool,
    pub terminated_by_output_limit: bool,
}

#[tauri::command]
pub async fn run_shell_command(
    command: String,
    cwd: Option<String>,
    state: tauri::State<'_, crate::state::AppState>,
) -> Result<ShellOutput, String> {
    let app_state = state.inner().clone();

    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = std::process::Command::new("cmd");
        cmd.args(["/C", &command])
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(dir) = &cwd {
            cmd.current_dir(dir);
        }

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let child = cmd
            .spawn()
            .map_err(|e| format!("Failed to run command: {}", e))?;
        let pid = child.id();

        super::process::set_running_process(
            &app_state,
            crate::state::RunningProcess {
                pid,
                cleanup_path: None,
            },
        )?;

        let captured_result = super::process::collect_child_output(
            child,
            None,
            super::process::OUTPUT_CAPTURE_LIMIT_BYTES,
        );
        let _ = super::process::clear_running_process(&app_state, pid);
        let captured = captured_result?;

        let stdout = String::from_utf8_lossy(&captured.stdout).into_owned();
        let stderr = String::from_utf8_lossy(&captured.stderr).into_owned();
        let terminated_by_output_limit = captured.output_limit_exceeded;
        let success = captured.status.success() && !terminated_by_output_limit;

        Ok(ShellOutput {
            stdout,
            stderr: if terminated_by_output_limit {
                if stderr.trim().is_empty() {
                    format!(
                        "Output Limit Exceeded (>{})",
                        super::process::OUTPUT_CAPTURE_LIMIT_LABEL
                    )
                } else {
                    format!(
                        "{}\nOutput Limit Exceeded (>{})",
                        stderr,
                        super::process::OUTPUT_CAPTURE_LIMIT_LABEL
                    )
                }
            } else {
                stderr
            },
            exit_code: captured.status.code(),
            success,
            terminated_by_output_limit,
        })
    })
    .await
    .map_err(|e| format!("Shell worker failed: {}", e))?
}

#[tauri::command]
pub async fn get_app_data_dir() -> Result<String, String> {
    let base = if let Some(data_dir) = std::env::var_os("APPDATA") {
        let mut p = std::path::PathBuf::from(data_dir);
        p.push("com.doomcode.ide");
        p
    } else {
        std::path::PathBuf::from(".")
    };
    
    std::fs::create_dir_all(&base).map_err(|e| format!("Failed to create app data dir: {}", e))?;
    Ok(base.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn check_compiler() -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let output = std::process::Command::new("g++")
            .arg("--version")
            .output()
            .map_err(|e| format!("Compiler 'g++' not found: {}", e))?;

        let version = String::from_utf8_lossy(&output.stdout).to_string();
        if version.is_empty() {
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            if stderr.is_empty() {
                Err("Compiler 'g++' produced no output".to_string())
            } else {
                Ok(stderr)
            }
        } else {
            Ok(version)
        }
    })
    .await
    .map_err(|e| format!("Compiler check worker failed: {}", e))?
}

#[tauri::command]
pub async fn open_in_file_explorer(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let dir = if p.is_dir() { p } else { p.parent().unwrap_or(p) };

    #[cfg(windows)]
    {
        std::process::Command::new("explorer")
            .arg(dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Failed to open explorer: {}", e))?;
    }

    #[cfg(not(windows))]
    {
        std::process::Command::new("xdg-open")
            .arg(dir.to_string_lossy().to_string())
            .spawn()
            .map_err(|e| format!("Failed to open file explorer: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub fn get_current_timestamp() -> String {
    format_timestamp()
}
