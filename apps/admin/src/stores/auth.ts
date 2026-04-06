import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { authApi, type LoginPayload } from "@/api/auth";
import { authStorage } from "@/lib/auth";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(authStorage.getToken());
  const captchaUuid = ref("");
  const captchaImage = ref("");
  const captchaEnabled = ref(true);
  const loading = ref(false);

  const isAuthenticated = computed(() => Boolean(token.value));

  const syncToken = (nextToken: string | null) => {
    token.value = nextToken;
    if (nextToken) {
      authStorage.setToken(nextToken);
    } else {
      authStorage.clearToken();
    }
  };

  const fetchCaptcha = async () => {
    const response = await authApi.getCaptcha();
    captchaEnabled.value = response.captchaEnabled ?? true;
    captchaUuid.value = response.uuid;
    captchaImage.value = response.img;
  };

  const login = async (payload: LoginPayload) => {
    loading.value = true;
    try {
      const response = await authApi.login(payload);
      syncToken(response.token);
    } finally {
      loading.value = false;
    }
  };

  const logout = async () => {
    if (token.value) {
      try {
        await authApi.logout();
      } catch {
      }
    }

    syncToken(null);
  };

  return {
    token,
    captchaUuid,
    captchaImage,
    captchaEnabled,
    loading,
    isAuthenticated,
    fetchCaptcha,
    login,
    logout,
    syncToken
  };
});
