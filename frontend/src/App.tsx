import { useEffect, useState } from 'react';
import { useAppStore } from './stores/appStore';
import DatasetView from './components/DatasetView';
import TemplateEditor from './components/TemplateEditor';
import PromptPreview from './components/PromptPreview';
import ResultViewer from './components/ResultViewer';
import { Toaster } from 'react-hot-toast';
import DatasourceBinder from './components/DatasourceBinder';
import TemplateView from './components/TemplateView';
import DatasetInspector from './components/DatasetInspector';
import RunnerPanel from './components/RunnerPanel';

function App() {
  const [activeLeftTab, setActiveLeftTab] = useState('dataset');
  const [activeLowerTab, setActiveLowerTab] = useState('preview');
  const { selectedTemplateId, runResult } = useAppStore();

  useEffect(() => {
    if (runResult) {
      setActiveLowerTab('response');
    }
  }, [runResult]);

  return (
    <main className="flex h-screen gap-4 p-4">
      <Toaster position="bottom-right" />
      {/* Left Panel: Datasets & Inspector */}
      <div className="flex w-1/5 flex-col gap-4">
        <div className="flex-grow flex flex-col bg-base-100 rounded-box shadow-lg overflow-hidden">
          <div role="tablist" className="tabs tabs-bordered px-2 flex-none">
            <a role="tab" className={`tab ${activeLeftTab === 'dataset' ? 'tab-active' : ''}`} onClick={() => setActiveLeftTab('dataset')}>Datasets</a>
            <a role="tab" className={`tab ${activeLeftTab === 'templates' ? 'tab-active' : ''}`} onClick={() => setActiveLeftTab('templates')}>Templates</a>
          </div>
          <div className={`flex-1 overflow-auto bg-base-200 ${activeLeftTab === 'dataset' ? '' : 'hidden'}`}>
            <DatasetView />
            <DatasetInspector />
          </div>
          <div className={`flex-1 overflow-auto bg-base-200 ${activeLeftTab === 'templates' ? '' : 'hidden'}`}>
            <TemplateView />
          </div>
        </div>
      </div>

      {/* Right Panel: Editor & Output */}
      <div className="flex-grow flex flex-col gap-4 w-4/5 h-full">
        <div className="flex flex-row gap-4 overflow-hidden h-1/2">
            <div className="w-3/4 bg-base-100 rounded-box shadow-lg flex flex-col">
                <TemplateEditor />
            </div>
            <div className="w-1/4 bg-base-100 rounded-box shadow-lg flex flex-col overflow-scroll">
                {selectedTemplateId && (
                    <div className="bg-base-100 rounded-box shadow-lg p-4 flex flex-col my-4">
                        <DatasourceBinder />
                    </div>
                )}
                <RunnerPanel />
            </div>
        </div>
        <div className="flex flex-col bg-base-100 rounded-box shadow-lg overflow-hidden h-1/2">
          <div role="tablist" className="tabs tabs-bordered px-2 flex-none">
            <a role="tab" className={`tab ${activeLowerTab === 'preview' ? 'tab-active' : ''}`} onClick={() => setActiveLowerTab('preview')}>Preview</a>
            <a role="tab" className={`tab ${activeLowerTab === 'response' ? 'tab-active' : ''}`} onClick={() => setActiveLowerTab('response')}>Response</a>
          </div>
          <div className={`flex-1 overflow-auto bg-base-200 ${activeLowerTab === 'preview' ? '' : 'hidden'}`}>
            <PromptPreview />
          </div>
          <div className={`flex-1 overflow-auto bg-base-200 ${activeLowerTab === 'response' ? '' : 'hidden'}`}>
            <ResultViewer />
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
