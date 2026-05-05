const enableMsw = (import.meta.env.VITE_ENABLE_MSW as string | undefined) !== "false";

export const adminEnv = {
  apiBaseUrl: enableMsw ? "/api" : (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api",
  enableMsw,
  authToken: (import.meta.env.VITE_ADMIN_TOKEN as string | undefined) ?? "mock-admin-token"
} as const;
