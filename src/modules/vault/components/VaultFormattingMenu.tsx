import React from 'react';
import type { Editor } from '@tiptap/react';
import { NoteOptionsMenu, NoteViewMode } from './NoteOptionsMenu';

export interface VaultFormattingMenuProps {
  editor: Editor | null;
  content?: string;
  viewMode: NoteViewMode;
  onViewModeChange: (mode: NoteViewMode) => void;
  onToggleSearch?: () => void;
  onMakeTemplate?: () => void;
  templateSuccess?: boolean;
  onDeleteNote?: () => void;
  disabled?: boolean;
}

export const VaultFormattingMenu: React.FC<VaultFormattingMenuProps> = ({
  editor,
  content,
  viewMode,
  onViewModeChange,
  onToggleSearch,
  onMakeTemplate,
  templateSuccess = false,
  onDeleteNote,
  disabled = false,
}) => {
  return (
    <NoteOptionsMenu
      editor={editor}
      content={content}
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      onToggleSearch={onToggleSearch}
      onMakeTemplate={onMakeTemplate}
      templateSuccess={templateSuccess}
      onDelete={onDeleteNote}
      deleteLabel="Excluir Nota"
      disabled={disabled}
      iconType="vertical"
    />
  );
};
