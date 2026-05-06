import api from "./axios";

export const previewWorkbookImport = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post("/imports/preview", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const importWorkbook = (file: File, activate = true, month?: string, year?: string) => {
  const formData = new FormData();
  formData.append("file", file);
  if (month) formData.append("month", month);
  if (year) formData.append("year", year);

  return api.post(`/imports/workbook?activate=${activate}`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const getImportBatches = () => api.get("/imports");

export const getImportStatus = () => api.get("/imports/status");

export const getImportDetail = (id: string) => api.get(`/imports/${id}`);

export const activateImportBatch = (id: string) =>
  api.post(`/imports/${id}/activate`);

export const deleteImportBatch = (id: string) =>
  api.delete(`/imports/${id}`);
