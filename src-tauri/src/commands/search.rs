use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use regex::Regex;
use walkdir::WalkDir;

use crate::utils::is_excluded;

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SearchResult {
    pub path: String,
    pub line: u32,
    pub column: u32,
    pub line_content: String,
}

#[tauri::command]
pub async fn search_in_files(
    directory: String,
    query: String,
    case_sensitive: bool,
    whole_word: bool,
    use_regex: bool,
    include_pattern: Option<String>,
    exclude_pattern: Option<String>,
    max_results: u32,
) -> Result<Vec<SearchResult>, String> {
    let mut results: Vec<SearchResult> = Vec::new();

    let pattern = if use_regex {
        if case_sensitive {
            Regex::new(&query).map_err(|e| format!("Invalid regex: {}", e))?
        } else {
            Regex::new(&format!("(?i){}", query)).map_err(|e| format!("Invalid regex: {}", e))?
        }
    } else {
        let escaped = regex::escape(&query);
        let pattern = if whole_word {
            format!(r"\b{}\b", escaped)
        } else {
            escaped
        };
        if case_sensitive {
            Regex::new(&pattern).map_err(|e| format!("Invalid pattern: {}", e))?
        } else {
            Regex::new(&format!("(?i){}", pattern)).map_err(|e| format!("Invalid pattern: {}", e))?
        }
    };

    let include_globs: Vec<glob::Pattern> = include_pattern
        .iter()
        .flat_map(|p| p.split(',').map(|s| s.trim().to_string()))
        .filter_map(|p| glob::Pattern::new(&p).ok())
        .collect();

    let exclude_globs: Vec<glob::Pattern> = exclude_pattern
        .iter()
        .flat_map(|p| p.split(',').map(|s| s.trim().to_string()))
        .filter_map(|p| glob::Pattern::new(&p).ok())
        .collect();

    for entry in WalkDir::new(&directory)
        .max_depth(10)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !is_excluded(&name)
        })
    {
        if results.len() >= max_results as usize {
            break;
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if entry.file_type().is_dir() {
            continue;
        }

        let file_path = entry.path();
        let file_name = file_path.file_name().unwrap_or_default().to_string_lossy();

        // Check include patterns
        if !include_globs.is_empty()
            && !include_globs.iter().any(|g| g.matches(&file_name))
        {
            continue;
        }

        // Check exclude patterns
        if exclude_globs.iter().any(|g| g.matches(&file_name)) {
            continue;
        }

        // Skip binary files (check first few bytes)
        if is_binary(file_path) {
            continue;
        }

        let content = match fs::read_to_string(file_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        for (line_idx, line) in content.lines().enumerate() {
            if results.len() >= max_results as usize {
                break;
            }

            for mat in pattern.find_iter(line) {
                if results.len() >= max_results as usize {
                    break;
                }

                results.push(SearchResult {
                    path: file_path.to_string_lossy().to_string(),
                    line: (line_idx + 1) as u32,
                    column: (mat.start() + 1) as u32,
                    line_content: line.to_string(),
                });
            }
        }
    }

    Ok(results)
}

fn is_binary(path: &Path) -> bool {
    match fs::read(path) {
        Ok(bytes) => {
            let check_len = std::cmp::min(bytes.len(), 8000);
            bytes[..check_len].iter().any(|&b| b == 0)
        }
        Err(_) => true,
    }
}
