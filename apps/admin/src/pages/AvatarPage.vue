<script setup lang="ts">
import { createDefaultAvatarConfig, type AvatarConfig } from "@zrb/avatar-runtime";
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import AdminAvatarStage from "@/components/avatar/AdminAvatarStage.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiCard from "@/components/ui/UiCard.vue";
import UiSkeleton from "@/components/ui/UiSkeleton.vue";
import { adminApi } from "@/api/admin";
import { useAdminStore } from "@/stores/admin";
import type { DigitalHuman } from "@/types/admin";

const router = useRouter();
const adminStore = useAdminStore();
const { selectedScenicId } = storeToRefs(adminStore);

const profiles = ref<DigitalHuman[]>([]);
const loading = ref(false);
const switchingId = ref<number | null>(null);
const activePreviewId = ref<number | null>(null);
const profileSkeletonItems = Array.from({ length: 3 }, (_, index) => index);

const activeProfile = computed(() => profiles.value.find((item) => item.id === activePreviewId.value) ?? profiles.value[0] ?? null);
const activeAvatarConfig = computed<AvatarConfig>(() => {
  const value = activeProfile.value?.appearanceConfig;
  if (!value) {
    return createDefaultAvatarConfig();
  }

  try {
    return createDefaultAvatarConfig(JSON.parse(value) as Partial<AvatarConfig>);
  } catch {
    return createDefaultAvatarConfig();
  }
});

const parseJson = (value: string) => {
  try {
    return JSON.parse(value) as Record<string, string | number | null>;
  } catch {
    return {};
  }
};

const loadProfiles = async (scenicId: number) => {
  loading.value = true;
  try {
    const response = await adminApi.listDigitalHumans(scenicId);
    profiles.value = response.rows;
    activePreviewId.value =
      activePreviewId.value && response.rows.some((item) => item.id === activePreviewId.value)
        ? activePreviewId.value
        : response.rows.find((item) => item.isDefault === 1)?.id ?? response.rows[0]?.id ?? null;
  } finally {
    loading.value = false;
  }
};

const setDefaultProfile = async (id: number) => {
  if (!selectedScenicId.value) return;
  switchingId.value = id;
  try {
    await adminApi.setDefaultDigitalHuman(id, selectedScenicId.value);
    await loadProfiles(selectedScenicId.value);
    activePreviewId.value = id;
  } finally {
    switchingId.value = null;
  }
};

const openConfig = (id?: number) => {
  router.push(id ? `/avatar/config/${id}` : "/avatar/config/new");
};

