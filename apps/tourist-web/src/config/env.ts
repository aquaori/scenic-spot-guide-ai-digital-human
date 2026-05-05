const enableMock = import.meta.env.DEV && (import.meta.env.VITE_ENABLE_TOURIST_MOCK as string | undefined) !== "false";

export const touristEnv = {
  apiBaseUrl: enableMock ? "/api" : (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api",
  enableMock
} as const;
