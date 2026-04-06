import { createRouter, createWebHistory } from "vue-router";
import { authStorage } from "@/lib/auth";
import AdminLayout from "@/layouts/AdminLayout.vue";
import DashboardPage from "@/pages/DashboardPage.vue";
import AvatarPage from "@/pages/AvatarPage.vue";
import AvatarConfigPage from "@/pages/AvatarConfigPage.vue";
import KnowledgePage from "@/pages/KnowledgePage.vue";
import ConversationPage from "@/pages/ConversationPage.vue";
import SettingsPage from "@/pages/SettingsPage.vue";
import LoginPage from "@/pages/LoginPage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/login",
      name: "login",
      component: LoginPage,
      meta: {
        public: true
      }
    },
    {
      path: "/",
      component: AdminLayout,
      children: [
        { path: "", name: "dashboard", component: DashboardPage },
        { path: "avatar", name: "avatar", component: AvatarPage },
        { path: "avatar/config/:id", name: "avatar-config", component: AvatarConfigPage },
        { path: "knowledge", name: "knowledge", component: KnowledgePage },
        { path: "conversation", name: "conversation", component: ConversationPage },
        { path: "settings", name: "settings", component: SettingsPage }
      ]
    }
  ]
});

router.beforeEach((to) => {
  const isLoggedIn = authStorage.isAuthenticated();

  if (to.meta.public) {
    if (isLoggedIn && to.path === "/login") {
      return "/";
    }

    return true;
  }

  if (!isLoggedIn) {
    return {
      path: "/login",
      query: {
        redirect: to.fullPath
      }
    };
  }

  return true;
});

export default router;
