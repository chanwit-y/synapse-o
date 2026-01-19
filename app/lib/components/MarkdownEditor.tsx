import type {
  AnchorHTMLAttributes,
  HTMLAttributes,
  ImgHTMLAttributes,
  ReactNode,
} from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MDEditor, { commands as mdCommands } from '@uiw/react-md-editor';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useTheme } from './ThemeProvider';
import { MARKDOWN_EDITOR_CSS } from './markdown-editor/editorCss';
import {
  BoldIcon,
  ClearIcon,
  EditCodeIcon,
  FullscreenIcon,
  HeadingIcon,
  ImageIcon,
  ItalicIcon,
  LiveCodeIcon,
  LinkIcon,
  PreviewIcon,
  SaveIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from './markdown-editor/icons';
import { rehypeHighlight, remarkHighlight } from './markdown-editor/highlightPlugins';
import {
  getToolbarButtonCenter,
  insertAtMdEditorCursor,
  normalizePublicPath,
} from './markdown-editor/editorUtils';

type TooltipPopover = {
  visible: boolean;
  content: string;
  x: number;
  y: number;
};

type PositionedPopover = {
  visible: boolean;
  x: number;
  y: number;
};

type EditorCommandCtx = {
  selectedText?: string;
  replaceSelection?: (text: string) => void;
};

type MdCommand = {
  name: string;
  keyCommand: string;
  buttonProps: { 'aria-label': string };
  icon: ReactNode;
  execute: (state: { selectedText?: string }, api: { replaceSelection?: (text: string) => void }) => void;
  shortcuts?: string;
};

const DEFAULT_MARKDOWN = `# Welcome to the Markdown Editor

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
`;
export default function MarkdownEditor() {
  const { theme } = useTheme();

  const [value, setValue] = useState(DEFAULT_MARKDOWN);
  const [previewMode, setPreviewMode] = useState<'edit' | 'live' | 'preview'>('live');
  const valueRef = useRef(value);
  const [tooltip, setTooltip] = useState<TooltipPopover>({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });

  const [imageUploadPopover, setImageUploadPopover] = useState<PositionedPopover>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [linkPopover, setLinkPopover] = useState<PositionedPopover>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [headingPopover, setHeadingPopover] = useState<PositionedPopover>({
    visible: false,
    x: 0,
    y: 0,
  });

  const [linkText, setLinkText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');

  const imageUploadPopoverRef = useRef<HTMLDivElement>(null);
  const linkPopoverRef = useRef<HTMLDivElement>(null);
  const headingPopoverRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkTextInputRef = useRef<HTMLInputElement>(null);
  const headingSelectRef = useRef<HTMLSelectElement>(null);

  const commandCtxRef = useRef<EditorCommandCtx | null>(null);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  // Animate when switching between Edit / Live / Preview
  useEffect(() => {
    const targets = document.querySelectorAll('.w-md-editor-preview, .w-md-editor-text');
    targets.forEach((el) => {
      el.classList.remove('md-mode-switch-anim');
      // Force reflow to restart animation.
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      (el as HTMLElement).offsetWidth;
      el.classList.add('md-mode-switch-anim');
    });
  }, [previewMode]);

  const insertMarkdown = useCallback(
    (markdown: string) => {
      insertAtMdEditorCursor({
        markdown,
        setValue,
        fallbackReplaceSelection: commandCtxRef.current?.replaceSelection,
      });
    },
    [setValue]
  );

  const customCodeEditCommand: MdCommand = useMemo(
    () => ({
      ...(mdCommands.codeEdit as any),
      buttonProps: { 'aria-label': 'Edit code' },
      icon: <EditCodeIcon />,
      execute: (_state: any, api: any, dispatch?: any) => {
        api.textArea?.focus?.();
        setPreviewMode('edit');
        dispatch?.({ preview: 'edit' });
      },
    }),
    []
  );

  const customCodeLiveCommand: MdCommand = useMemo(
    () => ({
      ...(mdCommands.codeLive as any),
      buttonProps: { 'aria-label': 'Live code' },
      icon: <LiveCodeIcon />,
      execute: (_state: any, api: any, dispatch?: any) => {
        api.textArea?.focus?.();
        setPreviewMode('live');
        dispatch?.({ preview: 'live' });
      },
    }),
    []
  );

  const customCodePreviewCommand: MdCommand = useMemo(
    () => ({
      ...(mdCommands.codePreview as any),
      buttonProps: { 'aria-label': 'Preview' },
      icon: <PreviewIcon />,
      execute: (_state: any, api: any, dispatch?: any) => {
        api.textArea?.focus?.();
        setPreviewMode('preview');
        dispatch?.({ preview: 'preview' });
      },
    }),
    []
  );

  const customFullscreenCommand: MdCommand = useMemo(
    () => ({
      ...(mdCommands.fullscreen as any),
      buttonProps: { 'aria-label': 'Toggle fullscreen' },
      icon: <FullscreenIcon />,
    }),
    []
  );

  const customBoldCommand: MdCommand = useMemo(
    () => ({
      name: 'bold',
      keyCommand: 'bold',
      buttonProps: { 'aria-label': 'Bold (Ctrl+B)' },
      icon: <BoldIcon />,
      shortcuts: 'ctrl+b',
      execute: (state, api) => {
        api.replaceSelection?.(`**${state.selectedText || 'Bold Text'}**`);
      },
    }),
    []
  );

  const customItalicCommand: MdCommand = useMemo(
    () => ({
      name: 'italic',
      keyCommand: 'italic',
      buttonProps: { 'aria-label': 'Italic (Ctrl+I)' },
      icon: <ItalicIcon />,
      shortcuts: 'ctrl+i',
      execute: (state, api) => {
        api.replaceSelection?.(`*${state.selectedText || 'Italic Text'}*`);
      },
    }),
    []
  );

  const customUnderlineCommand: MdCommand = useMemo(
    () => ({
      name: 'underline',
      keyCommand: 'underline',
      buttonProps: { 'aria-label': 'Underline (Ctrl+U)' },
      icon: <UnderlineIcon />,
      shortcuts: 'ctrl+u',
      execute: (state, api) => {
        api.replaceSelection?.(`<u>${state.selectedText || 'Underline Text'}</u>`);
      },
    }),
    []
  );

  const customStrikethroughCommand: MdCommand = useMemo(
    () => ({
      name: 'strikethrough',
      keyCommand: 'strikethrough',
      buttonProps: { 'aria-label': 'Strikethrough' },
      icon: <StrikethroughIcon />,
      execute: (state, api) => {
        api.replaceSelection?.(`~~${state.selectedText || 'Strikethrough Text'}~~`);
      },
    }),
    []
  );

  const customImageCommand: MdCommand = useMemo(
    () => ({
      name: 'image',
      keyCommand: 'image',
      buttonProps: { 'aria-label': 'Insert Image' },
      icon: <ImageIcon />,
      execute: (state, api) => {
        commandCtxRef.current = { selectedText: state.selectedText, replaceSelection: api.replaceSelection };
        const pos = getToolbarButtonCenter('Insert Image');
        setImageUploadPopover({ visible: true, x: pos.x, y: pos.y });
      },
    }),
    []
  );

  const customLinkCommand: MdCommand = useMemo(
    () => ({
      name: 'link',
      keyCommand: 'link',
      buttonProps: { 'aria-label': 'Insert Link' },
      icon: <LinkIcon />,
      execute: (state, api) => {
        commandCtxRef.current = { selectedText: state.selectedText, replaceSelection: api.replaceSelection };
        const pos = getToolbarButtonCenter('Insert Link');
        setLinkPopover({ visible: true, x: pos.x, y: pos.y });

        setLinkText(state.selectedText || '');
        setLinkUrl('');
        setTimeout(() => linkTextInputRef.current?.focus(), 100);
      },
    }),
    []
  );

  const customHeadingCommand: MdCommand = useMemo(
    () => ({
      name: 'heading',
      keyCommand: 'heading',
      buttonProps: { 'aria-label': 'Insert Heading' },
      icon: <HeadingIcon />,
      execute: (state, api) => {
        commandCtxRef.current = { selectedText: state.selectedText, replaceSelection: api.replaceSelection };
        const pos = getToolbarButtonCenter('Insert Heading');
        setHeadingPopover({ visible: true, x: pos.x, y: pos.y });
        setTimeout(() => headingSelectRef.current?.focus(), 100);
      },
    }),
    []
  );

  const customSaveCommand: MdCommand = useMemo(
    () => ({
      name: 'save',
      keyCommand: 'save',
      buttonProps: { 'aria-label': 'Save' },
      icon: <SaveIcon />,
      execute: () => {
        console.log('Save clicked:', valueRef.current);
      },
    }),
    []
  );

  const customClearCommand: MdCommand = useMemo(
    () => ({
      name: 'clear',
      keyCommand: 'clear',
      buttonProps: { 'aria-label': 'Clear' },
      icon: <ClearIcon />,
      execute: () => {
        setValue('');
        valueRef.current = '';
        setImageUploadPopover({ visible: false, x: 0, y: 0 });
        setLinkPopover({ visible: false, x: 0, y: 0 });
        setHeadingPopover({ visible: false, x: 0, y: 0 });
        setLinkText('');
        setLinkUrl('');
      },
    }),
    []
  );

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        alert('Image file is too large. Please select an image smaller than 10MB.');
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', { method: 'POST', body: formData });
        const result = (await response.json()) as { success?: boolean; path?: string; error?: string };

        if (!response.ok) {
          throw new Error(result.error || 'Failed to upload file');
        }

        if (!result.success || !result.path) {
          throw new Error('Upload failed: No file path returned');
        }

        const imagePath = normalizePublicPath(result.path);
        const altText = file.name.replace(/\.[^/.]+$/, '');
        insertMarkdown(`![${altText}](${imagePath})`);

        setImageUploadPopover({ visible: false, x: 0, y: 0 });
      } catch (error) {
        console.error('Error uploading image:', error);
        alert(error instanceof Error ? error.message : 'Error uploading image. Please try again.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [insertMarkdown]
  );

  const handleLinkSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      const url = linkUrl.trim();
      if (!url) {
        alert('Please enter a URL');
        return;
      }

      const text = linkText.trim() || url;
      insertMarkdown(`[${text}](${url})`);

      setLinkPopover({ visible: false, x: 0, y: 0 });
      setLinkText('');
      setLinkUrl('');
    },
    [insertMarkdown, linkText, linkUrl]
  );

  const handleHeadingSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const level = Number.parseInt(e.target.value, 10);
      if (!level || level < 1 || level > 6) return;

      const selectedText = commandCtxRef.current?.selectedText || 'Heading';
      insertMarkdown(`${'#'.repeat(level)} ${selectedText}`);

      setHeadingPopover({ visible: false, x: 0, y: 0 });
      if (headingSelectRef.current) headingSelectRef.current.value = '';
    },
    [insertMarkdown]
  );

  // Close popovers on outside click
  useEffect(() => {
    const anyOpen = imageUploadPopover.visible || linkPopover.visible || headingPopover.visible;
    if (!anyOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (
        imageUploadPopover.visible &&
        imageUploadPopoverRef.current &&
        !imageUploadPopoverRef.current.contains(target) &&
        !target.closest('[aria-label="Insert Image"]')
      ) {
        setImageUploadPopover({ visible: false, x: 0, y: 0 });
      }

      if (
        linkPopover.visible &&
        linkPopoverRef.current &&
        !linkPopoverRef.current.contains(target) &&
        !target.closest('[aria-label="Insert Link"]')
      ) {
        setLinkPopover({ visible: false, x: 0, y: 0 });
      }

      if (
        headingPopover.visible &&
        headingPopoverRef.current &&
        !headingPopoverRef.current.contains(target) &&
        !target.closest('[aria-label="Insert Heading"]')
      ) {
        setHeadingPopover({ visible: false, x: 0, y: 0 });
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [headingPopover.visible, imageUploadPopover.visible, linkPopover.visible]);

  // Tooltip for ??highlight??
  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.classList.contains('custom-highlight')) return;
      const rect = target.getBoundingClientRect();
      const content = target.getAttribute('data-popover') || '';
      setTooltip({
        visible: true,
        content,
        x: rect.left + rect.width / 2,
        y: rect.top - 45,
      });
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('custom-highlight') || target.querySelector('.custom-highlight')) {
        setTooltip((prev) => ({ ...prev, visible: false }));
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
    };
  }, []);

  const previewComponents = useMemo(
    () => ({
      h1: ({ ...props }: HTMLAttributes<HTMLHeadingElement>) => (
        <h1
          style={{ color: theme === 'dark' ? '#8B9AFF' : '#636CCB', fontSize: '2rem' }}
          {...props}
        />
      ),
      p: ({ ...props }: HTMLAttributes<HTMLParagraphElement>) => (
        <p
          style={{ color: theme === 'dark' ? '#E5E5E5' : '#37353E', fontSize: '.95rem' }}
          {...props}
        />
      ),
      a: ({ ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a style={{ color: '#0BA6DF', fontSize: '.95rem' }} {...props} />
      ),
      img: ({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) => {
        let imageSrc = typeof src === 'string' ? src : undefined;
        if (imageSrc?.startsWith('/api/upload/')) imageSrc = imageSrc.replace('/api/upload/', '/upload/');
        if (imageSrc) imageSrc = normalizePublicPath(imageSrc);

        return (
          <img
            src={imageSrc}
            alt={alt || ''}
            style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px', margin: '10px 0' }}
            {...props}
          />
        );
      },
      code: ({ inline, ...props }: HTMLAttributes<HTMLElement> & { inline?: boolean }) => {
        return (
          <code
            style={{
              backgroundColor: inline ? (theme === 'dark' ? '#2a2a2a' : 'lightgray') : 'transparent',
              color: inline && theme === 'dark' ? '#E5E5E5' : undefined,
              padding: '0.2rem 0.4rem',
              borderRadius: '4px',
            }}
            {...props}
          />
        );
      },
    }),
    [theme]
  );

  const commands = useMemo(
    () => [
      customSaveCommand,
      customClearCommand,
      mdCommands.divider as any,
      customBoldCommand,
      customItalicCommand,
      customUnderlineCommand,
      customStrikethroughCommand,
      mdCommands.divider as any,
      customHeadingCommand,
      customImageCommand,
      customLinkCommand,
    ],
    [
      customBoldCommand,
      customClearCommand,
      customHeadingCommand,
      customImageCommand,
      customItalicCommand,
      customLinkCommand,
      customSaveCommand,
      customStrikethroughCommand,
      customUnderlineCommand,
    ]
  );

  const extraCommands = useMemo(
    () => [
      customCodeEditCommand,
      customCodeLiveCommand,
      customCodePreviewCommand,
      mdCommands.divider as any,
      customFullscreenCommand,
    ],
    [customCodeEditCommand, customCodeLiveCommand, customCodePreviewCommand, customFullscreenCommand]
  );

  return (
    <div style={{ padding: '10px', width: '100%', margin: '0 auto' }}>
      <style>{MARKDOWN_EDITOR_CSS}</style>

      <MDEditor
        value={value}
        onChange={(val) => setValue(val || '')}
        height="calc(100vh - 100px)"
        preview={previewMode}
        data-color-mode={theme}
        visibleDragbar={false}
        previewOptions={{
          rehypePlugins: [rehypeKatex, rehypeHighlight],
          remarkPlugins: [remarkMath, remarkHighlight],
          components: previewComponents as any,
        }}
        commands={commands as any}
        extraCommands={extraCommands as any}
        hideToolbar={false}
      />

      {tooltip.visible && (
        <div
          className="popover"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
        >
          {tooltip.content}
        </div>
      )}

      {imageUploadPopover.visible && (
        <div
          ref={imageUploadPopoverRef}
          className="image-upload-popover"
          style={{ left: imageUploadPopover.x, top: imageUploadPopover.y, transform: 'translateX(-50%)' }}
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

      {linkPopover.visible && (
        <div
          ref={linkPopoverRef}
          className="link-popover"
          style={{ left: linkPopover.x, top: linkPopover.y, transform: 'translateX(-50%)' }}
        >
          <h3>Insert Link</h3>
          <form onSubmit={handleLinkSubmit}>
            <label htmlFor="link-text">Link Text</label>
            <input
              ref={linkTextInputRef}
              id="link-text"
              type="text"
              placeholder="Enter link text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
            />
            <label htmlFor="link-url">URL</label>
            <input
              id="link-url"
              type="text"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              required
            />
            <button type="submit">Insert Link</button>
          </form>
        </div>
      )}

      {headingPopover.visible && (
        <div
          ref={headingPopoverRef}
          className="heading-popover"
          style={{ left: headingPopover.x, top: headingPopover.y, transform: 'translateX(-50%)' }}
        >
          <h3>Insert Heading</h3>
          <label htmlFor="heading-level">Heading Level</label>
          <select
            ref={headingSelectRef}
            id="heading-level"
            onChange={handleHeadingSelect}
            defaultValue=""
          >
            <option value="" disabled>
              Select heading level
            </option>
            <option value="1">Heading 1</option>
            <option value="2">Heading 2</option>
            <option value="3">Heading 3</option>
            <option value="4">Heading 4</option>
            <option value="5">Heading 5</option>
            <option value="6">Heading 6</option>
          </select>
        </div>
      )}
    </div>
  );
}