import { adminEnv } from "@/config/env";

export const bootstrapMocks = async () => {
  if (!import.meta.env.DEV || !adminEnv.enableMsw) return;

  const { worker } = await import("@/mocks/browser");
  await worker.start({
    onUnhandledRequest: "bypass",
    serviceWorker: {
      url: "/mockServiceWorker.js"
    }
  });
};
