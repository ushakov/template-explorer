import React from 'react';
import { useAppStore } from '../stores/appStore';
import ReactJsonView from '@microlink/react-json-view';


const DatasetInspector: React.FC = () => {
    const { selectedDataset, selectedRecord, selectedRecordIndex, fetchDatasetRecord, isLoading } = useAppStore();

    if (!selectedDataset) {
        return null;
    }

    const handleRecordIndexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const index = parseInt(e.target.value, 10);
        if (!isNaN(index)) {
            fetchDatasetRecord(selectedDataset.id, index);
        }
    };

    const jsonView = (data: Record<string, unknown> | string) => {
        if (typeof data === 'string') {
            return <pre className="text-base-content/60">{data}</pre>;
        }
        return <ReactJsonView src={data} theme="ocean" collapsed={false} displayDataTypes={false} name={false} />;
    };

    return (
        <>
            <h3 className="font-bold mb-2 flex-1">Inspector: {selectedDataset.name}</h3>
            <div className="flex-grow overflow-auto font-mono text-sm bg-base-200 rounded-box p-2">
                {isLoading && <span className="loading loading-spinner loading-sm"></span>}
                {!isLoading && <input type="number" min="0" max={(selectedDataset.num_records ?? 1) - 1} className="input input-bordered input-sm w-full" value={selectedRecordIndex ?? ''} onChange={handleRecordIndexChange} />}
                {!isLoading && !selectedRecord && (
                    <div className="text-base-content/60">No record selected or an error occurred.</div>
                )}
                {!isLoading && selectedRecord && (
                    jsonView(selectedRecord)
                )}
                {!isLoading && !selectedRecord && (
                    <div className="text-base-content/60">No record selected or an error occurred.</div>
                )}
            </div>
        </>
    );
};

export default DatasetInspector;





