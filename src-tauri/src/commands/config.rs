use std::fs;
use std::path::PathBuf;

fn get_config_dir() -> Result<PathBuf, String> {
    let base = if let Some(data_dir) = std::env::var_os("APPDATA") {
        let mut p = PathBuf::from(data_dir);
        p.push("com.doomcode.ide");
        p
    } else {
        PathBuf::from(".")
    };
    fs::create_dir_all(&base).map_err(|e| format!("Failed to create config dir: {}", e))?;
    Ok(base)
}

#[tauri::command]
pub async fn load_config(filename: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let config_dir = get_config_dir()?;
        let config_path = config_dir.join(&filename);

        if config_path.exists() {
            fs::read_to_string(&config_path)
                .map_err(|e| format!("Failed to read config '{}': {}", filename, e))
        } else {
            Ok(String::new())
        }
    })
    .await
    .map_err(|e| format!("Config load worker failed: {}", e))?
}

#[tauri::command]
pub async fn save_config(
    filename: String,
    data: String,
) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let config_dir = get_config_dir()?;
        let config_path = config_dir.join(&filename);

        if let Some(parent) = config_path.parent() {
            fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create config directory: {}", e))?;
        }

        fs::write(&config_path, &data)
            .map_err(|e| format!("Failed to save config '{}': {}", filename, e))
    })
    .await
    .map_err(|e| format!("Config save worker failed: {}", e))?
}
