import axios from 'axios';

const API_URL = '/api'; // Using Vite's proxy

export interface TemplateMeta {
  id: string;
  name: string;
}

export interface Template extends TemplateMeta {
  content: string;
}

export interface TemplateCreate {
  name: string;
  content: string;
}

export interface TemplateUpdate {
  name?: string;
  content?: string;
}

export const listTemplates = async (): Promise<TemplateMeta[]> => {
  const response = await axios.get<TemplateMeta[]>(`${API_URL}/templates`);
  return response.data;
};

export const getTemplate = async (id: string): Promise<Template> => {
  const response = await axios.get<Template>(`${API_URL}/templates/${id}`);
  return response.data;
};

export const createTemplate = async (template: TemplateCreate): Promise<TemplateMeta> => {
  const response = await axios.post<TemplateMeta>(`${API_URL}/templates`, template);
  return response.data;
};

export const updateTemplate = async (id: string, template: TemplateUpdate): Promise<Template> => {
  const response = await axios.put<Template>(`${API_URL}/templates/${id}`, template);
  return response.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/templates/${id}`);
};