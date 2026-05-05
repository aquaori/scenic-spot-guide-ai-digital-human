import type { MessageAttachment } from "../mocks/guide";
import { touristEnv } from "../config/env";
import { endMockTouristChat, getMockTouristBootstrap, openMockTouristStream } from "../mocks/api";

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
}

export interface TouristBootstrapData {
  scenicId: number;
  scenicName: string;
  digitalHuman: TouristDigitalHuman | null;
}

interface TouristBootstrapResponseData {
  id?: number;
  scenicId?: number;
  scenicName?: string;
  digitalHuman?: TouristDigitalHuman | null;
}

export interface TouristStreamPayload {
  message: string;
  visitorId: string | number;
  sessionId?: string;
  scenicId?: string | number;
}

export type TouristStreamEvent =
  | { event: "metadata"; sessionId?: string; intent?: string; attachments?: MessageAttachment[] }
  | { event: "answer"; content: string }
  | { event: "answer_fragment"; content: string }
  | { event: "audio"; seq?: number; chunk: string; mimeType?: string; filename?: string }
  | { event: "done"; totalCostMs?: number }
  | { event: "error"; message: string };

export interface TouristStreamHandlers {
  onEvent: (event: TouristStreamEvent) => void;
}

export interface TouristChatEndPayload {
  sessionId: string;
  visitorId: string | number;
  scenicId?: string | number;
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

const requestJson = async <T>(path: string, options: RequestInit = {}, query?: Record<string, QueryValue>) => {
  const response = await fetch(buildUrl(path, query), {
    ...options,
    headers: {
      ...(options.body === undefined ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {})
    }
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
    scenicName: data.scenicName ?? "",
    digitalHuman: data.digitalHuman ?? null
  };
};

const decodeAttachmentRoutes = (attachment: Record<string, unknown>): MessageAttachment | null => {
  const routes = Array.isArray(attachment.routes) ? attachment.routes : Array.isArray(attachment.items) ? attachment.items : null;

  if (!routes) {
    return null;
  }

  return {
    id: String(attachment.id ?? `routes-${Date.now()}`),
    type: "routes",
    eyebrow: String(attachment.eyebrow ?? attachment.label ?? "Route Recommendation"),
    title: String(attachment.title ?? attachment.name ?? "推荐路线"),
    meta: String(attachment.meta ?? attachment.duration ?? ""),
    items: routes
      .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
      .map((item, index) => ({
        id: String(item.id ?? `route-${index}`),
        title: String(item.title ?? item.routeName ?? item.name ?? "未命名路线"),
        summary: String(item.summary ?? item.description ?? item.routeDesc ?? ""),
        duration: String(item.duration ?? item.estimatedDuration ?? ""),
        tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag)) : []
      }))
  };
};

const decodeAttachmentSpot = (attachment: Record<string, unknown>): MessageAttachment => ({
  id: String(attachment.id ?? `spot-${Date.now()}`),
  type: "spot",
  eyebrow: String(attachment.eyebrow ?? attachment.label ?? "Spot Explanation"),
  title: String(attachment.title ?? attachment.spotName ?? attachment.name ?? "景点介绍"),
  description: String(attachment.description ?? attachment.summary ?? attachment.spotDesc ?? ""),
  metrics: Array.isArray(attachment.metrics)
    ? attachment.metrics
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item) => ({
          label: String(item.label ?? item.name ?? "信息"),
          value: String(item.value ?? item.content ?? "")
        }))
    : []
});

const decodeAttachments = (value: unknown): MessageAttachment[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map((attachment) => {
      if (!attachment || typeof attachment !== "object") return null;
      const record = attachment as Record<string, unknown>;
      const type = String(record.type ?? "");

      if (type === "routes" || Array.isArray(record.routes) || Array.isArray(record.items)) {
        return decodeAttachmentRoutes(record);
      }

      if (type === "spot" || "spotName" in record || "metrics" in record) {
        return decodeAttachmentSpot(record);
      }

      return null;
    })
    .filter((attachment): attachment is MessageAttachment => attachment !== null);
};

const parseStreamEvent = (eventType: string, payload: Record<string, unknown>): TouristStreamEvent | null => {

  if (eventType === "metadata") {
    return {
      event: "metadata",
      sessionId: typeof payload.sessionId === "string" ? payload.sessionId : undefined,
      intent: typeof payload.intent === "string" ? payload.intent : undefined,
      attachments: decodeAttachments(payload.attachments)
    };
  }

  if (eventType === "answer" || eventType === "answer_fragment") {
    return {
      event: eventType,
      content: String(payload.content ?? payload.delta ?? payload.text ?? "")
    };
  }

  if (eventType === "audio") {
    return {
      event: "audio",
      seq: typeof payload.seq === "number" ? payload.seq : undefined,
      chunk: String(payload.chunk ?? ""),
      mimeType: typeof payload.mimeType === "string" ? payload.mimeType : undefined,
      filename: typeof payload.filename === "string" ? payload.filename : undefined
    };
  }

  if (eventType === "done") {
    return {
      event: "done",
      totalCostMs: typeof payload.totalCostMs === "number" ? payload.totalCostMs : undefined
    };
  }

  if (eventType === "error") {
    return {
      event: "error",
      message: String(payload.message ?? payload.error ?? "对话流返回异常")
    };
  }

  return null;
};

const parseSseFrame = (frame: string) => {
  const lines = frame.split("\n").map((line) => line.trim()).filter(Boolean);
  const dataLines: string[] = [];
  let eventType = "";

  lines.forEach((line) => {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
      return;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  });

  if (!eventType || dataLines.length === 0) {
    return null;
  }

  return {
    eventType,
    raw: dataLines.join("\n")
  };
};

const consumeSseStream = async (response: Response, handlers: TouristStreamHandlers) => {
  const reader = response.body?.getReader();

  if (!reader) {
    throw new Error("SSE response body is empty");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";

    frames.forEach((frame) => {
      const parsedFrame = parseSseFrame(frame);

      if (!parsedFrame) return;

      try {
        const event = parseStreamEvent(
          parsedFrame.eventType,
          JSON.parse(parsedFrame.raw) as Record<string, unknown>
        );
        if (event) handlers.onEvent(event);
      } catch (error) {
        console.error("[tourist] Failed to parse stream event", error, parsedFrame.raw);
      }
    });
  }
};

export const touristApi = {
  async getBootstrap(payload: TouristBootstrapPayload = {}) {
    if (touristEnv.enableMock) {
      return getMockTouristBootstrap(payload);
    }

    const response = await requestJson<{ code: number; msg: string; data?: TouristBootstrapResponseData }>(
      "/tourist/bootstrap",
      { method: "GET" },
      payload.id === undefined ? undefined : { scenicId: payload.id }
    );

    return {
      ...response,
      data: normalizeBootstrapData(response.data, payload.id)
    };
  },
  async openStream(payload: TouristStreamPayload, handlers: TouristStreamHandlers) {
    if (touristEnv.enableMock) {
      await openMockTouristStream(payload, handlers);
      return;
    }

    try {
      const response = await fetch(buildUrl("/tourist/stream"), {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      await consumeSseStream(response, handlers);
    } catch (error) {
      throw error;
    }
  },
  async endChat(payload: TouristChatEndPayload) {
    if (touristEnv.enableMock) {
      await endMockTouristChat(payload);
      return;
    }

    try {
      await requestJson<{ code: number; msg: string; data: null }>(
        "/tourist/chat/end",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );
    } catch (error) {
      throw error;
    }
  },
  getTtsUrl(filename: string) {
    return buildUrl(`/tourist/tts/${filename}`);
  }
};
