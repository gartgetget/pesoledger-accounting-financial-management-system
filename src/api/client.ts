const apiBaseUrl = "";
const TOKEN_KEY = "chaching_backend_token";

interface RequestOptions extends RequestInit {
  params?: Record<string, string>;
}

class ApiError extends Error {
  status: number;
  body: any;

  constructor(status: number, body: any) {
    super(body?.message || `API Error ${status}`);
    this.status = status;
    this.body = body;
  }
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem("chaching_backend_user");
}

async function apiRequest<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, body, ...rest } = options;
  const url = new URL(`${apiBaseUrl}${path}`, window.location.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(rest.headers as Record<string, string> || {}),
  };

  const token = getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url.toString(), {
    ...rest,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    clearToken();
    window.location.href = "/";
    throw new ApiError(401, { message: "Unauthorized" });
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new ApiError(response.status, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) =>
    apiRequest<T>(path, { params }),

  post: <T>(path: string, body?: any) =>
    apiRequest<T>(path, { method: "POST", body }),

  put: <T>(path: string, body?: any) =>
    apiRequest<T>(path, { method: "PUT", body }),

  delete: <T>(path: string) =>
    apiRequest<T>(path, { method: "DELETE" }),

  getToken,
  clearToken,
  getApiBaseUrl: () => apiBaseUrl,
};

export default api;
