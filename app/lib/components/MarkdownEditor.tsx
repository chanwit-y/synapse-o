'use client';

import type { AnchorHTMLAttributes, HTMLAttributes, ImgHTMLAttributes, ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import MDEditor, {
  commands as mdCommands,
  type ExecuteState,
  type ICommand,
  type PreviewType,
  type TextAreaTextApi,
} from '@uiw/react-md-editor';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { useTheme } from './ThemeProvider';
import { useSnackbar } from './Snackbar';
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
import type { TreeNode } from './@types/treeViewTypes';

type TooltipState = {
  visible: boolean;
  content: string;
  x: number;
  y: number;
};

type PositionedPopoverState = {
  visible: boolean;
  x: number;
  y: number;
};

type EditorCommandCtx = {
  selectedText?: string;
  replaceSelection?: (text: string) => void;
};

// const DEFAULT_MARKDOWN = `# Welcome to the Markdown Editor

// ## Features
// - **Live preview** - See your formatted text in real-time
// - **Syntax highlighting** - Code blocks with syntax highlighting
// - **Toolbar** - Easy formatting with toolbar buttons
// - **Fullscreen mode** - Focus on your writing
// - **Math support** - KaTeX for mathematical expressions
// - **Custom highlight** - Use ??text?? to highlight important text

// ## Math Examples

// ### Inline Math
// The quadratic formula is $x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$

// ### Block Math
// $$c = \pm\sqrt{a^2 + b^2}$$

// More complex equation:
// $$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

// ## Example Code Block

// \`\`\`javascript
// function greet(name) {
//   console.log(\`Hello, \${name}!\`);
// }

// greet('World');
// \`\`\`

// ## Lists

// ### Unordered List
// - Item 1
// - Item 2
// - Item 3

// ### Ordered List
// 1. First item
// 2. Second item
// 3. Third item

// ## Custom Highlight Examples

// This is normal text with ??highlighted text?? using our custom syntax.

// You can highlight ??important information?? or ??key concepts?? in your documents.

// ## Links and Images

// [Visit GitHub](https://github.com)

// ## Tables

// | Feature | Supported |
// |---------|-----------|
// | Bold | ✓ |
// | Italic | ✓ |
// | Code | ✓ |

// > This is a blockquote
// > Start writing your markdown here!
// `;

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

function useLatestRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

function useModeSwitchAnimation(previewMode: PreviewType) {
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
}

function useHighlightTooltip(): TooltipState {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    content: '',
    x: 0,
    y: 0,
  });

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

  return tooltip;
}

function createModeCommand(opts: {
  base: ICommand;
  ariaLabel: string;
  icon: ReactElement;
  mode: PreviewType;
  setPreviewMode: (mode: PreviewType) => void;
}): ICommand {
  const { base, ariaLabel, icon, mode, setPreviewMode } = opts;
  return {
    ...base,
    buttonProps: { 'aria-label': ariaLabel },
    icon,
    execute: (_state, api, dispatch) => {
      api.textArea?.focus?.();
      setPreviewMode(mode);
      dispatch?.({ preview: mode });
    },
  };
}

function createInsertCommand(opts: {
  name: string;
  keyCommand: string;
  ariaLabel: string;
  icon: ReactElement;
  onOpen: (selectedText: string | undefined, replaceSelection?: (text: string) => void) => void;
}): ICommand {
  const { name, keyCommand, ariaLabel, icon, onOpen } = opts;
  return {
    name,
    keyCommand,
    buttonProps: { 'aria-label': ariaLabel },
    icon,
    execute: (state: ExecuteState, api: TextAreaTextApi) => {
      onOpen(state.selectedText, (text) => {
        api.replaceSelection(text);
      });
    },
  };
}