watch(
  selectedScenicId,
  async (scenicId) => {
    if (!scenicId) return;
    await loadProfiles(scenicId);
  },
  { immediate: true }
);
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-[8px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">Avatar Center</p>
          <h2 class="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">数字人模型展台</h2>
          <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            这里用于查看当前景区的模型效果、欢迎语和默认配置状态。进入二级页面后，再详细维护外观、语音和欢迎词等参数。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiBadge variant="info">{{ loading ? "读取中" : `${profiles.length} 个模型` }}</UiBadge>
          <UiButton size="sm" variant="outline" @click="openConfig()">新增模型</UiButton>
        </div>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[0.94fr_1.06fr]">
      <UiCard class="rounded-[8px] px-5 py-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Profile Shelf</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">模型列表</h3>
          </div>
          <UiBadge variant="secondary">{{ activeProfile?.humanName ?? "未选择" }}</UiBadge>
        </div>

        <Transition name="admin-fade" mode="out-in">
        <div v-if="loading" key="avatar-list-skeleton" class="mt-5 space-y-3">
          <article
            v-for="item in profileSkeletonItems"
            :key="`profile-skeleton-${item}`"
            class="rounded-[8px] border border-[color:var(--color-border)] bg-[#f8fafc] p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3">
                  <UiSkeleton width="160px" height="18px" />
                  <UiSkeleton width="72px" height="24px" />
                </div>
                <UiSkeleton width="100%" height="12px" class="mt-4" />
                <UiSkeleton width="78%" height="12px" class="mt-2" />
              </div>
              <div class="flex flex-wrap gap-2">
                <UiSkeleton width="78px" height="32px" />
                <UiSkeleton width="96px" height="32px" />
              </div>
            </div>
          </article>
        </div>
        <div v-else key="avatar-list-content" class="mt-5 space-y-3">
          <article
            v-for="profile in profiles"
            :key="profile.id"
            :class="[
              'rounded-[8px] border p-4 transition',
              activePreviewId === profile.id
                ? 'border-[#b7ccf7] bg-[linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)] shadow-[0_18px_34px_rgba(37,99,235,0.12)]'
                : 'border-[color:var(--color-border)] bg-[#f8fafc]'
            ]"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <button type="button" class="min-w-0 flex-1 cursor-pointer text-left" @click="activePreviewId = profile.id">
                <div class="flex items-center gap-3">
                  <h4 :class="activePreviewId === profile.id ? 'text-[#1d4ed8]' : 'text-slate-900'" class="text-base font-semibold">
                    {{ profile.humanName }}
                  </h4>
                  <UiBadge :variant="profile.isDefault === 1 ? 'success' : 'secondary'">
                    {{ profile.isDefault === 1 ? "默认模型" : "候选模型" }}
                  </UiBadge>
                </div>
                <p :class="activePreviewId === profile.id ? 'text-[#4a6693]' : 'text-slate-600'" class="mt-3 text-sm leading-7">
                  {{ profile.defaultGreeting }}
                </p>
              </button>

              <div class="flex flex-wrap gap-2">
                <UiButton
                  variant="outline"
                  size="sm"
                  :disabled="profile.isDefault === 1 || switchingId === profile.id"
                  @click="setDefaultProfile(profile.id)"
                >
                  {{ switchingId === profile.id ? "切换中..." : "设为默认" }}
                </UiButton>
                <UiButton size="sm" @click="openConfig(profile.id)">进入配置页</UiButton>
              </div>
            </div>
          </article>
        </div>
        </Transition>
      </UiCard>

      <UiCard class="rounded-[8px] px-5 py-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Preview Stage</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">模型效果预览</h3>
          </div>
          <UiBadge variant="secondary">{{ activeProfile?.isDefault === 1 ? "当前默认" : "预览中" }}</UiBadge>
        </div>

        <Transition name="admin-fade" mode="out-in">
        <div v-if="loading" key="avatar-preview-skeleton" class="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div class="rounded-[8px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,#fbfdff_0%,#f3f8ff_100%)] p-4">
            <UiSkeleton width="96px" height="12px" class="mb-3" />
            <UiSkeleton width="148px" height="22px" class="mb-4" />
            <UiSkeleton width="100%" height="12px" class="mb-2" />
            <UiSkeleton width="88%" height="12px" class="mb-4" />
            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-[8px] border border-[#e3ebf7] bg-white px-4 py-3">
                <UiSkeleton width="64px" height="12px" class="mb-3" />
                <UiSkeleton width="90%" height="16px" />
              </div>
              <div class="rounded-[8px] border border-[#e3ebf7] bg-white px-4 py-3">
                <UiSkeleton width="64px" height="12px" class="mb-3" />
                <UiSkeleton width="72px" height="16px" />
              </div>
            </div>
            <div class="mt-4 rounded-[8px] border border-[#e3ebf7] bg-white px-4 py-3">
              <UiSkeleton width="124px" height="12px" class="mb-3" />
              <UiSkeleton width="72%" height="12px" class="mb-2" />
              <UiSkeleton width="64%" height="12px" />
            </div>
          </div>

          <div class="rounded-[8px] border border-[#d8e4f6] bg-[linear-gradient(180deg,#fafcff_0%,#edf4ff_100%)] p-4">
            <div class="mx-auto max-w-[540px]">
              <div class="aspect-[8/14] overflow-hidden rounded-[8px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-4 shadow-[0_18px_40px_rgba(148,163,184,0.14)]">
                <UiSkeleton width="100%" height="100%" class="h-full" />
              </div>
            </div>
          </div>
        </div>
        <div v-else key="avatar-preview-content" class="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div class="rounded-[8px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,#fbfdff_0%,#f3f8ff_100%)] p-4">
            <p class="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Voice Presence</p>
            <h4 class="mt-2 text-lg font-semibold text-slate-950">{{ activeProfile?.humanName ?? "未命名模型" }}</h4>
            <p class="mt-3 text-sm leading-7 text-slate-600">
              {{ activeProfile?.defaultGreeting ?? "选择左侧模型后，这里会展示该角色对外呈现的欢迎语和整体服务气质。" }}
            </p>

            <div class="mt-5 grid gap-3 sm:grid-cols-2">
              <div class="rounded-[8px] border border-[#e3ebf7] bg-white px-4 py-3">
                <p class="text-xs uppercase tracking-[0.12em] text-slate-400">Avatar</p>
                <p class="mt-2 text-sm font-medium text-slate-900">{{ activeProfile?.avatarImage ?? "--" }}</p>
              </div>
              <div class="rounded-[8px] border border-[#e3ebf7] bg-white px-4 py-3">
                <p class="text-xs uppercase tracking-[0.12em] text-slate-400">Lip Sync</p>
                <p class="mt-2 text-sm font-medium text-slate-900">{{ activeProfile?.lipSync === 1 ? "开启" : "关闭" }}</p>
              </div>
            </div>

            <div class="mt-4 rounded-[8px] border border-[#e3ebf7] bg-white px-4 py-3">
              <p class="text-xs uppercase tracking-[0.12em] text-slate-400">Voice Config Snapshot</p>
              <div class="mt-3 space-y-2 text-sm text-slate-600">
                <p v-for="(value, key) in parseJson(activeProfile?.voiceConfig ?? '{}')" :key="String(key)">
                  <span class="text-slate-400">{{ key }}</span> {{ value }}
                </p>
              </div>
            </div>
          </div>

          <div class="rounded-[8px] border border-[#d8e4f6] bg-[linear-gradient(180deg,#fafcff_0%,#edf4ff_100%)] p-4">
            <div class="mx-auto max-w-[540px]">
              <div class="aspect-[8/14] overflow-hidden rounded-[8px] border border-white/80 bg-[linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] shadow-[0_18px_40px_rgba(148,163,184,0.14)]">
                <AdminAvatarStage :config="activeAvatarConfig" />
              </div>
            </div>
          </div>
        </div>
        </Transition>
      </UiCard>
    </section>
  </div>
</template>
