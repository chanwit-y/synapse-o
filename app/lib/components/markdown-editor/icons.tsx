import type { ReactNode } from 'react';

type IconProps = {
  width?: number;
  height?: number;
};

function IconBase({
  children,
  width = 16,
  height = 16,
}: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export const BoldIcon = () => (
  <IconBase>
    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
  </IconBase>
);

export const ItalicIcon = () => (
  <IconBase>
    <line x1="19" y1="4" x2="10" y2="4" />
    <line x1="14" y1="20" x2="5" y2="20" />
    <line x1="15" y1="4" x2="9" y2="20" />
  </IconBase>
);

export const StrikethroughIcon = () => (
  <IconBase>
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </IconBase>
);

export const UnderlineIcon = () => (
  <IconBase>
    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3" />
    <line x1="4" y1="21" x2="20" y2="21" />
  </IconBase>
);

export const LinkIcon = () => (
  <IconBase>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </IconBase>
);

export const ImageIcon = () => (
  <IconBase>
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </IconBase>
);

export const HeadingIcon = () => (
  <IconBase>
    <path d="M6 4h3v16H6V4z" />
    <path d="M15 4h3v16h-3V4z" />
    <path d="M6 12h12" />
  </IconBase>
);


