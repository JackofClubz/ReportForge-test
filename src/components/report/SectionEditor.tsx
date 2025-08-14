import React, { useState, useEffect } from 'react';
import { Button } from '@carbon/react';
import { Add, Edit, Save } from '@carbon/icons-react';
import { BlockNoteViewRaw, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteEditor, Block, PartialBlock } from "@blocknote/core";
import styles from '../../styles/components/report/SectionEditor.module.scss';

interface SectionEditorProps {
  reportId: string;
  sectionId: string;
  sectionTitle: string;
  sectionNumber?: number | string;
  initialContent?: PartialBlock[];
  onAddComment: (sectionId: string, selection: any) => void;
  onContentChange?: (content: Block[]) => void;
  level?: number;
}

const SectionEditor: React.FC<SectionEditorProps> = ({
  reportId,
  sectionId,
  sectionTitle,
  sectionNumber,
  initialContent = [{
    type: "paragraph",
    content: "",
    props: {
      textAlignment: "left",
      backgroundColor: "default",
      textColor: "default"
    }
  }],
  onAddComment,
  onContentChange,
  level = 2
}) => {
  const [editing, setEditing] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const editor = useCreateBlockNote({
    initialContent
  });

  // Handle content changes
  useEffect(() => {
    if (editor && onContentChange) {
      editor.onEditorContentChange(() => {
        onContentChange(editor.topLevelBlocks);
      });
    }
  }, [editor, onContentChange]);
  
  // Handle edit toggle
  const handleEditToggle = () => {
    setEditing(!editing);
    editor.isEditable = !editing;
  };
  
  // Handle save
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      // For mock purposes, just simulate an API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('Saving section content:', {
        reportId,
        sectionId,
        content: editor?.topLevelBlocks
      });
      
      setEditing(false);
      editor.isEditable = false;
    } catch (err) {
      console.error('Failed to save section content:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle add comment
  const handleAddComment = () => {
    if (!editor) return;
    
    const selection = editor.getSelectedText();
    if (!selection) return;
    
    // Get the current block
    const currentBlock = editor.getTextCursorPosition().block;
    
    onAddComment(sectionId, {
      text: selection,
      blockId: currentBlock.id
    });
  };
  
  const renderSectionNumber = () => {
    if (sectionNumber === undefined) return null;
    return <span className={styles.sectionNumber}>{sectionNumber}</span>;
  };
  
  // Render heading based on level
  const renderHeading = () => {
    switch(level) {
      case 1:
        return <h1 className={styles.sectionTitle}>{renderSectionNumber()}{sectionTitle}</h1>;
      case 2:
        return <h2 className={styles.sectionTitle}>{renderSectionNumber()}{sectionTitle}</h2>;
      case 3:
        return <h3 className={styles.sectionTitle}>{renderSectionNumber()}{sectionTitle}</h3>;
      case 4:
        return <h4 className={styles.sectionTitle}>{renderSectionNumber()}{sectionTitle}</h4>;
      default:
        return <h2 className={styles.sectionTitle}>{renderSectionNumber()}{sectionTitle}</h2>;
    }
  };

  // Set initial editor state
  useEffect(() => {
    editor.isEditable = editing;
  }, [editor, editing]);
  
  return (
    <div id={sectionId} className={styles.sectionContainer}>
      {renderHeading()}
      
      <div className={styles.sectionControls}>
        {!editing && (
          <Button
            kind="ghost"
            size="sm"
            renderIcon={Add}
            onClick={handleAddComment}
            iconDescription="Add Comment"
            hasIconOnly
          />
        )}
        
        <Button
          kind={editing ? 'primary' : 'ghost'}
          size="sm"
          renderIcon={editing ? Save : Edit}
          onClick={editing ? handleSave : handleEditToggle}
          disabled={saving}
          iconDescription={editing ? 'Save' : 'Edit'}
        >
          {editing ? 'Save' : 'Edit'}
        </Button>
      </div>
      
      <div className={styles.sectionContent}>
        <div className={styles.editorContainer}>
          <BlockNoteViewRaw 
            editor={editor}
            theme="light"
          />
        </div>
      </div>
      
      {error && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}
    </div>
  );
};

export default SectionEditor; 