import axios from 'axios';
import type { DataSourceBinding } from '../stores/appStore';

const API_URL = '/api';

export interface LLMConfig {
    provider?: string;
    model?: string;
    temperature?: number;
    max_tokens?: number;
}

export interface ParserSpec {
    type?: 'raw' | 'structured' | 'python';
    pydantic_model?: string;
    python_code?: string;
}

export interface RunRequest {
    template_id?: string | null;
    template_text?: string | null;
    datasource_bindings: DataSourceBinding[];
    parser?: ParserSpec;
    llm?: LLMConfig;
}

export interface BatchRunResponse {
    job_id: string;
}

export interface RunResponse {
    raw_response: string;
    parsed_response?: string | Record<string, unknown> | null;
    error?: string | null;
}

export const runLlm = async (request: RunRequest): Promise<RunResponse> => {
    const response = await axios.post<RunResponse>(`${API_URL}/llm/run`, request);
    return response.data;
};

export const runBatchLlm = async (request: RunRequest): Promise<BatchRunResponse> => {
    const response = await axios.post<BatchRunResponse>(`${API_URL}/llm/batch`, request);
    return response.data;
};

export const saveResults = async (job_id: string, filename: string): Promise<void> => {
    await axios.post(`${API_URL}/jobs/save`, { job_id, filename });
};