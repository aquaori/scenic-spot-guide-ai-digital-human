const enableMock = import.meta.env.DEV && (import.meta.env.VITE_ENABLE_TOURIST_MOCK as string | undefined) !== "false";

export const touristEnv = {
  apiBaseUrl: enableMock ? "" : (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "",
  enableMock
} as const;
