import { create } from 'zustand';
import * as templateApi from '../api/templates';
import * as datasetApi from '../api/datasets';
import * as llmApi from '../api/llm';
import type { Template, TemplateMeta } from '../api/templates';
import type { DatasetMeta } from '../api/datasets';
import type { LLMConfig, RunResponse, ParserSpec } from '../api/llm';

export interface DataSourceBinding {
    id: string; // Unique ID for React keys
    source_id: string;
    context_key: string;
    scope: 'record' | 'global';
    row: number | null;
}

interface AppState {
  // Templates
  templates: TemplateMeta[];
  selectedTemplate: Template | null;
  selectedTemplateId: string | null;
  unsavedTemplate: string;

  // Datasets
  datasets: DatasetMeta[];
  selectedDataset: DatasetMeta | null;
  selectedDatasetId: string | null;
  selectedRecord: Record<string, unknown> | string | null;
  selectedRecordIndex: number | null;

  // Bindings
  bindings: DataSourceBinding[];

  // Runner State
  llmConfig: LLMConfig;
  parserSpec: ParserSpec;
  runResult: RunResponse | null;
  isRunningLlm: boolean;
  llmError: string | null;
  jobId: string | null;

  // Common
  isLoading: boolean;
  error: string | null;

  // Template Actions
  fetchTemplates: () => Promise<void>;
  selectTemplate: (id: string | null) => Promise<void>;
  createTemplate: (name: string, content: string) => Promise<TemplateMeta>;
  updateSelectedTemplate: (name?: string, content?: string) => Promise<void>;
  deleteSelectedTemplate: () => Promise<void>;
  setUnsavedTemplate: (content: string) => void;

  // Dataset Actions
  fetchDatasets: () => Promise<void>;
  selectDataset: (id: string | null) => void;
  fetchDatasetRecord: (datasetId: string, recordIndex: number) => Promise<void>;
  uploadDataset: (file: File) => Promise<void>;
  deleteDataset: (id: string) => Promise<void>;

  // Binding Actions
  addBinding: (datasetId: string) => void;
  updateBinding: (bindingId: string, updates: Partial<Omit<DataSourceBinding, 'id'>>) => void;
  removeBinding: (bindingId: string) => void;

