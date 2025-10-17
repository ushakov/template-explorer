import React, { useEffect, useState } from 'react';
import { useAppStore } from '../stores/appStore';
import ReactJsonView from '@microlink/react-json-view';
import { toast } from 'react-hot-toast';

const BatchResult: React.FC = () => {
  const { jobId, fetchJobStatus, jobStatus, saveResults, downloadResults } = useAppStore();

  useEffect(() => {
    if (jobId) {
      fetchJobStatus(jobId);
    }
  }, [jobId]);

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

  const handleDownload = () => {
    toast.promise(downloadResults(jobId!), {
        loading: 'Downloading results...',
        success: 'Results downloaded successfully!',
        error: 'Failed to download results.',
    });
  };

  if (!jobId) {
    return <div className="p-4">No job ID. Click "Run" to start a job.</div>;
  }

  if (!jobStatus || jobStatus.status === 'running') {
    return <div className="p-4">
      <span className="loading loading-spinner"></span>
      Job running{jobStatus && ` ${jobStatus.progress}/${jobStatus.total} records`}...
      <button className="btn btn-ghost" onClick={() => fetchJobStatus(jobId)}>Fetch Status</button>
    </div>;
  }

  if (jobStatus.status === 'failed') {
    return <div className="p-4 text-error">Error: {jobStatus.error}</div>;
  }

  return (
    <div className="p-4">
      <button className="btn btn-ghost" onClick={handleSave}>Save Results</button>
      <button className="btn btn-ghost" onClick={handleDownload}>Download Results</button>
    </div>
  );
};

const ResultViewer: React.FC = () => {
  const { runResult, isRunningLlm, llmError, jobId } = useAppStore();
  const [activeTab, setActiveTab] = useState('parsed');

  if (isRunningLlm) {
    return <div className="p-4"><span className="loading loading-spinner"></span></div>;
  }

  if (llmError) {
    return <div className="p-4 text-error">Error: {llmError}</div>;
  }

  if (jobId) {
    return <BatchResult />;
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