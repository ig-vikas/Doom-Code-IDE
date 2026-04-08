use std::sync::atomic::AtomicU64;
use std::sync::{Arc, Mutex};

#[derive(Debug, Clone)]
pub struct RunningProcess {
    pub pid: u32,
    pub exec_path: String,
}

pub struct AppState {
    pub running_process: Arc<Mutex<Option<RunningProcess>>>,
    pub latest_search_token: Arc<AtomicU64>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            running_process: Arc::new(Mutex::new(None)),
            latest_search_token: Arc::new(AtomicU64::new(0)),
        }
    }
}

impl Default for AppState {
    fn default() -> Self {
        Self::new()
    }
}
