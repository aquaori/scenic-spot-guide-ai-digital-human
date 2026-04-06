<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import type { Scenic } from "@/types/admin";
import { adminApi } from "@/api/admin";
import { adminEnv } from "@/config/env";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiCoordinateInput from "@/components/ui/UiCoordinateInput.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import UiTimeRange from "@/components/ui/UiTimeRange.vue";
import { useAdminStore } from "@/stores/admin";

const adminStore = useAdminStore();
const { selectedScenicId } = storeToRefs(adminStore);

type ScenicForm = {
  id: number | null;
  scenicName: string;
  scenicAddress: string;
  scenicDesc: string;
  openTime: string;
  ticketInfo: string;
  contactPhone: string;
  officialWebsite: string;
  coverImage: string;
  gpsLatitude: number;
  gpsLongitude: number;
  starLevel: string;
  status: 0 | 1;
  sort: number;
};

const scenicForm = reactive<ScenicForm>({
  id: null,
  scenicName: "",
  scenicAddress: "",
  scenicDesc: "",
  openTime: "",
  ticketInfo: "",
  contactPhone: "",
  officialWebsite: "",
  coverImage: "",
  gpsLatitude: 0,
  gpsLongitude: 0,
  starLevel: "5A",
  status: 1,
  sort: 1
});

const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);

const scenicSummary = ref<Scenic | null>(null);
const starLevelOptions = [
  { label: "5A", value: "5A" },
  { label: "4A", value: "4A" },
  { label: "3A", value: "3A" }
] as const;
const scenicStatusOptions = [
  { label: "启用", value: 1 },
  { label: "停用", value: 0 }
] as const;

const fillScenicForm = (scenic: Scenic | null) => {
  scenicSummary.value = scenic;

  Object.assign(scenicForm, {
    id: scenic?.id ?? null,
    scenicName: scenic?.scenicName ?? "",
    scenicAddress: scenic?.scenicAddress ?? "",
    scenicDesc: scenic?.scenicDesc ?? "",
    openTime: scenic?.openTime ?? "",
    ticketInfo: scenic?.ticketInfo ?? "",
    contactPhone: scenic?.contactPhone ?? "",
    officialWebsite: scenic?.officialWebsite ?? "",
    coverImage: scenic?.coverImage ?? "",
    gpsLatitude: scenic?.gpsLatitude ?? 0,
    gpsLongitude: scenic?.gpsLongitude ?? 0,
    starLevel: scenic?.starLevel ?? "5A",
    status: scenic?.status ?? 1,
    sort: scenic?.sort ?? 1
  });
};

const scenicPayload = computed(() => ({
  scenicName: scenicForm.scenicName.trim(),
  scenicAddress: scenicForm.scenicAddress.trim(),
  scenicDesc: scenicForm.scenicDesc.trim(),
  openTime: scenicForm.openTime.trim(),
  ticketInfo: scenicForm.ticketInfo.trim(),
  contactPhone: scenicForm.contactPhone.trim(),
  officialWebsite: scenicForm.officialWebsite.trim(),
  coverImage: scenicForm.coverImage.trim(),
  gpsLatitude: Number(scenicForm.gpsLatitude) || 0,
  gpsLongitude: Number(scenicForm.gpsLongitude) || 0,
  starLevel: scenicForm.starLevel,
  status: scenicForm.status,
  sort: Number(scenicForm.sort) || 1
}));

const loadSettings = async (scenicId: number) => {
  loading.value = true;
  try {
    const scenicRes = await adminApi.getScenicDetail(scenicId);
    fillScenicForm(scenicRes.data);
  } finally {
    loading.value = false;
  }
};

const createNewScenic = () => {
  fillScenicForm(null);
  scenicForm.sort = adminStore.scenicList.length + 1;
};

const saveScenic = async () => {
  if (!scenicPayload.value.scenicName) return;
  saving.value = true;
  try {
    if (scenicForm.id) {
      await adminApi.updateScenic({ id: scenicForm.id, ...scenicPayload.value });
      await adminStore.loadScenicList(scenicForm.id);
      await loadSettings(scenicForm.id);
      return;
    }

    await adminApi.createScenic(scenicPayload.value);
    await adminStore.loadScenicList();
    const newest = [...adminStore.scenicList].sort((left, right) => right.id - left.id)[0];
    await adminStore.loadScenicList(newest?.id ?? null);
    if (adminStore.selectedScenicId) {
      await loadSettings(adminStore.selectedScenicId);
    } else {
      createNewScenic();
    }
  } finally {
    saving.value = false;
  }
};

const removeScenic = async () => {
  if (!scenicForm.id) return;
  deleting.value = true;
  try {
    await adminApi.deleteScenic(scenicForm.id);
    await adminStore.loadScenicList();
    if (adminStore.selectedScenicId) {
      await loadSettings(adminStore.selectedScenicId);
    } else {
      createNewScenic();
    }
  } finally {
    deleting.value = false;
  }
};

watch(
  selectedScenicId,
  async (scenicId) => {
    if (!scenicId) {
      createNewScenic();
      return;
    }

    await loadSettings(scenicId);
  },
  { immediate: true }
);
</script>

