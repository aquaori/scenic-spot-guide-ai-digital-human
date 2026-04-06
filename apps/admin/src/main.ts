import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import { bootstrapMocks } from "@/mocks";
import "./styles.css";

const bootstrap = async () => {
  try {
    await bootstrapMocks();
  } catch (error) {
    console.error("[admin] Failed to bootstrap MSW", error);
  }

  const app = createApp(App);
  app.use(createPinia());
  app.use(router);
  app.mount("#app");
};

void bootstrap();
