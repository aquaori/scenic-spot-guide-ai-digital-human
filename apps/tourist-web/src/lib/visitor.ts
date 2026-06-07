export const VISITOR_STORAGE_KEY = "visitorId";
export const TOURIST_TOKEN_STORAGE_KEY = "touristToken";
export const TOURIST_USER_INFO_STORAGE_KEY = "touristUserInfo";

type VisitorStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type VisitorCrypto = Pick<Crypto, "randomUUID">;

type VisitorIdOptions = {
  storage?: VisitorStorage | null;
  crypto?: VisitorCrypto | null;
};

export interface TouristUserInfo {
  userId?: number;
  userName: string;
  nickName?: string;
  phonenumber?: string;
}

export type TouristIdentity =
  | {
      type: "registered";
      token: string;
      userInfo: TouristUserInfo | null;
    }
  | {
      type: "visitor";
      visitorId: string;
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

export function clearVisitorId(storage: VisitorStorage | null = getDefaultStorage()) {
  storage?.removeItem(VISITOR_STORAGE_KEY);
}

export function getTouristToken(storage: VisitorStorage | null = getDefaultStorage()) {
  return storage?.getItem(TOURIST_TOKEN_STORAGE_KEY)?.trim() ?? "";
}

export function getTouristUserInfo(storage: VisitorStorage | null = getDefaultStorage()) {
  const rawValue = storage?.getItem(TOURIST_USER_INFO_STORAGE_KEY)?.trim();
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as TouristUserInfo;
    if (!parsed || typeof parsed !== "object" || typeof parsed.userName !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function persistTouristAuth(
  token: string,
  userInfo: TouristUserInfo | null,
  storage: VisitorStorage | null = getDefaultStorage()
) {
  if (!storage) {
    return;
  }

  storage.setItem(TOURIST_TOKEN_STORAGE_KEY, token.trim());
  storage.setItem(
    TOURIST_USER_INFO_STORAGE_KEY,
    userInfo ? JSON.stringify(userInfo) : ""
  );
}

export function clearTouristAuth(storage: VisitorStorage | null = getDefaultStorage()) {
  if (!storage) {
    return;
  }

  storage.removeItem(TOURIST_TOKEN_STORAGE_KEY);
  storage.removeItem(TOURIST_USER_INFO_STORAGE_KEY);
}

export function getCurrentTouristIdentity(options: VisitorIdOptions = {}): TouristIdentity {
  const storage = options.storage ?? getDefaultStorage();
  const token = getTouristToken(storage);

  if (token) {
    return {
      type: "registered",
      token,
      userInfo: getTouristUserInfo(storage)
    };
  }

  return {
    type: "visitor",
    visitorId: getVisitorId(options)
  };
}