export default function MarkdownEditor({ selectedFile }: { selectedFile: TreeNode | null }) {
  const { theme } = useTheme();
  const { showSnackbar } = useSnackbar();

  const [value, setValue] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewType>('live');
  const valueRef = useLatestRef(value);
  const tooltip = useHighlightTooltip();

  const [imageUploadPopover, setImageUploadPopover] = useState<PositionedPopoverState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [linkPopover, setLinkPopover] = useState<PositionedPopoverState>({
    visible: false,
    x: 0,
    y: 0,
  });
  const [headingPopover, setHeadingPopover] = useState<PositionedPopoverState>({
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
  const fileIdRef = useRef<string | null>(null);

  useModeSwitchAnimation(previewMode);

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

  const openAtToolbarButton = useCallback(
    (ariaLabel: string, setPopover: (s: PositionedPopoverState) => void) => {
      const pos = getToolbarButtonCenter(ariaLabel);
      setPopover({ visible: true, x: pos.x, y: pos.y });
    },
    []
  );

  const codeEditCommand = useMemo(
    () =>
      createModeCommand({
        base: mdCommands.codeEdit,
        ariaLabel: 'Edit code',
        icon: <EditCodeIcon />,
        mode: 'edit',
        setPreviewMode,
      }),
    [setPreviewMode]
  );

  const codeLiveCommand = useMemo(
    () =>
      createModeCommand({
        base: mdCommands.codeLive,
        ariaLabel: 'Live code',
        icon: <LiveCodeIcon />,
        mode: 'live',
        setPreviewMode,
      }),
    [setPreviewMode]
  );

  const codePreviewCommand = useMemo(
    () =>
      createModeCommand({
        base: mdCommands.codePreview,
        ariaLabel: 'Preview',
        icon: <PreviewIcon />,
        mode: 'preview',
        setPreviewMode,
      }),
    [setPreviewMode]
  );

  const fullscreenCommand = useMemo<ICommand>(
    () => ({
      ...mdCommands.fullscreen,
      buttonProps: { 'aria-label': 'Toggle fullscreen' },
      icon: <FullscreenIcon />,
    }),
    []
  );

  const boldCommand = useMemo<ICommand>(
    () => ({
      name: 'bold',
      keyCommand: 'bold',
      buttonProps: { 'aria-label': 'Bold (Ctrl+B)' },
      icon: <BoldIcon />,
      shortcuts: 'ctrl+b',
      execute: (state: ExecuteState, api: TextAreaTextApi) => {
        api.replaceSelection(`**${state.selectedText || 'Bold Text'}**`);
      },
    }),
    []
  );

  const italicCommand = useMemo<ICommand>(
    () => ({
      name: 'italic',
      keyCommand: 'italic',
      buttonProps: { 'aria-label': 'Italic (Ctrl+I)' },
      icon: <ItalicIcon />,
      shortcuts: 'ctrl+i',
      execute: (state: ExecuteState, api: TextAreaTextApi) => {
        api.replaceSelection(`*${state.selectedText || 'Italic Text'}*`);
      },
    }),
    []
  );

  const underlineCommand = useMemo<ICommand>(
    () => ({
      name: 'underline',
      keyCommand: 'underline',
      buttonProps: { 'aria-label': 'Underline (Ctrl+U)' },
      icon: <UnderlineIcon />,
      shortcuts: 'ctrl+u',
      execute: (state: ExecuteState, api: TextAreaTextApi) => {
        api.replaceSelection(`<u>${state.selectedText || 'Underline Text'}</u>`);
      },
    }),
    []
  );

  const strikethroughCommand = useMemo<ICommand>(
    () => ({
      name: 'strikethrough',
      keyCommand: 'strikethrough',
      buttonProps: { 'aria-label': 'Strikethrough' },
      icon: <StrikethroughIcon />,
      execute: (state: ExecuteState, api: TextAreaTextApi) => {
        api.replaceSelection(`~~${state.selectedText || 'Strikethrough Text'}~~`);
      },
    }),
    []
  );

  const imageCommand = useMemo(
    () =>
      createInsertCommand({
        name: 'image',
        keyCommand: 'image',
        ariaLabel: 'Insert Image',
        icon: <ImageIcon />,
        onOpen: (selectedText, replaceSelection) => {
          commandCtxRef.current = { selectedText, replaceSelection };
          openAtToolbarButton('Insert Image', setImageUploadPopover);
        },
      }),
    [openAtToolbarButton]
  );

  const linkCommand = useMemo(
    () =>
      createInsertCommand({
        name: 'link',
        keyCommand: 'link',
        ariaLabel: 'Insert Link',
        icon: <LinkIcon />,
        onOpen: (selectedText, replaceSelection) => {
          commandCtxRef.current = { selectedText, replaceSelection };
          openAtToolbarButton('Insert Link', setLinkPopover);
          setLinkText(selectedText || '');
          setLinkUrl('');
          setTimeout(() => linkTextInputRef.current?.focus(), 100);
        },
      }),
    [openAtToolbarButton]
  );

  const headingCommand = useMemo(
    () =>
      createInsertCommand({
        name: 'heading',
        keyCommand: 'heading',
        ariaLabel: 'Insert Heading',
        icon: <HeadingIcon />,
        onOpen: (selectedText, replaceSelection) => {
          commandCtxRef.current = { selectedText, replaceSelection };
          openAtToolbarButton('Insert Heading', setHeadingPopover);
          setTimeout(() => headingSelectRef.current?.focus(), 100);
        },
      }),
    [openAtToolbarButton]
  );

  const saveCurrentContent = useCallback(async () => {
    try {
      if (!selectedFile) {
        alert('Please select a file to save.');
        return;
      }

      const response = await fetch('/api/file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: fileIdRef.current,
          name: selectedFile.name || 'untitled.md',
          collectionId: selectedFile.collectionId,
          content: valueRef.current,
        }),
      });

      const result = (await response.json()) as { success?: boolean; id?: string; error?: string };
      if (!response.ok || !result.success || !result.id) {
        throw new Error(result.error || 'Failed to save file');
      }

      fileIdRef.current = result.id;
      console.log('Saved file:', result.id);
      showSnackbar({
        title: 'Saved',
        message: `Saved "${selectedFile.name || 'untitled.md'}"`,
        variant: 'success',
      });
    } catch (error) {
      console.error('Error saving file:', error);
      alert(error instanceof Error ? error.message : 'Error saving file. Please try again.');
    }
  }, [selectedFile, showSnackbar, valueRef]);

  useEffect(() => {
    if (!selectedFile?.id) return;
    fileIdRef.current = selectedFile.id;

    (async () => {
      try {
        const response = await fetch(`/api/file?id=${encodeURIComponent(selectedFile.id)}`);
        if (!response.ok) {
          if (response.status === 404) {
            setValue(selectedFile.content ?? '');
            return;
          }
          const errorBody = (await response.json()) as { error?: string };
          throw new Error(errorBody.error || 'Failed to load file');
        }

        const result = (await response.json()) as { success?: boolean; file?: { content?: string | null } };
        if (!result.success) {
          throw new Error('Failed to load file');
        }

        setValue(result.file?.content ?? '');
      } catch (error) {
        console.error('Error loading file:', error);
        alert(error instanceof Error ? error.message : 'Error loading file. Please try again.');
      }
    })();
  }, [selectedFile?.content, selectedFile?.id]);

  const saveCommand = useMemo<ICommand>(
    () => ({
      name: 'save',
      keyCommand: 'save',
      buttonProps: { 'aria-label': 'Save' },
      icon: <SaveIcon />,
      execute: () => {
        void saveCurrentContent();
      },
    }),
    [saveCurrentContent]
  );

  const clearCommand = useMemo<ICommand>(
    () => ({
      name: 'clear',
      keyCommand: 'clear',
      buttonProps: { 'aria-label': 'Clear' },
      icon: <ClearIcon />,
      execute: () => {
        setValue('');
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

      if (file.size > MAX_IMAGE_BYTES) {
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
      saveCommand,
      clearCommand,
      mdCommands.divider,
      boldCommand,
      italicCommand,
      underlineCommand,
      strikethroughCommand,
      mdCommands.divider,
      headingCommand,
      imageCommand,
      linkCommand,
    ],
    [
      boldCommand,
      clearCommand,
      headingCommand,
      imageCommand,
      italicCommand,
      linkCommand,
      saveCommand,
      strikethroughCommand,
      underlineCommand,
    ]
  );

  const extraCommands = useMemo(
    () => [
      codeEditCommand,
      codeLiveCommand,
      codePreviewCommand,
      mdCommands.divider,
      fullscreenCommand,
    ],
    [codeEditCommand, codeLiveCommand, codePreviewCommand, fullscreenCommand]
  );

  return (
    <div style={{ padding: '10px', width: '100%', margin: '0 auto' }}>
      <style>{MARKDOWN_EDITOR_CSS}</style>

      <MDEditor
        value={value}
        onChange={(val) => setValue(val || '')}
        height="calc(100vh - 160px)"
        preview={previewMode}
        data-color-mode={theme}
        visibleDragbar={false}
        previewOptions={{
          rehypePlugins: [rehypeKatex, rehypeHighlight],
          remarkPlugins: [remarkMath, remarkHighlight],
          components: previewComponents as any,
        }}
        commands={commands}
        extraCommands={extraCommands}
        hideToolbar={false}
      />

      {tooltip.visible && (
        <div
          className="popover"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px`, transform: 'translateX(-50%)' }}
        >
          {tooltip.content}
        </div>
      )}

      {imageUploadPopover.visible && (
        <div
          ref={imageUploadPopoverRef}
          className="image-upload-popover"
          style={{ left: `${imageUploadPopover.x - 320}px`, top: `${imageUploadPopover.y - 60}px`, transform: 'translateX(-50%)' }}
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
          style={{ left: `${linkPopover.x - 320}px`, top: `${linkPopover.y - 60}px`, transform: 'translateX(-50%)' }}
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
          style={{ left: `${headingPopover.x - 320}px`, top: `${headingPopover.y - 60}px`, transform: 'translateX(-50%)' }}
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