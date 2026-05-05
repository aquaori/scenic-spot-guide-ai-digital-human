import { adminEnv } from "@/config/env";
import { authStorage } from "@/lib/auth";
import type { ApiResponse, PaginatedResponse } from "@/types/admin";

type UnknownRecord = Record<string, unknown>;

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

const isRecord = (value: unknown): value is UnknownRecord => !!value && typeof value === "object" && !Array.isArray(value);

const getResponseMessage = (payload: UnknownRecord, fallback: string) =>
  typeof payload.msg === "string" && payload.msg.trim() ? payload.msg : fallback;

const getResponseCode = (payload: UnknownRecord) => (typeof payload.code === "number" ? payload.code : 200);

const normalizeApiResponse = <T>(payload: unknown): ApiResponse<T> => {
  if (isRecord(payload) && "data" in payload) {
    if (getResponseCode(payload) !== 200) {
      throw new Error(getResponseMessage(payload, "接口返回异常"));
    }

    return {
      code: getResponseCode(payload),
      msg: getResponseMessage(payload, "操作成功"),
      data: payload.data as T
    };
  }

  return {
    code: 200,
    msg: "操作成功",
    data: payload as T
  };
};

const normalizeListResponse = <T>(payload: unknown): PaginatedResponse<T> => {
  if (isRecord(payload) && getResponseCode(payload) !== 200) {
    throw new Error(getResponseMessage(payload, "列表接口返回异常"));
  }

  if (isRecord(payload) && Array.isArray(payload.rows)) {
    return {
      code: getResponseCode(payload),
      msg: getResponseMessage(payload, "查询成功"),
      rows: payload.rows as T[],
      total: typeof payload.total === "number" ? payload.total : payload.rows.length
    };
  }

  if (isRecord(payload) && isRecord(payload.data) && Array.isArray(payload.data.rows)) {
    return {
      code: getResponseCode(payload),
      msg: getResponseMessage(payload, "查询成功"),
      rows: payload.data.rows as T[],
      total:
        typeof payload.data.total === "number"
          ? payload.data.total
          : typeof payload.total === "number"
            ? payload.total
            : payload.data.rows.length
    };
  }

  if (isRecord(payload) && Array.isArray(payload.data)) {
    return {
      code: getResponseCode(payload),
      msg: getResponseMessage(payload, "查询成功"),
      rows: payload.data as T[],
      total: typeof payload.total === "number" ? payload.total : payload.data.length
    };
  }

  if (Array.isArray(payload)) {
    return {
      code: 200,
      msg: "查询成功",
      rows: payload as T[],
      total: payload.length
    };
  }

  console.error("[admin] Unexpected list response payload", payload);
  throw new Error("列表接口返回结构无法识别");
};

export const http = {
  getRaw<T>(path: string, query?: Record<string, string | number | undefined>) {
    return request<T>(path, { method: "GET" }, query);
  },
  async getApi<T>(path: string, query?: Record<string, string | number | undefined>) {
    const payload = await request<unknown>(path, { method: "GET" }, query);
    return normalizeApiResponse<T>(payload);
  },
  async getList<T>(path: string, query?: Record<string, string | number | undefined>) {
    const payload = await request<unknown>(path, { method: "GET" }, query);
    return normalizeListResponse<T>(payload);
  },
  async postApi<T>(path: string, body?: unknown, query?: Record<string, string | number | undefined>) {
    const payload = await request<unknown>(
      path,
      {
        method: "POST",
        body: body === undefined ? undefined : JSON.stringify(body)
      },
      query
    );
    return normalizeApiResponse<T>(payload);
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
  async putApi<T>(path: string, body?: unknown, query?: Record<string, string | number | undefined>) {
    const payload = await request<unknown>(
      path,
      {
        method: "PUT",
        body: body === undefined ? undefined : JSON.stringify(body)
      },
      query
    );
    return normalizeApiResponse<T>(payload);
  },
  async deleteApi<T>(path: string, query?: Record<string, string | number | undefined>) {
    const payload = await request<unknown>(path, { method: "DELETE" }, query);
    return normalizeApiResponse<T>(payload);
  }
};