  // Runner Actions
  updateLlmConfig: (updates: Partial<LLMConfig>) => void;
  updateParserSpec: (updates: Partial<ParserSpec>) => void;
  runLlm: () => Promise<void>;
  runBatchLlm: () => Promise<void>;
  saveResults: (filename: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  templates: [],
  selectedTemplate: null,
  selectedTemplateId: null,
  datasets: [],
  selectedDataset: null,
  selectedDatasetId: null,
  selectedRecord: null,
  selectedRecordIndex: null,
  bindings: [],
  isLoading: false,
  error: null,
  jobId: null,
  unsavedTemplate: '',

  // Runner State
  llmConfig: {
    provider: "openai",
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: 1024,
  },
  parserSpec: {
    type: "raw",
  },
  runResult: null,
  isRunningLlm: false,
  llmError: null,

  // --- Template Actions ---
  fetchTemplates: async () => {
    try {
      set({ isLoading: true, error: null });
      const templates = await templateApi.listTemplates();
      set({ templates, isLoading: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch templates';
      set({ error, isLoading: false });
    }
  },

  setUnsavedTemplate: (content: string) => set({ unsavedTemplate: content }),

  selectTemplate: async (id: string | null) => {
    if (!id) {
        set({ selectedTemplate: null, selectedTemplateId: null, unsavedTemplate: '' });
        return;
    }
    try {
      set({ isLoading: true, error: null, selectedTemplateId: id, unsavedTemplate: '' });
      const template = await templateApi.getTemplate(id);
      set({ selectedTemplate: template, isLoading: false, unsavedTemplate: template.content });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch template';
      set({ error, isLoading: false, selectedTemplate: null, unsavedTemplate: '' });
    }
  },

  createTemplate: async (name: string, content: string) => {
    const newTemplate = await templateApi.createTemplate({ name, content });
    await get().fetchTemplates();
    await get().selectTemplate(newTemplate.id);
    return newTemplate;
  },

  updateSelectedTemplate: async (name?: string, content?: string) => {
    const { selectedTemplateId } = get();
    if (!selectedTemplateId) return;

    try {
      const updatedTemplate = await templateApi.updateTemplate(selectedTemplateId, { name, content });
      set({ selectedTemplate: updatedTemplate, unsavedTemplate: updatedTemplate.content });
      await get().fetchTemplates();
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to update template';
        set({ error });
        throw err;
    }
  },

  deleteSelectedTemplate: async () => {
    const { selectedTemplateId } = get();
    if (!selectedTemplateId) return;

    try {
        await templateApi.deleteTemplate(selectedTemplateId);
        set({ selectedTemplate: null, selectedTemplateId: null });
        await get().fetchTemplates();
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to delete template';
        set({ error });
        throw err;
    }
  },

  // --- Dataset Actions ---
  fetchDatasets: async () => {
    try {
        set({ isLoading: true, error: null });
        const datasets = await datasetApi.listDatasets();
        set({ datasets, isLoading: false });
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to fetch datasets';
        set({ error, isLoading: false });
    }
  },

  selectDataset: async (id: string | null) => {
    if (!id) {
      set({ selectedDataset: null, selectedDatasetId: null, selectedRecord: null, selectedRecordIndex: null });
      return;
    }
    const dataset = await datasetApi.getDatasetMeta(id);
    set({ selectedDataset: dataset, selectedDatasetId: id, selectedRecord: null, selectedRecordIndex: null });
  },

  fetchDatasetRecord: async (datasetId: string, recordIndex: number) => {
    try {
        set({ isLoading: true, error: null });
        const record = await datasetApi.getDatasetRecord(datasetId, recordIndex);
        set({ selectedRecord: record, selectedRecordIndex: recordIndex, isLoading: false });
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to fetch record';
        set({ error, isLoading: false, selectedRecord: null, selectedRecordIndex: null });
    }
  },

  uploadDataset: async (file: File) => {
    try {
        set({ isLoading: true, error: null });
        await datasetApi.uploadDataset(file);
        await get().fetchDatasets();
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to upload dataset';
        set({ error, isLoading: false });
        throw err;
    }
  },

  deleteDataset: async (id: string) => {
    try {
        set({ isLoading: true, error: null });
        await datasetApi.deleteDataset(id);

        const { selectedDatasetId } = get();
        if (selectedDatasetId === id) {
            set({ selectedDataset: null, selectedDatasetId: null, selectedRecord: null, selectedRecordIndex: null });
        }
        await get().fetchDatasets();
    } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to delete dataset';
        set({ error, isLoading: false });
        throw err;
    }
  },

  // --- Binding Actions ---
  addBinding: (datasetId: string) => {
    const dataset = get().datasets.find(d => d.id === datasetId);
    if (!dataset) return;
    const scope = dataset.file_format === 'jsonl' ? 'record' : 'global';
    const newBinding: DataSourceBinding = {
        id: crypto.randomUUID(),
        source_id: datasetId,
        context_key: dataset.name.replace(/[^a-zA-Z0-9_]/g, '_'),
        scope: scope,
        row: null,
    };
    set(state => ({ bindings: [...state.bindings, newBinding] }));
  },

  updateBinding: (bindingId: string, updates: Partial<Omit<DataSourceBinding, 'id'>>) => {
    set(state => ({
        bindings: state.bindings.map(b =>
            b.id === bindingId ? { ...b, ...updates } : b
        ),
    }));
  },

  removeBinding: (bindingId: string) => {
    set(state => ({
        bindings: state.bindings.filter(b => b.id !== bindingId),
    }));
  },

  // --- Runner Actions ---
  updateLlmConfig: (updates: Partial<LLMConfig>) => {
    set(state => ({
      llmConfig: { ...state.llmConfig, ...updates }
    }));
  },

  updateParserSpec: (updates: Partial<ParserSpec>) => {
    set(state => ({
      parserSpec: { ...state.parserSpec, ...updates }
    }));
  },

  runLlm: async () => {
    const { unsavedTemplate, bindings, llmConfig, parserSpec } = get();
    if (!unsavedTemplate) return;
    set({ isRunningLlm: true, llmError: null, runResult: null, jobId: null });
    try {
      const result = await llmApi.runLlm({
        template_text: unsavedTemplate,
        datasource_bindings: bindings,
        llm: llmConfig,
        parser: parserSpec,
      });
      if (result.error) {
        set({ llmError: result.error, isRunningLlm: false });
        return;
      }
      set({ runResult: result, isRunningLlm: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ llmError: error, isRunningLlm: false });
    }
  },

  runBatchLlm: async () => {
    const { selectedTemplate, bindings, llmConfig, parserSpec } = get();
    if (!selectedTemplate) return;
    set({ isRunningLlm: true, llmError: null, runResult: null, jobId: null });
    try {
      const result = await llmApi.runBatchLlm({
        template_id: selectedTemplate.id,
        datasource_bindings: bindings,
        llm: llmConfig,
        parser: parserSpec,
      });
      set({ jobId: result.job_id, isRunningLlm: false });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'An unknown error occurred';
      set({ llmError: error, isRunningLlm: false });
    }
  },

  saveResults: async (filename: string) => {
    const { jobId } = get();
    if (!jobId) {
        throw new Error("No job to save.");
    }
    await llmApi.saveResults(jobId, filename);
  },
}));