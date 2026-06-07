import { touristEnv } from "../config/env";
import {
  getCurrentTouristIdentity,
  getTouristToken,
  getTouristUserInfo,
  getVisitorId,
  persistTouristAuth,
  type TouristUserInfo
} from "../lib/visitor";
import {
  subscribeTouristStream,
  type TouristStreamHandlers,
  type TouristStreamSubscription
} from "./tourist-stream";
import {
  endMockTouristChat,
  getMockConversationDetail,
  getMockConversationList,
  getMockTouristBootstrap,
  interruptMockTouristChat,
  loginMockTourist,
  registerMockTourist,
  submitMockTouristChat,
  subscribeMockTouristStream
} from "../mocks/api";

type QueryValue = string | number | undefined;

export interface TouristDigitalHuman {
  id: number;
  scenicId: number;
  humanName: string;
  defaultGreeting: string;
  lipSync: 0 | 1;
  isDefault: 0 | 1;
}

export interface TouristBootstrapPayload {
  id?: number;
  visitorId?: string | number;
}

export interface TouristBootstrapData {
  scenicId: number;
  scenicName: string;
  scenic: {
    scenicName: string;
  };
  digitalHuman: TouristDigitalHuman | null;
  onlineCount: number;
}

interface TouristBootstrapResponseData {
  id?: number;
  scenicId?: number;
  scenicName?: string;
  scenic?: {
    scenicName?: string;
  };
  digitalHuman?: TouristDigitalHuman | null;
  onlineCount?: number;
}

export interface TouristChatPayload {
  message: string;
  visitorId: string | number;
  sessionId?: string;
  scenicId?: string | number;
}

export interface TouristChatSubmitData {
  conversationId: string;
  sessionId: string;
}

export interface TouristChatEndPayload {
  sessionId: string;
  visitorId: string | number;
  scenicId?: string | number;
}

export interface TouristChatInterruptPayload {
  sessionId: string;
}

export interface TouristConversationListPayload {
  visitorId: string | number;
  scenicId?: string | number;
  page?: number;
  size?: number;
}

export interface TouristConversationSummary {
  sessionId: string;
  title: string;
  preview: string;
  updatedAt: string;
}

export interface TouristConversationListData {
  list: TouristConversationSummary[];
  total: number;
  page: number;
  size: number;
}

export interface TouristConversationTurn {
  role: "user" | "assistant";
  content: string;
  time?: string;
}

export interface TouristConversationDetail {
  sessionId: string;
  visitorId?: string | number;
  scenicId?: string | number;
  turns: TouristConversationTurn[];
}

export interface TouristRegisterPayload {
  visitorId: string;
  userName: string;
  password: string;
  phonenumber?: string;
}

export interface TouristLoginPayload {
  userName: string;
  password: string;
}

export interface TouristAuthData {
  token: string;
  userInfo: TouristUserInfo;
}

