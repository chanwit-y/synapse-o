// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod import;

#[tauri::command]
fn greet(name: &str) -> String {
  format!("Hello, {}!", name)
} 

#[tauri::command]
fn import(src_path: &str) -> String {
    let res = import::run(src_path);
    match res {
      Ok(path) => path,
      Err(e) => {
        println!("Import failed: {}", e);
        "".to_string()
      },
    }
}

fn main() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![greet, import])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
