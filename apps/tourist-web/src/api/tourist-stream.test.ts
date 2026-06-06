/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import { parseStreamEvent, subscribeTouristStream } from "./tourist-stream.ts";

class FakeEventSource {
  onerror: ((event: Event) => void) | null = null;
  onopen: ((event: Event) => void) | null = null;
  readyState = 1;
  closed = false;
  private listeners = new Map<string, Array<(event: Event & { data?: string }) => void>>();

  addEventListener(type: string, listener: (event: Event & { data?: string }) => void) {
    const currentListeners = this.listeners.get(type) ?? [];
    currentListeners.push(listener);
    this.listeners.set(type, currentListeners);
  }

  close() {
    this.closed = true;
    this.readyState = 2;
  }

  emit(type: string, payload?: Record<string, unknown>) {
    const event = Object.assign(new Event(type), {
      data: payload ? JSON.stringify(payload) : undefined
    });

    (this.listeners.get(type) ?? []).forEach((listener) => listener(event));
  }

  emitClosedError() {
    this.readyState = 2;
    this.onerror?.(new Event("error"));
  }
}

test("parseStreamEvent maps metadata attachments into UI-friendly data", () => {
  const event = parseStreamEvent("metadata", {
    sessionId: "session-1",
    intent: "route_plan",
    attachments: [
      {
        type: "routes",
        title: "推荐路线",
        meta: "90 分钟",
        items: [
          {
            title: "看景优先线",
            summary: "先看景，再穿插讲解",
            duration: "90 分钟",
            tags: ["看景"]
          }
        ]
      }
    ]
  });

  assert.deepEqual(event, {
    event: "metadata",
    sessionId: "session-1",
    intent: "route_plan",
    attachments: [
      {
        id: "推荐路线",
        type: "routes",
        eyebrow: "Route Recommendation",
        title: "推荐路线",
        meta: "90 分钟",
        items: [
          {
            id: "route-0",
            title: "看景优先线",
            summary: "先看景，再穿插讲解",
            duration: "90 分钟",
            tags: ["看景"]
          }
        ]
      }
    ]
  });
});

test("subscribeTouristStream emits SSE events and closes after done", () => {
  const fakeEventSource = new FakeEventSource();
  const events: Array<string> = [];

  subscribeTouristStream(
    "http://localhost/tourist/stream/mock-conversation",
    {
      onEvent(event) {
        events.push(event.event);
      }
    },
    () => fakeEventSource
  );

  fakeEventSource.emit("metadata", { sessionId: "session-1", intent: "route_plan" });
  fakeEventSource.emit("answer_fragment", { content: "第一段" });
  fakeEventSource.emit("done", { totalCostMs: 123 });

  assert.deepEqual(events, ["metadata", "answer_fragment", "done"]);
  assert.equal(fakeEventSource.closed, true);
});

test("parseStreamEvent maps audio chunks", () => {
  const event = parseStreamEvent("audio", {
    seq: 1,
    chunk: "base64-audio",
    mimeType: "audio/mpeg",
    filename: "answer.mp3",
    text: "模拟语音文本",
    audioCostMs: 123,
    serverTime: 456
  });

  assert.deepEqual(event, {
    event: "audio",
    seq: 1,
    chunk: "base64-audio",
    mimeType: "audio/mpeg",
    filename: "answer.mp3",
    text: "模拟语音文本",
    audioCostMs: 123,
    serverTime: 456
  });
});

test("subscribeTouristStream surfaces a closed connection error", () => {
  const fakeEventSource = new FakeEventSource();
  const events: Array<{ event: string; message?: string }> = [];

  subscribeTouristStream(
    "http://localhost/tourist/stream/mock-conversation",
    {
      onEvent(event) {
        events.push(event);
      }
    },
    () => fakeEventSource
  );

  fakeEventSource.emitClosedError();

  assert.deepEqual(events, [
    {
      event: "error",
      message: "对话连接已断开，请稍后重试。"
    }
  ]);
  assert.equal(fakeEventSource.closed, true);
});
