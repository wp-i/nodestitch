mod persistence;

use persistence::{TimelineDocument, TimelineStore};
use tauri::Manager;

#[tauri::command]
fn load_timeline_state(store: tauri::State<'_, TimelineStore>) -> Result<TimelineDocument, String> {
    store.load().map_err(|error| error.to_string())
}

#[tauri::command]
fn save_timeline_state(
    store: tauri::State<'_, TimelineStore>,
    document: TimelineDocument,
) -> Result<(), String> {
    store.save(&document).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let database_path = app.path().app_data_dir()?.join("nodestitch.sqlite3");
            let store = TimelineStore::open(database_path)?;
            app.manage(store);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            load_timeline_state,
            save_timeline_state
        ])
        .run(tauri::generate_context!())
        .expect("Nodestitch could not start");
}
