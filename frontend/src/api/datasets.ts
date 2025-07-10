import axios from 'axios';

const API_URL = '/api';

export interface DatasetMeta {
  id: string;
  name: string;
  num_records: number | null; // Optional, only available after getting the dataset
  file_format: 'json' | 'jsonl';
}

export const listDatasets = async (): Promise<DatasetMeta[]> => {
  const response = await axios.get<DatasetMeta[]>(`${API_URL}/datasets`);
  return response.data;
};

export const uploadDataset = async (file: File): Promise<DatasetMeta> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<DatasetMeta>(`${API_URL}/datasets`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getDatasetRecord = async (id: string, index: number): Promise<Record<string, unknown>> => {
  const response = await axios.get<Record<string, unknown>>(`${API_URL}/datasets/${id}/records/${index}`);
  return response.data;
};

export const getDatasetMeta = async (id: string): Promise<DatasetMeta> => {
  const response = await axios.get<DatasetMeta>(`${API_URL}/datasets/${id}`);
  return response.data;
};

export const deleteDataset = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/datasets/${id}`);
};