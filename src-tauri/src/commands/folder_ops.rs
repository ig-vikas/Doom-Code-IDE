use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::Path;
use std::time::UNIX_EPOCH;
use walkdir::WalkDir;

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

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DirectorySnapshot {
    pub signature: String,
    pub total_entries: u64,
    pub latest_modified_ms: u64,
    pub truncated: bool,
}

#[tauri::command]
pub async fn read_directory(path: String, max_depth: u32) -> Result<Vec<FileNode>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let started = std::time::Instant::now();
        let root = Path::new(&path);
        if !root.is_dir() {
            return Err(format!("'{}' is not a directory", path));
        }
        let tree = read_dir_recursive(root, 0, max_depth)?;
        if std::env::var_os("DOOM_CODE_METRICS").is_some() {
            eprintln!(
                "[metrics] read_directory={}ms nodes={}",
                started.elapsed().as_millis(),
                tree.len()
            );
        }
        Ok(tree)
    })
    .await
    .map_err(|e| format!("Directory read worker failed: {}", e))?
}

#[tauri::command]
pub async fn get_directory_snapshot(
    path: String,
    max_depth: u32,
    max_entries: Option<u32>,
) -> Result<DirectorySnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let started = std::time::Instant::now();
        let root = Path::new(&path);
        if !root.is_dir() {
            return Err(format!("'{}' is not a directory", path));
        }

        let mut hasher = DefaultHasher::new();
        let mut total_entries: u64 = 0;
        let mut latest_modified_ms: u64 = 0;
        let mut truncated = false;
        let entry_limit = max_entries.unwrap_or(50_000).max(1) as u64;

        let walker = WalkDir::new(root)
            .max_depth((max_depth as usize).saturating_add(1))
            .into_iter()
            .filter_entry(|entry| !is_excluded(&entry.file_name().to_string_lossy()));

        for entry in walker {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => continue,
            };
            if entry.depth() == 0 {
                continue;
            }

            let metadata = match entry.metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };

            total_entries += 1;
            let modified_ms = modified_timestamp_ms(&metadata);
            if modified_ms > latest_modified_ms {
                latest_modified_ms = modified_ms;
            }

            let relative = entry.path().strip_prefix(root).unwrap_or(entry.path());
            relative.to_string_lossy().hash(&mut hasher);
            entry.file_type().is_dir().hash(&mut hasher);
            metadata.len().hash(&mut hasher);
            modified_ms.hash(&mut hasher);

            if total_entries >= entry_limit {
                truncated = true;
                break;
            }
        }

        let snapshot = DirectorySnapshot {
            signature: format!(
                "{:016x}:{}:{}:{}",
                hasher.finish(),
                total_entries,
                latest_modified_ms,
                if truncated { 1 } else { 0 }
            ),
            total_entries,
            latest_modified_ms,
            truncated,
        };

        if std::env::var_os("DOOM_CODE_METRICS").is_some() {
            eprintln!(
                "[metrics] get_directory_snapshot={}ms entries={} truncated={}",
                started.elapsed().as_millis(),
                snapshot.total_entries,
                snapshot.truncated
            );
        }

        Ok(snapshot)
    })
    .await
    .map_err(|e| format!("Directory snapshot worker failed: {}", e))?
}

fn read_dir_recursive(
    dir: &Path,
    current_depth: u32,
    max_depth: u32,
) -> Result<Vec<FileNode>, String> {
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

        if metadata.is_dir() {
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
            let extension = entry_path.extension().map(|e| e.to_string_lossy().to_string());
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

    folders.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    files.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    folders.extend(files);
    Ok(folders)
}

fn modified_timestamp_ms(metadata: &fs::Metadata) -> u64 {
    metadata
        .modified()
        .ok()
        .and_then(|m| m.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| format!("Failed to create directory '{}': {}", path, e))
}
