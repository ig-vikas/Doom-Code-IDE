use crate::utils::format_timestamp;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ShellOutput {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: Option<i32>,
    pub success: bool,
}

#[tauri::command]
pub async fn run_shell_command(command: String, cwd: Option<String>) -> Result<ShellOutput, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = std::process::Command::new("cmd");
        cmd.args(["/C", &command]);

        if let Some(dir) = &cwd {
            cmd.current_dir(dir);
        }

        #[cfg(windows)]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        let output = cmd
            .output()
            .map_err(|e| format!("Failed to run command: {}", e))?;

        Ok(ShellOutput {
            stdout: String::from_utf8_lossy(&output.stdout).into_owned(),
            stderr: String::from_utf8_lossy(&output.stderr).into_owned(),
            exit_code: output.status.code(),
            success: output.status.success(),
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
