export type Tag = {
  id: string;
  label: string;
  color: string;
};

export type SaveFileParams = {
  id: string | null;
  name: string;
  collectionId: string;
  content: string;
  icon?: string | null;
  tags?: Tag[];
};

export type SaveFileResult = {
  success: boolean;
  id?: string;
  error?: string;
};

export type LoadFileResult = {
  success: boolean;
  file?: {
    content?: string | null;
  };
  error?: string;
};

export type FileDetailsResult = {
  success: boolean;
  file?: {
    id: string;
    name: string;
    content?: string | null;
    icon?: string | null;
    tags?: Tag[];
    [key: string]: unknown;
  };
  error?: string;
};

export type UpdateIconResult = {
  success: boolean;
  error?: string;
};

export type UploadImageResult = {
  success: boolean;
  path?: string;
  error?: string;
};
