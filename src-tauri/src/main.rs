// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;

mod import;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

#[tauri::command]
fn extract_import(src_path: &str) -> String {
    let res = import::run(src_path);
    match res {
        Ok(path) => path,
        Err(e) => {
            println!("Import failed: {}", e);
            "".to_string()
        }
    }
}

#[tauri::command]
fn read_files(paths: Vec<String>) -> String {
    let mut content = String::new();
    for path in paths {
        let c = fs::read_to_string(&path).unwrap_or_default();
        content.push_str(c.as_str());
    }
    content
}

#[tauri::command]
fn read_file(path: String) -> String {
    let c = fs::read_to_string(&path).unwrap_or_default();
   c.to_string()
}
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![greet, extract_import, read_file, read_files])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
