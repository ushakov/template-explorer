import React, { useState } from 'react';
import { useAppStore } from '../stores/appStore';
import ReactJsonView from '@microlink/react-json-view';
import { toast } from 'react-hot-toast';

const ResultViewer: React.FC = () => {
  const { runResult, isRunningLlm, llmError, jobId, saveResults } = useAppStore();
  const [activeTab, setActiveTab] = useState('parsed');

  const handleSave = () => {
    const filename = prompt("Enter a filename for the results (without extension):");
    if (filename) {
        toast.promise(saveResults(filename), {
            loading: 'Saving results...',
            success: 'Results saved successfully!',
            error: 'Failed to save results.',
        });
    }
  };

  if (isRunningLlm) {
    return <div className="p-4"><span className="loading loading-spinner"></span></div>;
  }

  if (llmError) {
    return <div className="p-4 text-error">Error: {llmError}</div>;
  }

  if (!runResult) {
    return <div className="p-4 text-base-content/60">No result yet. Click "Run" to get a response.</div>;
  }

  const isJsonResult = typeof runResult.parsed_response === 'object' && runResult.parsed_response !== null;

  return (
    <div className="flex flex-col h-full">
      <div className="tabs tabs-bordered px-2 flex-none items-center">
        <a role="tab" className={`tab ${activeTab === 'parsed' ? 'tab-active' : ''}`} onClick={() => setActiveTab('parsed')}>Parsed</a>
        <a role="tab" className={`tab ${activeTab === 'raw' ? 'tab-active' : ''}`} onClick={() => setActiveTab('raw')}>Raw</a>
        <div className="flex-grow"></div>
        {jobId && (
            <button className="btn btn-ghost" onClick={handleSave}>Save Results</button>
        )}
      </div>
      <div className="flex-grow overflow-auto">
        {activeTab === 'raw' && (
          <pre className="p-4 whitespace-pre-wrap text-sm">{runResult.raw_response}</pre>
        )}
        {activeTab === 'parsed' && (
          <div className="p-4">
            {isJsonResult ? (
              <ReactJsonView src={runResult.parsed_response as object} theme="ocean" collapsed={false} displayDataTypes={false} name={false} />
            ) : (
              <pre className="whitespace-pre-wrap text-sm">{String(runResult.parsed_response)}</pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultViewer;