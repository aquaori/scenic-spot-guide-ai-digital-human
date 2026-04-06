const ADMIN_TOKEN_KEY = "zrb_admin_token";

export const authStorage = {
  getToken() {
    return window.localStorage.getItem(ADMIN_TOKEN_KEY);
  },
  setToken(token: string) {
    window.localStorage.setItem(ADMIN_TOKEN_KEY, token);
  },
  clearToken() {
    window.localStorage.removeItem(ADMIN_TOKEN_KEY);
  },
  isAuthenticated() {
    return Boolean(this.getToken());
  }
};
