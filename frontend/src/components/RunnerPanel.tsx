import React from 'react';
import { useAppStore } from '../stores/appStore';
import { PlayIcon } from '@heroicons/react/24/solid';
import Editor from '@monaco-editor/react';

const LLM_PROVIDERS = [
  { label: 'OpenAI', value: 'openai' },
  { label: 'Anthropic', value: 'anthropic' },
  // { label: 'Google', value: 'google' },
]

const LLM_MODELS = {
  openai: [
    { label: 'o4-mini', value: 'o4-mini' },
    { label: 'gpt-4.1', value: 'gpt-4.1' },
    { label: 'gpt-4.1-mini', value: 'gpt-4.1-mini' },
    { label: 'gpt-4.1-nano', value: 'gpt-4.1-nano' },
    { label: 'o3', value: 'o3' },
  ],
  anthropic: [
    { label: 'claude-sonnet-4', value: 'claude-sonnet-4-20250514' },
    { label: 'claude-3-7-sonnet', value: 'claude-3-7-sonnet-latest' },
    { label: 'claude-3-5-haiku', value: 'claude-3-5-haiku-latest' },
    { label: 'claude-opus-4', value: 'claude-opus-4-20250514' },
  ],
  // google: [
  //   { label: 'gemini-2.5-flash', value: 'gemini-2.5-flash' },
  //   { label: 'gemini-2.5-pro', value: 'gemini-2.5-pro' },
  //   { label: 'gemini-2.0-flash', value: 'gemini-2.0-flash' },
  // ],
}

const RunnerPanel: React.FC = () => {
  const { llmConfig, updateLlmConfig, parserSpec, updateParserSpec, runLlm, runBatchLlm, isRunningLlm, llmError } = useAppStore();

  const handleRunSingle = () => {
    runLlm();
  };

  const handleRunBatch = () => {
    runBatchLlm();
  };

  return (
    <div className="flex-grow p-4 rounded-box flex flex-col gap-4">
      <h3 className="font-bold text-lg">Runner Configuration</h3>

      <div className="form-control">
        <label className="label mx-2">
          <span className="label-text">Provider</span>
        </label>
        <select className="select select-bordered mx-2 w-full" value={llmConfig.provider} onChange={(e) => updateLlmConfig({ provider: e.target.value as any, model: LLM_MODELS[e.target.value as keyof typeof LLM_MODELS][0].value })}>
          {LLM_PROVIDERS.map((provider) => (
            <option key={provider.value} value={provider.value}>{provider.label}</option>
          ))}
        </select>
      </div>

      <div className="form-control">
        <label className="label mx-2">
          <span className="label-text">Model</span>
        </label>
        <select className="select select-bordered mx-2 w-full" value={llmConfig.model} onChange={(e) => updateLlmConfig({ model: e.target.value as any })}>
          {LLM_MODELS[llmConfig.provider as keyof typeof LLM_MODELS].map((model) => (
            <option key={model.value} value={model.value}>{model.label}</option>
          ))}
        </select>
      </div>

      <div className="form-control flex flex-row items-center">
        <label className="label mx-2">
          <span className="label-text">Temperature</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          className="range range-primary mx-2 "
          value={llmConfig.temperature}
          onChange={(e) => updateLlmConfig({ temperature: parseFloat(e.target.value) })}
        />
        {llmConfig.temperature}
      </div>

      <div className="form-control">
        <label className="label mx-2"><span className="label-text">Parser</span></label>
        <select
          className="select select-bordered mx-2 w-full"
          value={parserSpec.type}
          onChange={(e) => updateParserSpec({ type: e.target.value as any })}
        >
          <option value="raw">Raw Text</option>
          <option value="structured">Structured (Pydantic)</option>
          <option value="python">Custom Python</option>
        </select>
      </div>

      {parserSpec.type === 'structured' && (
        <div className="form-control flex flex-col gap-2">
          <label className="label"><span className="label-text">Pydantic Model: A single pydantic class</span></label>
          <Editor
            theme="vs-dark"
            language="python"
            value={parserSpec.pydantic_model || ''}
            onChange={(value) => updateParserSpec({ pydantic_model: value })}
            options={{ minimap: { enabled: false }}}
            className='min-h-100'
          />
        </div>
      )}

      {parserSpec.type === 'python' && (
        <div className="form-control flex flex-col gap-2">
          <label className="label"><span className="label-text">Python Function: <code>parse(str) -&gt; Any</code> function</span></label>
          <Editor
            theme="vs-dark"
            language="python"
            value={parserSpec.python_code || ''}
            onChange={(value) => updateParserSpec({ python_code: value })}
            options={{ minimap: { enabled: false }}}
            className='min-h-100'
          />
        </div>
      )}

      {llmError && (
        <div role="alert" className="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>Error: {llmError}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          className="btn btn-primary"
          onClick={handleRunSingle}
          disabled={isRunningLlm}
        >
          {isRunningLlm ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <PlayIcon className="h-5 w-5" />
          )}
          Run Single
        </button>
        <button
          className="btn btn-secondary"
          onClick={handleRunBatch}
          disabled={isRunningLlm}
        >
          {isRunningLlm ? (
            <span className="loading loading-spinner"></span>
          ) : (
            <PlayIcon className="h-5 w-5" />
          )}
          Run Batch
        </button>
      </div>
    </div>
  );
};

export default RunnerPanel;