<template>
  <section class="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
    <article class="rounded-[8px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">Scenic Profile</p>
          <h2 class="mt-2 text-[26px] font-semibold tracking-tight text-slate-950">景区资料工作台</h2>
          <p class="mt-2 max-w-2xl text-sm leading-7 text-slate-500">
            维护当前景区的基础信息、展示素材和运营字段。保存后，顶部景区切换与依赖数据会同步刷新。
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiBadge variant="info">{{ loading ? "读取中" : scenicForm.id ? "编辑现有景区" : "新建景区" }}</UiBadge>
          <UiButton size="sm" variant="outline" @click="createNewScenic">新建草稿</UiButton>
        </div>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-2">
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">景区名称</span>
          <input v-model="scenicForm.scenicName" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] px-4 text-sm outline-none transition focus:border-slate-400" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">景区等级</span>
          <UiSelect v-model="scenicForm.starLevel" :options="starLevelOptions" />
        </label>
        <label class="space-y-2 md:col-span-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">景区地址</span>
          <input v-model="scenicForm.scenicAddress" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] px-4 text-sm outline-none transition focus:border-slate-400" />
        </label>
        <label class="space-y-2 md:col-span-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">景区简介</span>
          <textarea v-model="scenicForm.scenicDesc" rows="4" class="w-full rounded-[8px] border border-[color:var(--color-border)] px-4 py-3 text-sm leading-7 outline-none transition focus:border-slate-400" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">开放时间</span>
          <UiTimeRange v-model="scenicForm.openTime" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">票务信息</span>
          <input v-model="scenicForm.ticketInfo" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] px-4 text-sm outline-none transition focus:border-slate-400" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">联系电话</span>
          <input v-model="scenicForm.contactPhone" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] px-4 text-sm outline-none transition focus:border-slate-400" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">官方网站</span>
          <input v-model="scenicForm.officialWebsite" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] px-4 text-sm outline-none transition focus:border-slate-400" />
        </label>
        <label class="space-y-2 md:col-span-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">封面图片</span>
          <input v-model="scenicForm.coverImage" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] px-4 text-sm outline-none transition focus:border-slate-400" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">纬度</span>
          <UiCoordinateInput v-model="scenicForm.gpsLatitude" axis="latitude" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">经度</span>
          <UiCoordinateInput v-model="scenicForm.gpsLongitude" axis="longitude" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">状态</span>
          <UiSelect v-model="scenicForm.status" :options="scenicStatusOptions" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">排序值</span>
          <input v-model.number="scenicForm.sort" type="number" min="1" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] px-4 text-sm outline-none transition focus:border-slate-400" />
        </label>
      </div>

      <div class="mt-5 flex flex-wrap gap-3">
        <UiButton :disabled="saving || !scenicForm.scenicName.trim()" @click="saveScenic">
          {{ saving ? "保存中..." : scenicForm.id ? "保存修改" : "创建景区" }}
        </UiButton>
        <UiButton variant="outline" :disabled="deleting || !scenicForm.id" @click="removeScenic">
          {{ deleting ? "删除中..." : "删除景区" }}
        </UiButton>
      </div>
    </article>

    <article class="space-y-5">
      <section class="rounded-[8px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Snapshot</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">当前资料概览</h3>
          </div>
          <UiBadge variant="secondary">{{ scenicSummary?.status === 1 ? "已启用" : scenicSummary ? "已停用" : "草稿" }}</UiBadge>
        </div>

        <div class="mt-5 space-y-3 text-sm text-slate-600">
          <div class="rounded-[8px] bg-slate-50 px-4 py-4">
            <p class="text-xs tracking-[0.04em] text-slate-400">景区信息</p>
            <p class="mt-3 text-lg font-semibold text-slate-950">{{ scenicForm.scenicName || "未命名景区" }}</p>
            <p class="mt-2 leading-7">{{ scenicForm.scenicDesc || "填写景区概述后，这里会显示对外展示摘要。" }}</p>
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="rounded-[8px] border border-[color:var(--color-border)] px-4 py-3">
              <p class="text-xs tracking-[0.04em] text-slate-400">开放时间</p>
              <p class="mt-2 font-medium text-slate-900">{{ scenicForm.openTime || "--" }}</p>
            </div>
            <div class="rounded-[8px] border border-[color:var(--color-border)] px-4 py-3">
              <p class="text-xs tracking-[0.04em] text-slate-400">票务信息</p>
              <p class="mt-2 font-medium text-slate-900">{{ scenicForm.ticketInfo || "--" }}</p>
            </div>
            <div class="rounded-[8px] border border-[color:var(--color-border)] px-4 py-3">
              <p class="text-xs tracking-[0.04em] text-slate-400">地理位置</p>
              <p class="mt-2 font-medium text-slate-900">{{ scenicForm.gpsLatitude }}, {{ scenicForm.gpsLongitude }}</p>
            </div>
            <div class="rounded-[8px] border border-[color:var(--color-border)] px-4 py-3">
              <p class="text-xs tracking-[0.04em] text-slate-400">联系方式</p>
              <p class="mt-2 font-medium text-slate-900">{{ scenicForm.contactPhone || "--" }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-[8px] border border-[color:var(--color-border)] bg-white px-5 py-5 shadow-[0_10px_24px_rgba(148,163,184,0.08)]">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Runtime</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">运行环境信息</h3>
          </div>
          <UiBadge variant="info">{{ adminEnv.enableMsw ? "开发接入中" : "真实接口" }}</UiBadge>
        </div>

        <div class="mt-5 space-y-3 text-sm text-slate-600">
          <div class="rounded-[8px] bg-slate-50 px-4 py-4">
            <p class="font-medium text-slate-900">API Base URL</p>
            <p class="mt-2">{{ adminEnv.apiBaseUrl }}</p>
          </div>
          <div class="rounded-[8px] bg-slate-50 px-4 py-4">
            <p class="font-medium text-slate-900">当前景区 ID</p>
            <p class="mt-2">{{ selectedScenicId ?? "--" }}</p>
          </div>
        </div>
      </section>
    </article>
  </section>
</template>
