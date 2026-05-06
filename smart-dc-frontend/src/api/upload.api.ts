import api from './axios';

export interface UploadColumnMapping {
  cpu?: string;
  memory?: string;
  storage?: string;
  temperature?: string;
  serverName?: string;
  timestamp?: string;
}

export interface UploadParseOptions {
  headerRow?: number;
  mapping?: UploadColumnMapping;
}

const appendParseOptions = (
  formData: FormData,
  options?: UploadParseOptions,
) => {
  if (typeof options?.headerRow === 'number') {
    formData.append('headerRow', String(options.headerRow));
  }

  if (options?.mapping) {
    formData.append('mapping', JSON.stringify(options.mapping));
  }
};

export const previewUploadFile = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);

  return api.post('/upload/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadFile = (file: File, options?: UploadParseOptions) => {
  const formData = new FormData();
  formData.append('file', file);
  appendParseOptions(formData, options);

  return api.post('/upload/file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const getUploads = () => api.get('/upload');

export const getUploadById = (id: string) => api.get(`/upload/${id}`);

export const reparseUpload = (id: string, options?: UploadParseOptions) =>
  api.post(`/upload/${id}/reparse`, options || {});

export const deleteUpload = (id: string) => api.delete(`/upload/${id}`);

export const getUploadStatus = () => api.get('/upload/status/all');
