/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import { getVisitorId, VISITOR_STORAGE_KEY } from "./visitor.ts";

const createStorage = (initialValue?: string) => {
  const store = new Map<string, string>();
  if (initialValue) {
    store.set(VISITOR_STORAGE_KEY, initialValue);
  }

  return {
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    }
  };
};

test("getVisitorId reuses the stored visitor id", () => {
  const storage = createStorage("existing-visitor-id");
  let randomUUIDCalls = 0;

  const visitorId = getVisitorId({
    storage,
    crypto: {
      randomUUID() {
        randomUUIDCalls += 1;
        return "11111111-1111-4111-8111-111111111111";
      }
    }
  });

  assert.equal(visitorId, "existing-visitor-id");
  assert.equal(randomUUIDCalls, 0);
});

test("getVisitorId generates and persists a new visitor id", () => {
  const storage = createStorage();

  const visitorId = getVisitorId({
    storage,
    crypto: {
      randomUUID() {
        return "11111111-1111-4111-8111-111111111111";
      }
    }
  });

  assert.equal(visitorId, "11111111-1111-4111-8111-111111111111");
  assert.equal(storage.getItem(VISITOR_STORAGE_KEY), "11111111-1111-4111-8111-111111111111");
});
