import axios from 'axios';
import type { DataSourceBinding } from '../stores/appStore';

const API_URL = '/api';

export interface LLMConfig {
    provider?: string;
    model?: string;
    temperature?: number;
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
    selected_record?: Record<string, unknown> | string | null;
}

export interface JobStatus {
    status: "running" | "completed" | "failed";
    progress: number;
    total: number;
    error: string | null;
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

export const getJobStatus = async (job_id: string): Promise<JobStatus> => {
    const response = await axios.get<JobStatus>(`${API_URL}/jobs/${job_id}/status`);
    return response.data;
};

export const downloadResults = async (job_id: string): Promise<void> => {
    const response = await axios.get(`${API_URL}/jobs/${job_id}/results`);
    return response.data;
};