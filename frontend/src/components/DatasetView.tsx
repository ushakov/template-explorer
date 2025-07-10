import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../stores/appStore';
import { FaTrash } from 'react-icons/fa';
import toast from 'react-hot-toast';

const DatasetView: React.FC = () => {
  const {
    datasets,
    fetchDatasets,
    uploadDataset,
    deleteDataset,
    selectDataset,
    selectedDatasetId,
    fetchDatasetRecord,
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDatasets();
  }, [fetchDatasets]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        toast.promise(uploadDataset(file), {
          loading: `Uploading ${file.name}...`,
          success: `${file.name} uploaded successfully!`,
          error: `Failed to upload ${file.name}.`,
        });
      } finally {
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this dataset?')) {
      toast.promise(deleteDataset(id), {
        loading: 'Deleting dataset...',
        success: 'Dataset deleted.',
        error: 'Failed to delete dataset.',
      });
    }
  };

  const handleSelect = (id: string) => {
    if (selectedDatasetId === id) {
        selectDataset(null);
    } else {
        selectDataset(id);
        fetchDatasetRecord(id, 0);
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <h2 className="text-lg font-bold mb-3 flex-none">Datasets</h2>
      <div className="flex-none mb-4">
        <input
          ref={fileInputRef}
          type="file"
          className="file-input file-input-bordered file-input-primary w-full"
          onChange={handleFileChange}
          accept=".json,.jsonl,.txt"
        />
      </div>
      <ul className="menu bg-base-300 rounded-box my-4 flex-grow overflow-auto w-full">
        {datasets.map((ds) => (
          <li key={ds.id} className={selectedDatasetId === ds.id ? 'bordered' : ''}>
            <a onClick={() => handleSelect(ds.id)}>
              <span className="flex-1">{ds.name}</span>
              <span className="badge badge-neutral">{ds.file_format}</span>
              <button className="btn btn-ghost btn-xs" onClick={(e) => handleDelete(e, ds.id)}>
                <FaTrash />
              </button>
            </a>
          </li>
        ))}
        {datasets.length === 0 && (
            <li className="text-center text-base-content/60 p-4">No datasets found.</li>
        )}
      </ul>
    </div>
  );
};

export default DatasetView;