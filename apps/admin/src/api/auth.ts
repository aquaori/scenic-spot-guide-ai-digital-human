import { http } from "@/lib/http";

export interface CaptchaResponse {
  captchaEnabled?: boolean;
  img: string;
  uuid: string;
}

export interface LoginPayload {
  username: string;
  password: string;
  code: string;
  uuid: string;
}

export interface LoginResponse {
  code: number;
  msg: string;
  token: string;
}

export const authApi = {
  getCaptcha() {
    return http.getRaw<CaptchaResponse>("/captchaImage");
  },
  login(payload: LoginPayload) {
    return http.postRaw<LoginResponse>("/login", payload);
  },
  logout() {
    return http.postApi<null>("/logout");
  }
};
