/**
 * @file tagEditorTypes.ts
 * @description Type definitions for tag editing functionality including Tag structure and TagEditorProps.
 */
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

