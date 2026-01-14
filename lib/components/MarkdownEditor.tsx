import { useState, useRef, useEffect } from 'react';
import MDEditor, { commands } from '@uiw/react-md-editor';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Define a custom bold icon component
const CustomBoldIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
  </svg>
);


// Define a custom bold command with the new icon
const customBoldCommand = {
  name: "bold",
  keyCommand: "bold",
  buttonProps: { "aria-label": "Bold (Ctrl+B)" },
  icon: <CustomBoldIcon />, // Use the custom bold icon
  execute: (state: { selectedText: any; }, api: { replaceSelection: (arg0: string) => void; }) => {
    // Define the action for bold command
    let modifyText = `**${state.selectedText || "Bold Text"}**`;
    api.replaceSelection(modifyText);
  },
  shortcuts: "ctrl+b", // Add keyboard shortcut
};

// Custom image icon component
const CustomImageIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);


// Custom remark plugin to parse ??text?? syntax
function remarkHighlight() {
  return (tree: any) => {
    const visit = (node: any, index: number, parent: any) => {
      if (node.type === 'text') {
        const text = node.value;
        const highlightRegex = /\?\?([^?]+)\?\?/g;
        const matches = [...text.matchAll(highlightRegex)];

        if (matches.length > 0) {
          const newNodes: any[] = [];
          let lastIndex = 0;

          matches.forEach((match) => {
            const matchStart = match.index!;
            const matchEnd = matchStart + match[0].length;

            // Add text before the match
            if (matchStart > lastIndex) {
              const beforeText = text.slice(lastIndex, matchStart);
              if (beforeText) {
                newNodes.push({
                  type: 'text',
                  value: beforeText
                });
              }
            }

            // Add the highlighted text as an HTML element with popover data
            const popoverContent = `This is highlighted text: "${match[1]}"`;
            newNodes.push({
              type: 'html',
              value: `<span class="custom-highlight" data-popover="${popoverContent}" style="background-color: #ffeb3b; color: #333; padding: 2px 4px; border-radius: 3px; font-weight: 500; box-shadow: 0 1px 3px rgba(0,0,0,0.1); cursor: help;">${match[1]}</span>`
            });

            lastIndex = matchEnd;
          });

          // Add remaining text after the last match
          if (lastIndex < text.length) {
            const remainingText = text.slice(lastIndex);
            if (remainingText) {
              newNodes.push({
                type: 'text',
                value: remainingText
              });
            }
          }

          // Replace the original text node with the new nodes
          if (parent && newNodes.length > 0) {
            parent.children.splice(index, 1, ...newNodes);
          }
        }
      }

      // Recursively visit children
      if (node.children) {
        node.children.forEach((child: any, childIndex: number) => {
          visit(child, childIndex, node);
        });
      }
    };

    // Start visiting from the root
    visit(tree, 0, null);
  };
}

// Custom rehype plugin to handle the highlight elements
function rehypeHighlight() {
  return (tree: any) => {
    // This plugin will work with the HTML elements created by the remark plugin
    return tree;
  };
}


