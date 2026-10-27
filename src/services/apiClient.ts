const API_BASE = (import.meta as any).env?.VITE_API_URL || '';
const API_KEY = (import.meta as any).env?.VITE_API_KEY || 'sagas_erp_sec_9f8a3c2b1e4d7f6a5b8c9d0e1f2a3b4c';

export interface ApiResponse<T = any> {
  success: boolean;
  count?: number;
  data: T;
  message?: string;
  error?: string;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (API_KEY) {
    headers.set('X-ERP-API-KEY', API_KEY);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new ApiError(response.status, 'Endpoint JSON indisponível no modo preview local');
  }

  const body = await response.json();

  if (!response.ok) {
    const errorMsg =
      body?.message ||
      body?.error ||
      `Falha na requisição: ${response.status} ${response.statusText}`;
    throw new ApiError(response.status, errorMsg, body);
  }

  return body as T;
}

export const apiClient = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),
  put: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
  API_BASE,
};

export default apiClient;
