import type { MessageAttachment } from "../mocks/guide";

export type TouristStreamEvent =
  | { event: "metadata"; sessionId?: string; intent?: string; attachments?: MessageAttachment[] }
  | { event: "answer"; content: string }
  | { event: "answer_fragment"; content: string }
  | {
      event: "audio";
      seq?: number;
      chunk: string;
      mimeType?: string;
      filename?: string;
      text?: string;
      audioCostMs?: number;
      serverTime?: number;
    }
  | { event: "done"; totalCostMs?: number }
  | { event: "error"; message: string; interrupted?: boolean };

export interface TouristStreamHandlers {
  onEvent: (event: TouristStreamEvent) => void;
}

export interface TouristStreamSubscription {
  close: () => void;
}

type TouristEventSourceMessage = Event & {
  data?: string;
};

export interface TouristEventSourceLike {
  onerror: ((event: Event) => void) | null;
  onopen: ((event: Event) => void) | null;
  readyState?: number;
  addEventListener: (type: string, listener: (event: TouristEventSourceMessage) => void) => void;
  close: () => void;
}

type TouristEventSourceFactory = (url: string) => TouristEventSourceLike;

const EVENT_SOURCE_CLOSED = 2;

const decodeAttachmentRoutes = (attachment: Record<string, unknown>): MessageAttachment | null => {
  const routes = Array.isArray(attachment.routes) ? attachment.routes : Array.isArray(attachment.items) ? attachment.items : null;

  if (!routes) {
    return null;
  }

  return {
    id: String(attachment.id ?? attachment.title ?? attachment.name ?? "routes-attachment"),
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
  id: String(attachment.id ?? attachment.title ?? attachment.spotName ?? attachment.name ?? "spot-attachment"),
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

export const parseStreamEvent = (eventType: string, payload: Record<string, unknown>): TouristStreamEvent | null => {
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
      filename: typeof payload.filename === "string" ? payload.filename : undefined,
      text: typeof payload.text === "string" ? payload.text : undefined,
      audioCostMs: typeof payload.audioCostMs === "number" ? payload.audioCostMs : undefined,
      serverTime: typeof payload.serverTime === "number" ? payload.serverTime : undefined
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
      message: String(payload.message ?? payload.error ?? "对话流返回异常"),
      interrupted: payload.interrupted === true
    };
  }

  return null;
};

const parseJsonEventData = (eventType: string, rawData: string, handlers: TouristStreamHandlers) => {
  try {
    const event = parseStreamEvent(eventType, JSON.parse(rawData) as Record<string, unknown>);
    if (event) {
      handlers.onEvent(event);
      return event;
    }
  } catch (error) {
    console.error("[tourist] Failed to parse stream event", error, rawData);
    handlers.onEvent({
      event: "error",
      message: "对话流解析失败"
    });
  }

  return null;
};

export const subscribeTouristStream = (
  url: string,
  handlers: TouristStreamHandlers,
  createEventSource: TouristEventSourceFactory = (streamUrl) => new EventSource(streamUrl)
): TouristStreamSubscription => {
  const eventSource = createEventSource(url);
  let closed = false;

  const close = () => {
    if (closed) return;
    closed = true;
    eventSource.close();
  };

  const bindJsonEvent = (eventType: "metadata" | "answer_fragment" | "answer" | "audio" | "done" | "error") => {
    eventSource.addEventListener(eventType, (event) => {
      if (closed || typeof event.data !== "string") {
        return;
      }

      const parsedEvent = parseJsonEventData(eventType, event.data, handlers);
      if (parsedEvent?.event === "done" || parsedEvent?.event === "error") {
        close();
      }
    });
  };

  eventSource.onopen = () => undefined;
  eventSource.onerror = () => {
    if (closed || eventSource.readyState !== EVENT_SOURCE_CLOSED) {
      return;
    }

    handlers.onEvent({
      event: "error",
      message: "对话连接已断开，请稍后重试。"
    });
    close();
  };

  bindJsonEvent("metadata");
  bindJsonEvent("answer_fragment");
  bindJsonEvent("answer");
  bindJsonEvent("audio");
  bindJsonEvent("done");
  bindJsonEvent("error");

  return { close };
};