const joinUrl = (baseUrl: string, path: string) => {
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const nextPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${nextPath}`;
};

const buildUrl = (path: string, query?: Record<string, QueryValue>) => {
  const url = new URL(joinUrl(touristEnv.apiBaseUrl, path), window.location.origin);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const buildRequestHeaders = (headers?: HeadersInit, hasBody = false) => {
  const nextHeaders = new Headers(headers);

  if (hasBody && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }

  const token = getTouristToken();
  if (token) {
    if (!nextHeaders.has("Authorization")) {
      nextHeaders.set("Authorization", `Bearer ${token}`);
    }
    return nextHeaders;
  }

  const identity = getCurrentTouristIdentity();
  if (identity.type === "visitor" && !nextHeaders.has("X-Visitor-Id")) {
    nextHeaders.set("X-Visitor-Id", identity.visitorId);
  }

  return nextHeaders;
};

const requestJson = async <T>(path: string, options: RequestInit = {}, query?: Record<string, QueryValue>) => {
  const response = await fetch(buildUrl(path, query), {
    ...options,
    headers: buildRequestHeaders(options.headers, options.body !== undefined)
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
};

const normalizeBootstrapData = (
  data: TouristBootstrapResponseData | undefined,
  fallbackId?: number
): TouristBootstrapData => {
  if (!data) {
    throw new Error("Bootstrap response data is empty");
  }

  return {
    scenicId: data.scenicId ?? data.id ?? fallbackId ?? 0,
    scenicName: data.scenic?.scenicName ?? data.scenicName ?? "",
    scenic: {
      scenicName: data.scenic?.scenicName ?? data.scenicName ?? ""
    },
    digitalHuman: data.digitalHuman ?? null,
    onlineCount: typeof data.onlineCount === "number" ? data.onlineCount : 0
  };
};

const normalizeConversationSummary = (value: Record<string, unknown>): TouristConversationSummary | null => {
  const rawSessionId = value.sessionId ?? value.id;
  if (rawSessionId === undefined || rawSessionId === null) {
    return null;
  }

  const title = value.title ?? value.summary ?? value.firstMessage ?? value.lastQuestion ?? "未命名会话";
  const preview = value.preview ?? value.lastMessage ?? value.lastAnswer ?? value.content ?? "";
  const updatedAt = value.updatedAt ?? value.updateTime ?? value.lastTime ?? value.createTime ?? value.createdAt ?? "";

  return {
    sessionId: String(rawSessionId),
    title: String(title || "未命名会话"),
    preview: String(preview || ""),
    updatedAt: String(updatedAt || "")
  };
};

const normalizeConversationListData = (data: unknown): TouristConversationListData => {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const rawList = Array.isArray(record.list) ? record.list : [];
  const list = rawList
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map(normalizeConversationSummary)
    .filter((item): item is TouristConversationSummary => item !== null);

  return {
    list,
    total: typeof record.total === "number" ? record.total : list.length,
    page: typeof record.page === "number" ? record.page : 1,
    size: typeof record.size === "number" ? record.size : list.length
  };
};

const normalizeConversationDetail = (data: unknown, fallbackSessionId: string): TouristConversationDetail => {
  const record = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const rawTurns = Array.isArray(record.turns) ? record.turns : [];

  return {
    sessionId: String(record.sessionId ?? fallbackSessionId),
    visitorId: typeof record.visitorId === "string" || typeof record.visitorId === "number" ? record.visitorId : undefined,
    scenicId: typeof record.scenicId === "string" || typeof record.scenicId === "number" ? record.scenicId : undefined,
    turns: rawTurns
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((turn): TouristConversationTurn => {
        const role: TouristConversationTurn["role"] = turn.role === "user" ? "user" : "assistant";
        return {
          role,
          content: String(turn.content ?? turn.message ?? turn.text ?? ""),
          time: typeof turn.time === "string" ? turn.time : undefined
        };
      })
      .filter((turn) => turn.content.trim().length > 0)
  };
};

export const touristApi = {
  async getBootstrap(payload: TouristBootstrapPayload = {}) {
    if (touristEnv.enableMock) {
      return getMockTouristBootstrap(payload);
    }

    const nextVisitorId = payload.visitorId ?? getVisitorId();

    const response = await requestJson<{ code: number; msg: string; data?: TouristBootstrapResponseData }>(
      "/tourist/bootstrap",
      { method: "GET" },
      {
        scenicId: payload.id,
        visitorId: nextVisitorId
      }
    );

    return {
      ...response,
      data: normalizeBootstrapData(response.data, payload.id)
    };
  },
  async register(payload: TouristRegisterPayload): Promise<{ code: number; msg: string; data: TouristAuthData }> {
    if (touristEnv.enableMock) {
      const response = await registerMockTourist(payload);
      persistTouristAuth(response.data.token, response.data.userInfo);
      return response;
    }

    const response = await requestJson<{ code: number; msg: string; data?: TouristAuthData }>(
      "/tourist/register",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    if (response.code !== 200 || !response.data?.token || !response.data.userInfo?.userName) {
      throw new Error(response.msg || "游客注册失败");
    }

    persistTouristAuth(response.data.token, response.data.userInfo);

    return {
      ...response,
      data: response.data
    };
  },
  async login(payload: TouristLoginPayload): Promise<{ code: number; msg: string; data: TouristAuthData }> {
    if (touristEnv.enableMock) {
      const response = await loginMockTourist(payload);
      persistTouristAuth(response.data.token, response.data.userInfo);
      return response;
    }

    const response = await requestJson<{ code: number; msg: string; data?: TouristAuthData }>(
      "/tourist/login",
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );

    if (response.code !== 200 || !response.data?.token || !response.data.userInfo?.userName) {
      throw new Error(response.msg || "游客登录失败");
    }

    persistTouristAuth(response.data.token, response.data.userInfo);

    return {
      ...response,
      data: response.data
    };
  },
  async submitChat(payload: TouristChatPayload): Promise<{ code: number; msg: string; data: TouristChatSubmitData }> {
    if (touristEnv.enableMock) {
      return submitMockTouristChat(payload);
    }

    const response = await requestJson<{ code: number; msg: string; data?: TouristChatSubmitData }>(
      "/tourist/chat",
      {
        method: "POST",
        body: JSON.stringify({
          message: payload.message,
          visitorId: payload.visitorId,
          scenicId: payload.scenicId,
          sessionId: payload.sessionId
        })
      }
    );

    if (response.code !== 200) {
      throw new Error(response.msg || "聊天会话初始化失败");
    }

    if (!response.data?.conversationId || !response.data.sessionId) {
      throw new Error("聊天会话初始化失败");
    }

    return {
      ...response,
      data: response.data
    };
  },
  subscribeStream(
    conversationId: string,
    handlers: TouristStreamHandlers,
    sessionId?: string
  ): TouristStreamSubscription {
    if (touristEnv.enableMock) {
      return subscribeMockTouristStream(conversationId, handlers);
    }

    return subscribeTouristStream(
      buildUrl(`/tourist/stream/${encodeURIComponent(conversationId)}`, { sessionId }),
      handlers
    );
  },
  async interruptChat(payload: TouristChatInterruptPayload) {
    if (touristEnv.enableMock) {
      await interruptMockTouristChat(payload.sessionId);
      return;
    }

    await requestJson<{ code: number; msg: string; data: null }>(
      "/tourist/chat/interrupt",
      {
        method: "POST"
      },
      {
        sessionId: payload.sessionId
      }
    );
  },
  async endChat(payload: TouristChatEndPayload) {
    if (touristEnv.enableMock) {
      await endMockTouristChat(payload);
      return;
    }

    await requestJson<{ code: number; msg: string; data: null }>(
      "/tourist/chat/end",
      {
        method: "POST",
        body: JSON.stringify({
          sessionId: payload.sessionId,
          scenicId: payload.scenicId,
          visitorId: payload.visitorId
        })
      }
    );
  },
  async getConversationList(payload: TouristConversationListPayload) {
    if (touristEnv.enableMock) {
      return getMockConversationList(payload);
    }

    const response = await requestJson<{ code: number; msg: string; data?: unknown }>(
      "/tourist/conversation/list",
      { method: "GET" },
      {
        visitorId: payload.visitorId,
        scenicId: payload.scenicId,
        page: payload.page,
        size: payload.size
      }
    );

    return {
      ...response,
      data: normalizeConversationListData(response.data)
    };
  },
  async getConversationDetail(sessionId: string) {
    if (touristEnv.enableMock) {
      return getMockConversationDetail(sessionId);
    }

    const response = await requestJson<{ code: number; msg: string; data?: unknown }>(
      `/tourist/conversation/${encodeURIComponent(sessionId)}`,
      { method: "GET" }
    );

    return {
      ...response,
      data: normalizeConversationDetail(response.data, sessionId)
    };
  },
  getTtsUrl(filename: string) {
    return buildUrl(`/tourist/tts/${filename}`);
  }
};

export {
  getCurrentTouristIdentity,
  getTouristToken,
  getTouristUserInfo,
  getVisitorId
} from "../lib/visitor";
export type { TouristStreamEvent, TouristStreamHandlers, TouristStreamSubscription } from "./tourist-stream";
