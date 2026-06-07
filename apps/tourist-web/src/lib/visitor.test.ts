/// <reference types="node" />

import assert from "node:assert/strict";
import test from "node:test";
import {
  clearTouristAuth,
  clearVisitorId,
  getCurrentTouristIdentity,
  getTouristToken,
  getTouristUserInfo,
  getVisitorId,
  persistTouristAuth,
  TOURIST_TOKEN_STORAGE_KEY,
  TOURIST_USER_INFO_STORAGE_KEY,
  VISITOR_STORAGE_KEY
} from "./visitor.ts";

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
    },
    removeItem(key: string) {
      store.delete(key);
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

test("persistTouristAuth stores token and user info", () => {
  const storage = createStorage();

  persistTouristAuth(
    "token-123",
    {
      userId: 7,
      userName: "alice",
      nickName: "Alice"
    },
    storage
  );

  assert.equal(getTouristToken(storage), "token-123");
  assert.deepEqual(getTouristUserInfo(storage), {
    userId: 7,
    userName: "alice",
    nickName: "Alice"
  });
});

test("getCurrentTouristIdentity prefers registered tourist token", () => {
  const storage = createStorage("anonymous-visitor");
  storage.setItem(TOURIST_TOKEN_STORAGE_KEY, "jwt-token");
  storage.setItem(
    TOURIST_USER_INFO_STORAGE_KEY,
    JSON.stringify({
      userId: 12,
      userName: "alice"
    })
  );

  assert.deepEqual(getCurrentTouristIdentity({ storage }), {
    type: "registered",
    token: "jwt-token",
    userInfo: {
      userId: 12,
      userName: "alice"
    }
  });
});

test("clearVisitorId and clearTouristAuth clear persisted identity values", () => {
  const storage = createStorage("anonymous-visitor");
  storage.setItem(TOURIST_TOKEN_STORAGE_KEY, "jwt-token");
  storage.setItem(TOURIST_USER_INFO_STORAGE_KEY, JSON.stringify({ userName: "alice" }));

  clearVisitorId(storage);
  clearTouristAuth(storage);

  assert.equal(storage.getItem(VISITOR_STORAGE_KEY), null);
  assert.equal(storage.getItem(TOURIST_TOKEN_STORAGE_KEY), null);
  assert.equal(storage.getItem(TOURIST_USER_INFO_STORAGE_KEY), null);
});
