import React, { useCallback, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAppStore } from '../stores/appStore';

const TemplateEditor: React.FC = () => {
  const { selectedTemplate, updateSelectedTemplate, unsavedTemplate, setUnsavedTemplate, createTemplate } = useAppStore();

  const saveTemplate = useCallback(() => {
    if (selectedTemplate?.name) {
      updateSelectedTemplate(selectedTemplate.name, unsavedTemplate);
    } else {
      saveTemplateAs();
    }
  }, [selectedTemplate, unsavedTemplate, updateSelectedTemplate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveTemplate();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveTemplate]);

  const saveTemplateAs = async () => {
    const newName = window.prompt("Enter new template name:");
    if (newName) {
      try {
        await createTemplate(newName, unsavedTemplate);
      } catch (error) {
        // You might want to show an error to the user here
        console.error("Failed to save template as:", error);
      }
    }
  };


  return (
    <div className="flex flex-col h-full">
      <div className="flex-none p-3 border-b border-base-300 font-medium flex flex-row justify-between items-center">
        <span>Template Editor {selectedTemplate && `[${selectedTemplate.name}]`}</span>
        <div className="flex flex-row gap-2">
          <button className="btn btn-primary" onClick={saveTemplate}>Save</button>
          <button className="btn btn-primary" onClick={saveTemplateAs}>Save as</button>
        </div>
      </div>
      <div className="flex-grow relative">
        <Editor
          theme="vs-dark"
          language="twig"
          value={unsavedTemplate}
          onChange={(value) => setUnsavedTemplate(value ?? '')}
          options={{ minimap: { enabled: false }}}
        />
      </div>
    </div>
  );
};

export default TemplateEditor;