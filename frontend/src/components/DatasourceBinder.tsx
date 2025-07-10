import React from 'react';
import { useAppStore, type DataSourceBinding } from '../stores/appStore';
import { TrashIcon } from '@heroicons/react/24/outline';


const DatasourceBinder: React.FC = () => {
    const { datasets, bindings, addBinding, updateBinding, removeBinding } = useAppStore();

    const getDatasetName = (sourceId: string) => {
        return datasets.find(d => d.id === sourceId)?.name ?? 'Unknown Dataset';
    }

    const handleAddBinding = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const datasetId = e.target.value;
        if (datasetId) {
            addBinding(datasetId);
            e.target.value = ""; // Reset dropdown
        }
    };

    return (
        <div className="flex flex-col h-full">
            <h3 className="font-bold mb-2 flex-none">Data Source Bindings</h3>
            <div className="flex-grow overflow-y-auto pr-2">
                {bindings.map(binding => (
                    <BindingRow
                        key={binding.id}
                        binding={binding}
                        getDatasetName={getDatasetName}
                        updateBinding={updateBinding}
                        removeBinding={removeBinding}
                    />
                ))}
            </div>
            <div className="flex-none mt-2">
                <select
                    className="select select-bordered w-full"
                    onChange={handleAddBinding}
                    value=""
                >
                    <option value="" disabled>+ Add a data source</option>
                    {datasets.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
};

interface BindingRowProps {
    binding: DataSourceBinding;
    getDatasetName: (sourceId: string) => string;
    updateBinding: (bindingId: string, updates: Partial<Omit<DataSourceBinding, 'id'>>) => void;
    removeBinding: (bindingId: string) => void;
}

const BindingRow: React.FC<BindingRowProps> = ({ binding, getDatasetName, updateBinding, removeBinding }) => {
    const dataset = useAppStore(state => state.datasets.find(d => d.id === binding.source_id));
    const isJsonl = dataset?.file_format === 'jsonl';

    return (
        <div className="p-2 rounded-box bg-base-200 mb-2">
            <div className="flex items-center justify-between">
                <span className="font-semibold">{getDatasetName(binding.source_id)}</span>
                <button className="btn btn-ghost btn-xs" onClick={() => removeBinding(binding.id)}>
                    <TrashIcon className="h-4 w-4" />
                </button>
            </div>
            <div className="form-control mt-2">
                <label className="label cursor-pointer">
                    <span className="label-text">Context Key</span>
                    <input
                        className="input input-bordered input-sm"
                        value={binding.context_key}
                        onChange={e => updateBinding(binding.id, { context_key: e.target.value })}
                    />
                </label>
            </div>
            <div className="form-control mt-2">
                <label className="label cursor-pointer">
                    <span className="label-text">Scope</span>
                    <select
                        className="select select-bordered select-sm"
                        value={binding.scope}
                        onChange={e => updateBinding(binding.id, { scope: e.target.value as 'record' | 'global' })}
                    >
                        <option value="record">Record (iterate)</option>
                        <option value="global">Global (fixed)</option>
                    </select>
                </label>
            </div>
            {binding.scope === 'global' && isJsonl && (
                 <div className="form-control mt-2">
                    <label className="label">
                        <span className="label-text">Row Index</span>
                         <input
                            type="number"
                            placeholder="Enter row index"
                            className="input input-bordered input-sm w-full"
                            value={binding.row ?? ''}
                            onChange={e => updateBinding(binding.id, { row: e.target.value ? parseInt(e.target.value, 10) : null })}
                            min="0"
                        />
                    </label>
                </div>
            )}
        </div>
    );
}

export default DatasourceBinder;