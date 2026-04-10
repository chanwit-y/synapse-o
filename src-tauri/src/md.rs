use std::collections::HashMap;
use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ExtractedFile {
    pub path: String,
    pub code: String,
}
/// Parses a markdown-formatted document and extracts file paths and their code blocks.
///
/// Supported formats:
/// ```text
/// ### File N: path/to/file.ext
/// ```language
/// <code>
/// ```
///
/// ### `path/to/file.ext`
/// ```language
/// <code>
/// ```
/// ```
pub fn extract_files(input: &str) -> Vec<ExtractedFile> {
    let mut results = Vec::new();
    let lines: Vec<&str> = input.lines().collect();
    let mut i = 0;

    while i < lines.len() {
        let line = lines[i].trim();

        // Match header like "### File 1: e2e/fixtures/mock-data.ts"
        if let Some(path) = parse_file_header(line) {
            // Scan forward for the next code fence opening
            i += 1;
            while i < lines.len() {
                let trimmed = lines[i].trim();
                if trimmed.starts_with("```") && trimmed.len() > 3 {
                    // Found opening fence (e.g. ```typescript), now collect until closing ```
                    i += 1;
                    let mut code_lines = Vec::new();
                    while i < lines.len() && lines[i].trim() != "```" {
                        code_lines.push(lines[i]);
                        i += 1;
                    }
                    results.push(ExtractedFile {
                        path: path.to_string(),
                        code: code_lines.join("\n"),
                    });
                    break;
                }
                i += 1;
            }
        }
        i += 1;
    }

    // println!("results: {:?}", results);
    results

}

/// Extracts files and returns them as a HashMap keyed by file path.
pub fn extract_files_map(input: &str) -> HashMap<String, String> {
    // println!("extract_files_map: {}", input);
    extract_files(input)
        .into_iter()
        .map(|f| (f.path, f.code))
        .collect()
}

/// Parses a markdown header line to extract the file path.
///
/// Supported formats:
///   "### File 1: e2e/fixtures/mock-data.ts"  -> Some("e2e/fixtures/mock-data.ts")
///   "### `tests/pages/app.page.ts`"          -> Some("tests/pages/app.page.ts")
fn parse_file_header(line: &str) -> Option<&str> {
    let line = line.strip_prefix("###")?;
    let line = line.trim();

    // Format: `path/to/file.ext`
    if let Some(inner) = line.strip_prefix('`').and_then(|s| s.strip_suffix('`')) {
        let path = inner.trim();
        if !path.is_empty() {
            return Some(path);
        }
    }

    // Format: File N: path/to/file.ext
    let (_, rest) = line.split_once(':')?;
    let path = rest.trim();
    if path.is_empty() {
        None
    } else {
        Some(path)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_file_header_numbered() {
        assert_eq!(
            parse_file_header("### File 1: e2e/fixtures/mock-data.ts"),
            Some("e2e/fixtures/mock-data.ts")
        );
    }

    #[test]
    fn test_parse_file_header_backtick() {
        assert_eq!(
            parse_file_header("### `tests/pages/applications.page.ts`"),
            Some("tests/pages/applications.page.ts")
        );
    }

    #[test]
    fn test_parse_file_header_non_matching() {
        assert_eq!(parse_file_header("## Not a match"), None);
        assert_eq!(parse_file_header("plain text"), None);
    }

    #[test]
    fn test_extract_backtick_format() {
        let md = r#"
Here are the generated files.

---

### `tests/fixtures/applications.data.ts`
```typescript
export const DASHBOARD_URL = 'https://example.com/dashboard';
```

---

### `tests/pages/applications.page.ts`
```typescript
import { Page } from '@playwright/test';

export class ApplicationsPage {
  constructor(private readonly page: Page) {}
}
```

---

### `tests/applications.spec.ts`
```typescript
import { expect, test } from '@playwright/test';

test('loads', async ({ page }) => {
  await expect(page).toHaveURL(/dashboard/);
});
```
"#;
        let files = extract_files(md);
        assert_eq!(files.len(), 3);

        assert_eq!(files[0].path, "tests/fixtures/applications.data.ts");
        assert!(files[0].code.contains("DASHBOARD_URL"));

        assert_eq!(files[1].path, "tests/pages/applications.page.ts");
        assert!(files[1].code.contains("ApplicationsPage"));

        assert_eq!(files[2].path, "tests/applications.spec.ts");
        assert!(files[2].code.contains("test('loads'"));
    }

    #[test]
    fn test_extract_mixed_formats() {
        let md = r#"
### File 1: src/old-format.ts
```typescript
const x = 1;
```

### `src/new-format.ts`
```typescript
const y = 2;
```
"#;
        let files = extract_files(md);
        assert_eq!(files.len(), 2);
        assert_eq!(files[0].path, "src/old-format.ts");
        assert_eq!(files[1].path, "src/new-format.ts");
    }
}
