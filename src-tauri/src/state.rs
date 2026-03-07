use std::sync::Mutex;

pub struct AppState {
    pub running_process: Mutex<Option<(u32, String)>>, // (PID, exe_path) of running process
}

impl AppState {
    pub fn new() -> Self {
        Self {
            running_process: Mutex::new(None),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
