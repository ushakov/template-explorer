import React, { useEffect } from 'react';
import { useAppStore } from '../stores/appStore';
import { TrashIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const TemplateView: React.FC = () => {
  const {
    templates,
    fetchTemplates,
    selectTemplate,
    selectedTemplateId,
    createTemplate,
    deleteSelectedTemplate
  } = useAppStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleCreate = async () => {
    const name = prompt('Enter new template name:');
    if (name) {
      toast.promise(createTemplate(name, `Hello, {{name}}!`), {
        loading: 'Creating template...',
        success: 'Template created.',
        error: 'Failed to create template.',
      });
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this template?')) {
      toast.promise(deleteSelectedTemplate(), {
        loading: 'Deleting template...',
        success: 'Template deleted.',
        error: 'Failed to delete template.',
      });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 flex-none">
          <h2 className="text-lg font-bold">Templates</h2>
          <button className="btn btn-primary btn-sm" onClick={handleCreate}>
              <PlusCircleIcon className="h-5 w-5" />
              New
          </button>
      </div>
      <ul className="menu bg-base-300 rounded-box flex-grow overflow-auto w-full">
        {templates.map((t) => (
          <li key={t.id} className={selectedTemplateId === t.id ? 'bordered' : ''}>
            <a onClick={() => selectTemplate(t.id)} className='flex flex-row justify-between'>
              <span className="flex-1">{t.name}</span>
              {selectedTemplateId === t.id && (
                <button className="btn btn-ghost btn-xs" onClick={handleDelete}>
                  <TrashIcon className="h-4 w-4" />
                </button>
              )}
            </a>
          </li>
        ))}
        {templates.length === 0 && (
            <li className="text-center text-base-content/60 p-4">No templates found.</li>
        )}
      </ul>
    </div>
  );
};

export default TemplateView;