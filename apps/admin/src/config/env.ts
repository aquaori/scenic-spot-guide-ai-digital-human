export const adminEnv = {
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "/api",
  enableMsw: (import.meta.env.VITE_ENABLE_MSW as string | undefined) !== "false",
  authToken: (import.meta.env.VITE_ADMIN_TOKEN as string | undefined) ?? "mock-admin-token"
} as const;
