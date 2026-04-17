<script setup lang="ts">
import { createDefaultAvatarConfig } from "@zrb/avatar-runtime";
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRoute, useRouter } from "vue-router";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiCard from "@/components/ui/UiCard.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import { adminApi } from "@/api/admin";
import { useAdminStore } from "@/stores/admin";

const route = useRoute();
const router = useRouter();
const adminStore = useAdminStore();
const { selectedScenicId } = storeToRefs(adminStore);

type DigitalHumanForm = {
  id: number | null;
  scenicId: number;
  humanName: string;
  appearanceConfig: string;
  voiceConfig: string;
  lipSync: 0 | 1;
  defaultGreeting: string;
  avatarImage: string;
  isDefault: 0 | 1;
};

const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);

const createAppearanceConfigString = () => JSON.stringify(createDefaultAvatarConfig(), null, 2);

const profileForm = reactive<DigitalHumanForm>({
  id: null,
  scenicId: 0,
  humanName: "",
  appearanceConfig: createAppearanceConfigString(),
  voiceConfig: JSON.stringify({ voiceId: "xiaomei", speed: 1, pitch: 1, volume: 1, enableLipSync: true }, null, 2),
  lipSync: 1,
  defaultGreeting: "",
  avatarImage: "",
  isDefault: 0
});

const isCreating = computed(() => route.params.id === "new");
const lipSyncOptions = [
  { label: "开启", value: 1 },
  { label: "关闭", value: 0 }
] as const;
const roleOptions = [
  { label: "候选模型", value: 0 },
  { label: "默认模型", value: 1 }
] as const;

const fillProfileForm = (profile?: Partial<DigitalHumanForm> | null, scenicId = selectedScenicId.value ?? 0) => {
  Object.assign(profileForm, {
    id: profile?.id ?? null,
    scenicId,
    humanName: profile?.humanName ?? "",
    appearanceConfig: profile?.appearanceConfig ?? createAppearanceConfigString(),
    voiceConfig: profile?.voiceConfig ?? JSON.stringify({ voiceId: "xiaomei", speed: 1, pitch: 1, volume: 1, enableLipSync: true }, null, 2),
    lipSync: profile?.lipSync ?? 1,
    defaultGreeting: profile?.defaultGreeting ?? "",
    avatarImage: profile?.avatarImage ?? "",
    isDefault: profile?.isDefault ?? 0
  });
};

const loadProfile = async () => {
  if (!selectedScenicId.value) return;
  if (isCreating.value) {
    fillProfileForm(null, selectedScenicId.value);
    return;
  }

  loading.value = true;
  try {
    const detail = await adminApi.getDigitalHumanDetail(Number(route.params.id));
    fillProfileForm(detail.data, selectedScenicId.value);
  } finally {
    loading.value = false;
  }
};

const saveProfile = async () => {
  if (!selectedScenicId.value || !profileForm.humanName.trim()) return;
  saving.value = true;
  try {
    const payload = {
      scenicId: selectedScenicId.value,
      humanName: profileForm.humanName.trim(),
      appearanceConfig: profileForm.appearanceConfig.trim(),
      voiceConfig: profileForm.voiceConfig.trim(),
      lipSync: profileForm.lipSync,
      defaultGreeting: profileForm.defaultGreeting.trim(),
      avatarImage: profileForm.avatarImage.trim(),
      isDefault: profileForm.isDefault
    } as const;

    if (profileForm.id) {
      await adminApi.updateDigitalHuman({ id: profileForm.id, ...payload });
      if (profileForm.isDefault === 1) {
        await adminApi.setDefaultDigitalHuman(profileForm.id, selectedScenicId.value);
      }
      router.push("/avatar");
      return;
    }

    await adminApi.createDigitalHuman(payload);
    router.push("/avatar");
  } finally {
    saving.value = false;
  }
};

const removeProfile = async () => {
  if (!profileForm.id) return;
  deleting.value = true;
  try {
    await adminApi.deleteDigitalHuman(profileForm.id);
    router.push("/avatar");
  } finally {
    deleting.value = false;
  }
};

watch([selectedScenicId, () => route.params.id], loadProfile, { immediate: true });
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-[8px] border border-[color:var(--color-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-5 py-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">Avatar Config</p>
          <h2 class="mt-2 text-[28px] font-semibold tracking-tight text-slate-950">{{ isCreating ? "新建数字人模型" : "编辑数字人模型" }}</h2>
          <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            在这里维护当前模型的外观参数、语音参数和欢迎语。保存后会回到数字人展台页。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiBadge variant="info">{{ loading ? "读取中" : isCreating ? "创建模式" : "编辑模式" }}</UiBadge>
          <UiButton size="sm" variant="outline" @click="router.push('/avatar')">返回展台</UiButton>
        </div>
      </div>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
      <UiCard class="rounded-[8px] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Profile Editor</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">基础配置</h3>
          </div>
          <UiBadge variant="secondary">{{ profileForm.isDefault === 1 ? "保存后将成为默认" : "保存为候选模型" }}</UiBadge>
        </div>

        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <label class="space-y-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">模型名称</span>
            <input v-model="profileForm.humanName" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 text-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
          </label>
          <label class="space-y-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">头像地址</span>
            <input v-model="profileForm.avatarImage" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 text-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
          </label>
          <label class="space-y-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">口型同步</span>
            <UiSelect v-model="profileForm.lipSync" :options="lipSyncOptions" />
          </label>
          <label class="space-y-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">模型角色</span>
            <UiSelect v-model="profileForm.isDefault" :options="roleOptions" />
          </label>
          <label class="space-y-2 md:col-span-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">默认欢迎语</span>
            <textarea v-model="profileForm.defaultGreeting" rows="4" class="w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
          </label>
        </div>

        <div class="mt-5 flex flex-wrap gap-3">
          <UiButton :disabled="saving || !profileForm.humanName.trim()" @click="saveProfile">
            {{ saving ? "保存中..." : isCreating ? "创建模型" : "保存模型" }}
          </UiButton>
          <UiButton variant="outline" :disabled="deleting || !profileForm.id" @click="removeProfile">
            {{ deleting ? "删除中..." : "删除模型" }}
          </UiButton>
        </div>
      </UiCard>

      <UiCard class="rounded-[8px] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] px-5 py-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Advanced Config</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">参数细节</h3>
          </div>
          <UiBadge variant="secondary">{{ profileForm.humanName || "未命名模型" }}</UiBadge>
        </div>

        <div class="mt-5 grid gap-3">
          <label class="space-y-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">形象参数配置</span>
            <textarea v-model="profileForm.appearanceConfig" rows="10" class="w-full rounded-[8px] border border-[color:var(--color-border)] bg-[#fbfdff] px-4 py-3 font-mono text-xs leading-6 outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
          </label>
          <label class="space-y-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">语音参数配置</span>
            <textarea v-model="profileForm.voiceConfig" rows="10" class="w-full rounded-[8px] border border-[color:var(--color-border)] bg-[#fbfdff] px-4 py-3 font-mono text-xs leading-6 outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
          </label>
        </div>
      </UiCard>
    </section>
  </div>
</template>
