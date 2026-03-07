use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

use crate::utils::is_excluded;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub extension: Option<String>,
    pub children: Option<Vec<FileNode>>,
    pub size: Option<u64>,
}

#[tauri::command]
pub async fn read_directory(path: String, max_depth: u32) -> Result<Vec<FileNode>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("'{}' is not a directory", path));
    }
    read_dir_recursive(root, 0, max_depth)
}

fn read_dir_recursive(dir: &Path, current_depth: u32, max_depth: u32) -> Result<Vec<FileNode>, String> {
    if current_depth > max_depth {
        return Ok(Vec::new());
    }

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory '{}': {}", dir.display(), e))?;

    let mut folders: Vec<FileNode> = Vec::new();
    let mut files: Vec<FileNode> = Vec::new();

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        let name = entry.file_name().to_string_lossy().to_string();

        if is_excluded(&name) {
            continue;
        }

        let entry_path = entry.path();
        let path_str = entry_path.to_string_lossy().to_string();

        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        let is_dir = metadata.is_dir();

        if is_dir {
            let children = if current_depth < max_depth {
                Some(read_dir_recursive(&entry_path, current_depth + 1, max_depth)?)
            } else {
                Some(Vec::new())
            };

            folders.push(FileNode {
                name,
                path: path_str,
                is_dir: true,
                extension: None,
                children,
                size: None,
            });
        } else {
            let extension = entry_path
                .extension()
                .map(|e| e.to_string_lossy().to_string());

            files.push(FileNode {
                name,
                path: path_str,
                is_dir: false,
                extension,
                children: None,
                size: Some(metadata.len()),
            });
        }
    }

    // Sort: folders first (alphabetical), then files (alphabetical)
    folders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    folders.extend(files);
    Ok(folders)
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path)
        .map_err(|e| format!("Failed to create directory '{}': {}", path, e))
}
