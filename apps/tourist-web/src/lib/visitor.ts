export const VISITOR_STORAGE_KEY = "visitorId";

type VisitorStorage = Pick<Storage, "getItem" | "setItem">;
type VisitorCrypto = Pick<Crypto, "randomUUID">;

type VisitorIdOptions = {
  storage?: VisitorStorage | null;
  crypto?: VisitorCrypto | null;
};

const getDefaultStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
};

const getDefaultCrypto = () => {
  if (typeof globalThis.crypto?.randomUUID !== "function") {
    return null;
  }

  return globalThis.crypto;
};

export function getVisitorId(options: VisitorIdOptions = {}) {
  const storage = options.storage ?? getDefaultStorage();
  const currentVisitorId = storage?.getItem(VISITOR_STORAGE_KEY)?.trim();

  if (currentVisitorId) {
    return currentVisitorId;
  }

  const cryptoApi = options.crypto ?? getDefaultCrypto();
  if (!cryptoApi) {
    throw new Error("当前环境不支持 visitorId 生成");
  }

  const nextVisitorId = cryptoApi.randomUUID();
  storage?.setItem(VISITOR_STORAGE_KEY, nextVisitorId);
  return nextVisitorId;
}
