export type Tag = {
  id: string;
  label: string;
  color: string;
};

export interface TagEditorProps {
  fileId: string;
  fileTags: Tag[];
  onTagsChange?: (tags: Tag[]) => void;
}