export default function MarkdownEditor() {
  const [popover, setPopover] = useState<{
    visible: boolean;
    content: string;
    x: number;
    y: number;
  }>({
    visible: false,
    content: '',
    x: 0,
    y: 0
  });
  const [imageUploadPopover, setImageUploadPopover] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({
    visible: false,
    x: 0,
    y: 0
  });
  const imageUploadPopoverRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorApiRef = useRef<{ 
    replaceSelection: (text: string) => void;
    setState: (state: any) => void;
    getState: () => any;
  } | null>(null);
  const editorStateRef = useRef<any>(null);
  // const [selectionPopover, setSelectionPopover] = useState<{
  //   visible: boolean;
  //   content: string;
  //   x: number;
  //   y: number;
  // }>({
  //   visible: false,
  //   content: '',
  //   x: 0,
  //   y: 0
  // });
  const popoverRef = useRef<HTMLDivElement>(null);
  const selectionPopoverRef = useRef<HTMLDivElement>(null);

  // Custom image command that shows upload popover
  const customImageCommand = {
    name: "image",
    keyCommand: "image",
    buttonProps: { "aria-label": "Insert Image" },
    icon: <CustomImageIcon />,
    execute: (state: any, api: any) => {
      // Store the API reference and current state for later use
      editorApiRef.current = api;
      editorStateRef.current = state;
      
      // Get the button element position to show popover near it
      const toolbar = document.querySelector('.w-md-editor-toolbar');
      const imageButton = toolbar?.querySelector('[aria-label="Insert Image"]') as HTMLElement;
      
      if (imageButton) {
        const rect = imageButton.getBoundingClientRect();
        setImageUploadPopover({
          visible: true,
          x: rect.left + rect.width / 2,
          y: rect.bottom + 10
        });
      } else {
        // Fallback to center of screen
        setImageUploadPopover({
          visible: true,
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        });
      }
    },
  };

  // Handle file selection
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Check file size (limit to 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert('Image file is too large. Please select an image smaller than 10MB.');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    try {
      // Create FormData to upload the file
      const formData = new FormData();
      formData.append('file', file);

      // Upload the file to the API
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const result = await response.json();
      
      if (!result.success || !result.path) {
        throw new Error('Upload failed: No file path returned');
      }

      // Get the file path from the response
      // Ensure the path is properly formatted (should be /upload/filename)
      let imagePath = result.path;
      
      // Normalize the path - ensure it starts with /
      if (!imagePath.startsWith('/')) {
        imagePath = '/' + imagePath;
      }
      
      // Log for debugging (can be removed in production)
      console.log('Image uploaded successfully:', imagePath);
      
      const altText = file.name.replace(/\.[^/.]+$/, ""); // Remove file extension
      const imageMarkdown = `![${altText}](${imagePath})`;
      
      // Get the current cursor position from the textarea
      const textarea = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
      
      if (textarea) {
        const currentText = textarea.value;
        const cursorStart = textarea.selectionStart;
        const cursorEnd = textarea.selectionEnd;
        
        // Insert the image markdown at the current cursor position
        const newText = 
          currentText.substring(0, cursorStart) + 
          imageMarkdown + 
          currentText.substring(cursorEnd);
        
        // Update the editor value
        setValue(newText);
        
        // Set cursor position after the inserted image markdown
        setTimeout(() => {
          const newTextarea = document.querySelector('.w-md-editor-text-input') as HTMLTextAreaElement;
          if (newTextarea) {
            const newCursorPos = cursorStart + imageMarkdown.length;
            newTextarea.focus();
            newTextarea.setSelectionRange(newCursorPos, newCursorPos);
          }
        }, 10);
      } else if (editorApiRef.current) {
        // Fallback to replaceSelection if textarea is not found
        editorApiRef.current.replaceSelection(imageMarkdown);
      }
      
      // Close the popover
      setImageUploadPopover({ visible: false, x: 0, y: 0 });
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error instanceof Error ? error.message : 'Error uploading image. Please try again.');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle click outside to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        imageUploadPopoverRef.current &&
        !imageUploadPopoverRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('[aria-label="Insert Image"]')
      ) {
        setImageUploadPopover({ visible: false, x: 0, y: 0 });
      }
    };

    if (imageUploadPopover.visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [imageUploadPopover.visible]);

  // Handle popover events
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('custom-highlight')) {
        const rect = target.getBoundingClientRect();
        const content = target.getAttribute('data-popover') || '';
        setPopover({
          visible: true,
          content,
          x: rect.left + rect.width / 2,
          y: rect.top - 45
        });
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // console.log('custom-highlight', target.classList.contains('custom-highlight'))
      if (target.classList.contains('custom-highlight') || target.querySelector('.custom-highlight')) {
        setPopover(prev => ({ ...prev, visible: false }));
      }
    };

    // // Handle text selection in the editor
    // const handleSelectionChange = () => {
    //   const selection = window.getSelection();
    //   if (selection && selection.toString().trim().length > 0) {
    //     const range = selection.getRangeAt(0);
    //     const rect = range.getBoundingClientRect();
    //     const selectedText = selection.toString().trim();

    //     // For debugging: show popover for any selection first
    //     // TODO: Restrict to editor area once working
    //     setSelectionPopover({
    //       visible: true,
    //       content: `Selected: "${selectedText}"`,
    //       x: rect.left + rect.width / 2,
    //       y: rect.top - 45
    //     });

    //     // Check if selection is within the markdown editor
    //     const editorContainer = document.querySelector('.w-md-editor');
    //     const isInEditor = editorContainer && (
    //       editorContainer.contains(range.commonAncestorContainer) ||
    //       editorContainer.contains(range.startContainer) ||
    //       editorContainer.contains(range.endContainer)
    //     );

    //     // If not in editor, hide the popover
    //     if (!isInEditor) {
    //       setSelectionPopover(prev => ({ ...prev, visible: false }));
    //     }
    //   } else {
    //     setSelectionPopover(prev => ({ ...prev, visible: false }));
    //   }
    // };

    // Handle mouse up events for text selection
    // const handleMouseUp = () => {
    //   // Small delay to ensure selection is complete
    //   setTimeout(() => {
    //     handleSelectionChange();
    //   }, 10);
    // };

    // Add event listeners to the document
    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    // document.addEventListener('selectionchange', handleSelectionChange);
    // document.addEventListener('mouseup', handleMouseUp);

    // Also add event listeners specifically to the editor when it's available
    const addEditorListeners = () => {
      const editorContainer = document.querySelector('.w-md-editor');
      if (editorContainer) {
        // editorContainer.addEventListener('mouseup', handleMouseUp as EventListener);
        // editorContainer.addEventListener('selectstart', () => {
        //   // Clear any existing selection popover when starting a new selection
        //   setSelectionPopover(prev => ({ ...prev, visible: false }));
        // });
      }
    };

    // Try to add editor listeners immediately and also after a delay
    addEditorListeners();
    const timeoutId = setTimeout(addEditorListeners, 1000);

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      // document.removeEventListener('selectionchange', handleSelectionChange);
      // document.removeEventListener('mouseup', handleMouseUp);

      const editorContainer = document.querySelector('.w-md-editor');
      if (editorContainer) {
        // editorContainer.removeEventListener('mouseup', handleMouseUp as EventListener);
        editorContainer.removeEventListener('selectstart', () => { });
      }

      clearTimeout(timeoutId);
    };
  }, []);

  const [value, setValue] = useState(`# Welcome to the Markdown Editor

## Features
- **Live preview** - See your formatted text in real-time
- **Syntax highlighting** - Code blocks with syntax highlighting
- **Toolbar** - Easy formatting with toolbar buttons
- **Fullscreen mode** - Focus on your writing
- **Math support** - KaTeX for mathematical expressions
- **Custom highlight** - Use ??text?? to highlight important text

## Math Examples

### Inline Math
The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

### Block Math
$$c = \pm\sqrt{a^2 + b^2}$$

More complex equation:
$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

## Example Code Block

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
}

greet('World');
\`\`\`

## Lists

### Unordered List
- Item 1
- Item 2
- Item 3

### Ordered List
1. First item
2. Second item
3. Third item

## Custom Highlight Examples

This is normal text with ??highlighted text?? using our custom syntax.

You can highlight ??important information?? or ??key concepts?? in your documents.

## Links and Images

[Visit GitHub](https://github.com)

## Tables

| Feature | Supported |
|---------|-----------|
| Bold | ✓ |
| Italic | ✓ |
| Code | ✓ |

> This is a blockquote
> Start writing your markdown here!
`);

  // .token.title.important {
  //    color: red !important;
  //    line-height: 1.2;
  //    font-size: 15px !important;
  //    font-weight: 600 !important;
  // }
  return (
    <div style={{ padding: '10px', width: '1200px', margin: '0 auto' }}>
      <style>
        {`
        body .w-md-editor-text-pre > code,
        body .w-md-editor-text-input {
            // font-size: 1rem !important;
            font-size: 0.9rem !important;
            letter-spacing: 0.6px !important;
            line-height: 1.8 !important;
        }

        .code-line {
           color: #333 !important;
        }

        .token.title.important {
           color: #636CCB !important;
        }

        .token.title.important > .token.punctuation {
           color: #636CCB !important;
        }


        .code-line > .token.url {
           color: #EF7722 !important;
        }

        .token.url > .token.url {
           color: #0BA6DF !important;
        }

        .token.url > .token.content {
           color: #0BA6DF !important;
        }



        .token.strike {
          text-decoration: line-through !important;
          color: #BF092F !important;
        }

        .token.bold > .token.content,
        .token.bold > .token.punctuation {
          color: #B6771D !important;
        }


        .token.italic > .token.content {
           color: #FA812F !important;
        }

        .token.italic > .token.punctuation {
           color: #FA812F !important;
        }
        
        .custom-highlight {
          background-color: #F4F754;
          color: #333;
          padding: 2px 4px;
          border-radius: 3px;
          font-weight: 500;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          cursor: help;
        }

        .popover {
          position: fixed;
          background: #333;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1000;
          pointer-events: none;
          max-width: 300px;
          word-wrap: break-word;
        }

        .popover::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #333;
        }

        .selection-popover {
          position: fixed;
          background: #4E61D3;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1001;
          pointer-events: none;
          max-width: 300px;
          word-wrap: break-word;
        }

        .selection-popover::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #4E61D3;
        }

        .image-upload-popover {
          position: fixed;
          background: white;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          z-index: 1002;
          min-width: 280px;
        }

        .image-upload-popover::before {
          content: '';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-bottom-color: white;
        }

        .image-upload-popover::after {
          content: '';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 7px solid transparent;
          border-bottom-color: #e0e0e0;
          margin-bottom: -1px;
        }

        .image-upload-popover h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: #333;
        }

        .image-upload-popover input[type="file"] {
          width: 100%;
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
          cursor: pointer;
        }

        .image-upload-popover input[type="file"]:hover {
          border-color: #0BA6DF;
        }
          
        `}
      </style>
      {/* <h1 style={{ marginBottom: '20px', color: '#333' }}>React Markdown Editor</h1> */}
      <MDEditor
        value={value}
        onChange={(val) => {
          setValue(val || '')
        }}
        height="calc(100vh - 100px)"
        preview="live"
        data-color-mode="light"
        visibleDragbar={false}

        // textareaProps={{

        //   // renderTextarea: renderCustomTextarea,
        // }}
        previewOptions={{
          rehypePlugins: [rehypeKatex, rehypeHighlight],
          remarkPlugins: [remarkMath, remarkHighlight],
          components: {
            // textarea: ({ node, ...props }) => {
            //   console.log(node)
            //   return <textarea style={{ fontSize: '.95rem' }} {...props} />
            // },
            h1: ({ node, ...props }) => (
              <h1 style={{ color: '#636CCB', fontSize: '2rem' }} {...props} />
            ),
            p: ({ node, ...props }) => (
              <p style={{ color: '#37353E', fontSize: '.95rem' }} {...props} />
            ),
            a: ({ node, ...props }) => (
              <a style={{ color: '#0BA6DF', fontSize: '.95rem' }} {...props} />
            ),
            img: ({ node, src, alt, ...props }: any) => {
              // Ensure image paths are correctly resolved
              // If src starts with /upload/, it's already correct
              // If it starts with /api/upload/, convert to /upload/
              let imageSrc = src;
              if (src?.startsWith('/api/upload/')) {
                imageSrc = src.replace('/api/upload/', '/upload/');
              }
              
              return (
                <img
                  src={imageSrc}
                  alt={alt || ''}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    borderRadius: '4px',
                    margin: '10px 0',
                  }}
                  onError={(e) => {
                    console.error('Image failed to load:', imageSrc);
                    // Optionally show a placeholder or error message
                  }}
                  {...props}
                />
              );
            },
            code: ({ inline, node, ...props }: any) => (
              <code
                style={{
                  backgroundColor: inline ? 'lightgray' : 'transparent',
                  padding: '0.2rem 0.4rem',
                  borderRadius: '4px',
                }}
                {...props}
              />
            ),
          }
        }}

        commands={[customBoldCommand, commands.italic, commands.link, commands.code, customImageCommand]} // Use custom image command with upload popover
        hideToolbar={false}
      />
      {/* <hr /> */}
      {/* <pre>{JSON.stringify(value, null, 2)}</pre> */}

      {/* Popover Component */}
      {popover.visible && (
        <div
          ref={popoverRef}
          className="popover"
          style={{
            left: popover.x,
            top: popover.y,
            transform: 'translateX(-50%)'
          }}
        >
          {popover.content}
        </div>
      )}

      {/* Image Upload Popover Component */}
      {imageUploadPopover.visible && (
        <div
          ref={imageUploadPopoverRef}
          className="image-upload-popover"
          style={{
            left: imageUploadPopover.x,
            top: imageUploadPopover.y,
            transform: 'translateX(-50%)'
          }}
        >
          <h3>Upload Image</h3>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'block', width: '100%' }}
          />
        </div>
      )}

      {/* Selection Popover Component */}
      {/* {selectionPopover.visible && (
        <div
          ref={selectionPopoverRef}
          className="selection-popover"
          style={{
            left: selectionPopover.x,
            top: selectionPopover.y,
            transform: 'translateX(-50%)'
          }}
        >
          {selectionPopover.content}
        </div>
      )} */}
    </div>
  );
}