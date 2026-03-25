export const apiUrl = (path: string) => {
  const url = `${import.meta.env.PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000"}${path}`;
  return url;
};

export const n8nUrl = (path: string) =>
  `${import.meta.env.PUBLIC_N8N_URL?.replace(/\/$/, "") || "http://localhost:5678"}${path}`;
