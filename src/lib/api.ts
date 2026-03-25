export const apiUrl = (path: string) => {
  const url = `${import.meta.env.PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:3000"}${path}`;
  return url;
};
