import { adminEnv } from "@/config/env";
import { authStorage } from "@/lib/auth";
import type { ApiResponse, PaginatedResponse } from "@/types/admin";

const joinUrl = (baseUrl: string, path: string) => {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const nextPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${nextPath}`;
};

const buildUrl = (path: string, query?: Record<string, string | number | undefined>) => {
  const url = new URL(joinUrl(adminEnv.apiBaseUrl, path), window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const request = async <T>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, string | number | undefined>
): Promise<T> => {
  const token = authStorage.getToken();
  const response = await fetch(buildUrl(path, query), {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      authStorage.clearToken();
      const redirect = `${window.location.pathname}${window.location.search}`;
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`;
      }
    }

    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

export const http = {
  getRaw<T>(path: string, query?: Record<string, string | number | undefined>) {
    return request<T>(path, { method: "GET" }, query);
  },
  getApi<T>(path: string, query?: Record<string, string | number | undefined>) {
    return request<ApiResponse<T>>(path, { method: "GET" }, query);
  },
  getList<T>(path: string, query?: Record<string, string | number | undefined>) {
    return request<PaginatedResponse<T>>(path, { method: "GET" }, query);
  },
  postApi<T>(path: string, body?: unknown, query?: Record<string, string | number | undefined>) {
    return request<ApiResponse<T>>(
      path,
      {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
      },
      query
    );
  },
  postRaw<T>(path: string, body?: unknown, query?: Record<string, string | number | undefined>) {
    return request<T>(
      path,
      {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
      },
      query
    );
  },
  putApi<T>(path: string, body?: unknown, query?: Record<string, string | number | undefined>) {
    return request<ApiResponse<T>>(
      path,
      {
        method: "PUT",
        body: body === undefined ? undefined : JSON.stringify(body)
      },
      query
    );
  },
  deleteApi<T>(path: string, query?: Record<string, string | number | undefined>) {
    return request<ApiResponse<T>>(path, { method: "DELETE" }, query);
  }
};
