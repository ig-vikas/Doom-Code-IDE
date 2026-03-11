mod commands;
mod state;
mod utils;

use state::AppState;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .manage(AppState::new())
        .setup(|app| {
            // Set the window icon for taskbar/alt-tab on Windows
            if let Some(window) = app.get_webview_window("main") {
                let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))
                    .expect("Failed to load app icon");
                let _ = window.set_icon(icon);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // File operations
            commands::file_ops::read_file,
            commands::file_ops::write_file,
            commands::file_ops::rename_path,
            commands::file_ops::delete_path,
            commands::file_ops::create_file,
            commands::file_ops::file_exists,
            commands::file_ops::get_file_info,
            // Folder operations
            commands::folder_ops::read_directory,
            commands::folder_ops::create_directory,
            // Build
            commands::build::compile_cpp,
            commands::build::run_executable,
            // Config
            commands::config::load_config,
            commands::config::save_config,
            // Search
            commands::search::search_in_files,
            // Process
            commands::process::kill_running_process,
            // System
            commands::system::get_app_data_dir,
            commands::system::check_compiler,
            commands::system::open_in_file_explorer,
            commands::system::get_current_timestamp,
            commands::system::run_shell_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Doom Code");
}
