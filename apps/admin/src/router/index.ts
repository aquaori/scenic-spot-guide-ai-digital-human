import { createRouter, createWebHistory } from "vue-router";
import AdminLayout from "@/layouts/AdminLayout.vue";
import DashboardPage from "@/pages/DashboardPage.vue";
import AvatarPage from "@/pages/AvatarPage.vue";
import KnowledgePage from "@/pages/KnowledgePage.vue";
import ConversationPage from "@/pages/ConversationPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AdminLayout,
      children: [
        { path: "", name: "dashboard", component: DashboardPage },
        { path: "avatar", name: "avatar", component: AvatarPage },
        { path: "knowledge", name: "knowledge", component: KnowledgePage },
        { path: "conversation", name: "conversation", component: ConversationPage },
        { path: "settings", name: "settings", component: SettingsPage }
      ]
    }
  ]
});

export default router;
