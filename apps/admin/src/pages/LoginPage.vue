<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import UiButton from "@/components/ui/UiButton.vue";
import UiCard from "@/components/ui/UiCard.vue";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const errorMessage = ref("");

const form = reactive({
  username: "admin",
  password: "admin123",
  code: "1234"
});

const codeUrl = computed(() =>
  authStore.captchaImage ? `data:image/svg+xml;base64,${authStore.captchaImage}` : ""
);

const refreshCaptcha = async () => {
  await authStore.fetchCaptcha();
};

const handleSubmit = async () => {
  errorMessage.value = "";

  try {
    await authStore.login({
      username: form.username,
      password: form.password,
      code: form.code,
      uuid: authStore.captchaUuid
    });

    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    await router.replace(redirect);
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "登录失败，请检查账号信息后重试。";
    await refreshCaptcha();
  }
};

onMounted(async () => {
  await refreshCaptcha();
});
</script>

<template>
  <div
    class="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(180deg,#eff3f8_0%,#f8fafc_44%,#eef2f7_100%)] px-4 py-8"
  >
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute left-[-8%] top-[-10%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,rgba(15,23,42,0.12)_0%,rgba(15,23,42,0)_68%)]"></div>
      <div class="absolute bottom-[-14%] right-[-6%] h-[460px] w-[460px] rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.12)_0%,rgba(37,99,235,0)_70%)]"></div>
      <div class="absolute inset-x-0 top-[18%] h-px bg-[linear-gradient(90deg,transparent,rgba(15,23,42,0.08),transparent)]"></div>
    </div>

    <UiCard class="relative w-full max-w-[1200px] overflow-hidden rounded-[12px] border border-white/80 bg-white/90 shadow-[0_30px_90px_rgba(15,23,42,0.08)] backdrop-blur">
      <div class="grid min-h-[760px] lg:grid-cols-[1.08fr_0.92fr]">
        <section class="relative flex flex-col justify-between overflow-hidden bg-[#0f172a] px-8 py-8 text-white lg:px-12 lg:py-12">
          <div class="absolute inset-0 bg-[linear-gradient(160deg,rgba(37,99,235,0.22)_0%,rgba(15,23,42,0)_42%,rgba(248,250,252,0.04)_100%)]"></div>
          <div class="absolute left-10 top-10 h-24 w-24 rounded-[12px] border border-white/10 bg-white/5"></div>
          <div class="absolute bottom-8 right-8 h-36 w-36 rounded-full border border-white/8"></div>

          <div class="relative z-10">
            <p class="text-xs font-medium uppercase tracking-[0.34em] text-sky-200/70">Management Portal</p>
            <h1 class="mt-6 max-w-[520px] text-[42px] font-semibold leading-[1.1] tracking-[-0.03em]">
              景区智能服务运营平台
            </h1>
            <p class="mt-5 max-w-[520px] text-sm leading-8 text-slate-300">
              面向运营、内容与管理团队的一体化工作台。统一处理日常巡检、服务质量分析、知识内容维护与数字人配置，
              让核心工作保持稳定、有序、可追踪。
            </p>
          </div>

          <div class="relative z-10 flex gap-5">
            <div class="w-px shrink-0 bg-[linear-gradient(180deg,rgba(125,211,252,0.7)_0%,rgba(255,255,255,0.08)_100%)]"></div>
            <div class="space-y-5">
              <div>
                <p class="text-[11px] uppercase tracking-[0.24em] text-slate-400">Platform Highlights</p>
                <p class="mt-2 text-lg font-semibold text-white">围绕运营、内容与服务协同的一体化工作台</p>
              </div>

              <div class="space-y-4 text-sm leading-7 text-slate-300">
                <p>
                  <span class="mr-3 text-sky-200">01</span>
                  核心指标、日报与趋势变化在同一入口集中查看。
                </p>
                <p>
                  <span class="mr-3 text-sky-200">02</span>
                  问答、知识文档与服务内容统一维护与更新。
                </p>
                <p>
                  <span class="mr-3 text-sky-200">03</span>
                  围绕反馈、热点与满意度持续迭代服务体验。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section class="relative flex items-center bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-6 py-8 lg:px-12">
          <div class="mx-auto w-full max-w-[420px]">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">Welcome Back</p>
              <h2 class="mt-4 text-[34px] font-semibold tracking-[-0.03em] text-slate-950">登录到系统</h2>
              <p class="mt-3 text-sm leading-7 text-slate-500">
                请输入账号信息完成身份校验后进入系统。
              </p>
            </div>

            <form class="mt-10 space-y-6" @submit.prevent="handleSubmit">
              <label class="block space-y-2.5">
                <span class="text-sm font-medium text-slate-700">账号</span>
                <input
                  v-model="form.username"
                  class="w-full rounded-[12px] border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                  placeholder="请输入账号"
                />
              </label>

              <label class="block space-y-2.5">
                <span class="text-sm font-medium text-slate-700">密码</span>
                <input
                  v-model="form.password"
                  type="password"
                  class="w-full rounded-[12px] border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                  placeholder="请输入密码"
                />
              </label>

              <div class="grid gap-4 md:grid-cols-[1fr_172px]">
                <label class="block space-y-2.5">
                  <span class="text-sm font-medium text-slate-700">验证码</span>
                  <input
                    v-model="form.code"
                    class="w-full rounded-[12px] border border-slate-200 bg-slate-50/80 px-4 py-3.5 text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white"
                    placeholder="请输入验证码"
                  />
                </label>

                <button
                  type="button"
                  class="group flex min-h-[94px] items-center justify-center overflow-hidden rounded-[12px] border border-slate-200 bg-slate-50 transition hover:border-slate-300 hover:bg-white"
                  @click="refreshCaptcha"
                >
                  <img v-if="codeUrl" :src="codeUrl" alt="captcha" class="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                  <span v-else class="text-sm text-slate-400">刷新验证码</span>
                </button>
              </div>

              <div
                v-if="errorMessage"
                class="rounded-[12px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-600"
              >
                {{ errorMessage }}
              </div>

              <UiButton
                type="submit"
                class="h-13 w-full rounded-[12px] text-base font-semibold shadow-[0_16px_32px_rgba(15,23,42,0.12)]"
                :disabled="authStore.loading"
              >
                {{ authStore.loading ? "登录中..." : "登录" }}
              </UiButton>
            </form>

            <div class="mt-8 rounded-[12px] border border-slate-200/80 bg-white px-4 py-4 text-sm text-slate-500">
              <p class="font-medium text-slate-800">测试账号</p>
              <p class="mt-2 leading-7">
                当前测试环境可使用账号 `admin`、密码 `admin123` 登录。验证码默认填写 `1234`，如校验失败可刷新后重试。
              </p>
            </div>
          </div>
        </section>
      </div>
    </UiCard>
  </div>
</template>
