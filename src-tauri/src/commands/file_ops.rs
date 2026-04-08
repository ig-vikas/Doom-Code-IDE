use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub modified: String,
    pub is_dir: bool,
    pub extension: Option<String>,
}

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        fs::read_to_string(&path).map_err(|e| format!("Failed to read file '{}': {}", path, e))
    })
    .await
    .map_err(|e| format!("Read file worker failed: {}", e))?
}

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        if let Some(parent) = Path::new(&path).parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        fs::write(&path, &content).map_err(|e| format!("Failed to write file '{}': {}", path, e))
    })
    .await
    .map_err(|e| format!("Write file worker failed: {}", e))?
}

#[tauri::command]
pub async fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        fs::rename(&old_path, &new_path)
            .map_err(|e| format!("Failed to rename '{}' to '{}': {}", old_path, new_path, e))
    })
    .await
    .map_err(|e| format!("Rename worker failed: {}", e))?
}

#[tauri::command]
pub async fn delete_path(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = Path::new(&path);
        if p.is_dir() {
            fs::remove_dir_all(&path).map_err(|e| format!("Failed to delete directory '{}': {}", path, e))
        } else {
            fs::remove_file(&path).map_err(|e| format!("Failed to delete file '{}': {}", path, e))
        }
    })
    .await
    .map_err(|e| format!("Delete worker failed: {}", e))?
}

#[tauri::command]
pub async fn create_file(path: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        if let Some(parent) = Path::new(&path).parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
        fs::write(&path, "").map_err(|e| format!("Failed to create file '{}': {}", path, e))
    })
    .await
    .map_err(|e| format!("Create file worker failed: {}", e))?
}

#[tauri::command]
pub async fn file_exists(path: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || Ok(Path::new(&path).exists()))
        .await
        .map_err(|e| format!("File exists worker failed: {}", e))?
}

#[tauri::command]
pub async fn get_file_info(path: String) -> Result<FileInfo, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let p = Path::new(&path);
        let metadata =
            fs::metadata(&path).map_err(|e| format!("Failed to get file info '{}': {}", path, e))?;

        let name = p
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let extension = p.extension().map(|e| e.to_string_lossy().to_string());

        let modified = metadata
            .modified()
            .map(|t| {
                let datetime: chrono::DateTime<chrono::Local> = t.into();
                datetime.format("%d.%m.%Y %H.%M.%S").to_string()
            })
            .unwrap_or_else(|_| "Unknown".to_string());

        Ok(FileInfo {
            name,
            path: path.clone(),
            size: metadata.len(),
            modified,
            is_dir: metadata.is_dir(),
            extension,
        })
    })
    .await
    .map_err(|e| format!("File info worker failed: {}", e))?
}
