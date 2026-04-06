<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiCard from "@/components/ui/UiCard.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import UiSkeleton from "@/components/ui/UiSkeleton.vue";
import { adminApi } from "@/api/admin";
import { formatNumber } from "@/lib/format";
import { useAdminStore } from "@/stores/admin";
import type { KnowledgeDoc } from "@/types/admin";

const adminStore = useAdminStore();
const { selectedScenicId } = storeToRefs(adminStore);

type KnowledgeForm = {
  id: number | null;
  scenicId: number;
  docTitle: string;
  docType: "markdown" | "text" | "html";
  docContent: string;
  docSummary: string;
  status: 0 | 1;
};

const docs = ref<KnowledgeDoc[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const vectorizingId = ref<number | null>(null);
const activeDocId = ref<number | null>(null);
const docSkeletonItems = Array.from({ length: 3 }, (_, index) => index);

const docForm = reactive<KnowledgeForm>({
  id: null,
  scenicId: 0,
  docTitle: "",
  docType: "markdown",
  docContent: "",
  docSummary: "",
  status: 1
});

const activeDoc = computed(() => docs.value.find((item) => item.id === activeDocId.value) ?? null);
const docTypeOptions = [
  { label: "Markdown", value: "markdown" },
  { label: "纯文本", value: "text" },
  { label: "HTML", value: "html" }
] as const;
const docStatusOptions = [
  { label: "启用", value: 1 },
  { label: "停用", value: 0 }
] as const;

const fillDocForm = (doc: KnowledgeDoc | null, scenicId: number) => {
  Object.assign(docForm, {
    id: doc?.id ?? null,
    scenicId,
    docTitle: doc?.docTitle ?? "",
    docType: doc?.docType ?? "markdown",
    docContent: doc?.docContent ?? "",
    docSummary: doc?.docSummary ?? "",
    status: doc?.status ?? 1
  });
};

const loadDocs = async (scenicId: number) => {
  loading.value = true;
  try {
    const response = await adminApi.listKnowledgeDocs(scenicId);
    docs.value = response.rows;

    const nextId =
      activeDocId.value && response.rows.some((item) => item.id === activeDocId.value)
        ? activeDocId.value
        : response.rows[0]?.id ?? null;

    activeDocId.value = nextId;

    if (nextId) {
      const detail = await adminApi.getKnowledgeDocDetail(nextId);
      fillDocForm(detail.data, scenicId);
    } else {
      fillDocForm(null, scenicId);
    }
  } finally {
    loading.value = false;
  }
};

const selectDoc = async (id: number) => {
  if (!selectedScenicId.value) return;
  activeDocId.value = id;
  const detail = await adminApi.getKnowledgeDocDetail(id);
  fillDocForm(detail.data, selectedScenicId.value);
};

const createNewDoc = () => {
  if (!selectedScenicId.value) return;
  activeDocId.value = null;
  fillDocForm(null, selectedScenicId.value);
};

const saveDoc = async () => {
  if (!selectedScenicId.value || !docForm.docTitle.trim() || !docForm.docContent.trim()) return;
  saving.value = true;
  try {
    const payload = {
      scenicId: selectedScenicId.value,
      docTitle: docForm.docTitle.trim(),
      docType: docForm.docType,
      docContent: docForm.docContent,
      docSummary: docForm.docSummary.trim(),
      status: docForm.status
    } as const;

    if (docForm.id) {
      await adminApi.updateKnowledgeDoc({ id: docForm.id, ...payload });
      await loadDocs(selectedScenicId.value);
      await selectDoc(docForm.id);
      return;
    }

    await adminApi.createKnowledgeDoc(payload);
    await loadDocs(selectedScenicId.value);
    const newest = [...docs.value].sort((left, right) => right.id - left.id)[0];
    if (newest) {
      await selectDoc(newest.id);
    }
  } finally {
    saving.value = false;
  }
};

const removeDoc = async () => {
  if (!selectedScenicId.value || !docForm.id) return;
  deleting.value = true;
  try {
    await adminApi.deleteKnowledgeDoc(docForm.id);
    activeDocId.value = null;
    await loadDocs(selectedScenicId.value);
  } finally {
    deleting.value = false;
  }
};

const vectorizeDoc = async (id: number) => {
  if (!selectedScenicId.value) return;
  vectorizingId.value = id;
  try {
    await adminApi.vectorizeKnowledgeDoc(id);
    await loadDocs(selectedScenicId.value);
    await selectDoc(id);
  } finally {
    vectorizingId.value = null;
  }
};

watch(
  selectedScenicId,
  async (scenicId) => {
    if (!scenicId) return;
    await loadDocs(scenicId);
  },
  { immediate: true }
);
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-[0.94fr_1.06fr]">
    <UiCard class="rounded-[8px] px-5 py-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Knowledge Library</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-950">知识库文档工作台</h2>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiBadge variant="info">{{ loading ? "读取中" : `${docs.length} 份文档` }}</UiBadge>
          <UiButton size="sm" variant="outline" @click="createNewDoc">新建文档</UiButton>
        </div>
      </div>

      <Transition name="admin-fade" mode="out-in">
      <div v-if="loading" key="knowledge-stats-skeleton" class="mt-5 grid gap-3 md:grid-cols-3">
        <div v-for="item in 3" :key="`knowledge-stat-skeleton-${item}`" class="rounded-[8px] bg-[#f7faff] px-4 py-4">
          <UiSkeleton width="76px" height="14px" class="mb-4" />
          <UiSkeleton width="84px" height="36px" />
        </div>
      </div>
      <div v-else key="knowledge-stats-content" class="mt-5 grid gap-3 md:grid-cols-3">
        <div class="rounded-[8px] bg-[#f7faff] px-4 py-4">
          <p class="text-sm text-slate-500">文档总量</p>
          <strong class="mt-4 block text-3xl font-semibold text-slate-900">{{ docs.length }}</strong>
        </div>
        <div class="rounded-[8px] bg-[#f7faff] px-4 py-4">
          <p class="text-sm text-slate-500">已向量化</p>
          <strong class="mt-4 block text-3xl font-semibold text-slate-900">{{ docs.filter((item) => item.vectorized === 1).length }}</strong>
        </div>
        <div class="rounded-[8px] bg-[#f7faff] px-4 py-4">
          <p class="text-sm text-slate-500">累计字数</p>
          <strong class="mt-4 block text-3xl font-semibold text-slate-900">{{ formatNumber(docs.reduce((sum, item) => sum + item.wordCount, 0)) }}</strong>
        </div>
      </div>
      </Transition>

      <Transition name="admin-fade" mode="out-in">
      <div v-if="loading" key="knowledge-list-skeleton" class="mt-5 space-y-3">
        <article
          v-for="item in docSkeletonItems"
          :key="`doc-skeleton-${item}`"
          class="rounded-[8px] border border-[color:var(--color-border)] bg-[#f8fafc] p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-3">
                <UiSkeleton width="220px" height="18px" />
                <UiSkeleton width="76px" height="24px" />
              </div>
              <UiSkeleton width="100%" height="12px" class="mt-4" />
              <UiSkeleton width="80%" height="12px" class="mt-2" />
            </div>
            <UiSkeleton width="84px" height="32px" />
          </div>
        </article>
      </div>
      <div v-else key="knowledge-list-content" class="mt-5 space-y-3">
        <article
          v-for="doc in docs"
          :key="doc.id"
          :class="[
            'rounded-[8px] border p-4 transition',
            activeDocId === doc.id
              ? 'border-[#b7ccf7] bg-[linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)] text-slate-900 shadow-[0_20px_34px_rgba(37,99,235,0.12)]'
              : 'border-[color:var(--color-border)] bg-[#f8fafc]'
          ]"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <button type="button" class="min-w-0 flex-1 cursor-pointer text-left" @click="selectDoc(doc.id)">
              <div class="flex items-center gap-3">
                <h3 :class="activeDocId === doc.id ? 'text-[#1d4ed8]' : 'text-slate-900'" class="text-base font-semibold">
                  {{ doc.docTitle }}
                </h3>
                <UiBadge :variant="doc.vectorized === 1 ? 'success' : 'secondary'">
                  {{ doc.vectorized === 1 ? "已向量化" : "待处理" }}
                </UiBadge>
              </div>
              <p :class="activeDocId === doc.id ? 'text-[#4a6693]' : 'text-slate-600'" class="mt-3 text-sm leading-7">
                {{ doc.docSummary }}
              </p>
            </button>
            <UiButton
              size="sm"
              variant="outline"
              :disabled="doc.vectorized === 1 || vectorizingId === doc.id"
              @click="vectorizeDoc(doc.id)"
            >
              {{ vectorizingId === doc.id ? "处理中..." : "开始向量化" }}
            </UiButton>
          </div>
        </article>
      </div>
      </Transition>
    </UiCard>

    <UiCard class="rounded-[8px] px-5 py-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Document Editor</p>
          <h3 class="mt-2 text-xl font-semibold text-slate-950">{{ docForm.id ? "编辑知识库文档" : "创建知识库文档" }}</h3>
        </div>
        <UiBadge variant="secondary">{{ docForm.status === 1 ? "上线状态" : "停用状态" }}</UiBadge>
      </div>

      <div class="mt-5 grid gap-3 md:grid-cols-2">
        <label class="space-y-2 md:col-span-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">文档标题</span>
          <input v-model="docForm.docTitle" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 text-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">文档类型</span>
          <UiSelect v-model="docForm.docType" :options="docTypeOptions" />
        </label>
        <label class="space-y-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">状态</span>
          <UiSelect v-model="docForm.status" :options="docStatusOptions" />
        </label>
        <label class="space-y-2 md:col-span-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">摘要说明</span>
          <textarea v-model="docForm.docSummary" rows="3" class="w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
        </label>
        <label class="space-y-2 md:col-span-2">
          <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">文档内容</span>
          <textarea v-model="docForm.docContent" rows="14" class="w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 py-3 font-mono text-xs leading-6 outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
        </label>
      </div>

      <div class="mt-5 flex flex-wrap gap-3">
        <UiButton :disabled="saving || !docForm.docTitle.trim() || !docForm.docContent.trim()" @click="saveDoc">
          {{ saving ? "保存中..." : docForm.id ? "保存文档" : "创建文档" }}
        </UiButton>
        <UiButton variant="outline" :disabled="deleting || !docForm.id" @click="removeDoc">
          {{ deleting ? "删除中..." : "删除文档" }}
        </UiButton>
      </div>

      <Transition name="admin-fade" mode="out-in">
      <div v-if="loading" key="knowledge-meta-skeleton" class="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div class="rounded-[8px] border border-[color:var(--color-border)] bg-[#f7faff] p-4">
          <UiSkeleton width="92px" height="12px" class="mb-4" />
          <div class="grid gap-3">
            <div v-for="item in 3" :key="`knowledge-meta-skeleton-${item}`" class="rounded-[8px] bg-white px-4 py-3">
              <UiSkeleton width="64px" height="12px" class="mb-3" />
              <UiSkeleton width="72%" height="16px" />
            </div>
          </div>
        </div>

        <div class="rounded-[8px] border border-[color:var(--color-border)] p-4">
          <UiSkeleton width="92px" height="12px" class="mb-4" />
          <UiSkeleton width="54%" height="22px" class="mb-4" />
          <UiSkeleton width="88%" height="12px" class="mb-2" />
          <UiSkeleton width="74%" height="12px" class="mb-4" />
          <UiSkeleton width="100%" height="220px" />
        </div>
      </div>
      <div v-else key="knowledge-meta-content" class="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div class="rounded-[8px] border border-[color:var(--color-border)] bg-[#f7faff] p-4">
          <p class="text-xs font-medium tracking-[0.08em] text-slate-400">文档信息</p>
          <div class="mt-4 grid gap-3">
            <div class="rounded-[8px] bg-white px-4 py-3">
              <p class="text-xs tracking-[0.04em] text-slate-400">当前选中</p>
              <p class="mt-2 font-medium text-slate-900">{{ activeDoc?.docTitle ?? "--" }}</p>
            </div>
            <div class="rounded-[8px] bg-white px-4 py-3">
              <p class="text-xs tracking-[0.04em] text-slate-400">字数统计</p>
              <p class="mt-2 font-medium text-slate-900">{{ formatNumber(activeDoc?.wordCount ?? docForm.docContent.length) }}</p>
            </div>
            <div class="rounded-[8px] bg-white px-4 py-3">
              <p class="text-xs tracking-[0.04em] text-slate-400">分块数量</p>
              <p class="mt-2 font-medium text-slate-900">{{ activeDoc?.chunkCount ?? 0 }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-[8px] border border-[color:var(--color-border)] p-4">
          <p class="text-xs font-medium tracking-[0.08em] text-slate-400">内容预览</p>
          <h4 class="mt-2 text-base font-semibold text-slate-900">{{ docForm.docTitle || "未命名文档" }}</h4>
          <p class="mt-3 text-sm leading-7 text-slate-600">{{ docForm.docSummary || "填写摘要后，这里会显示对文档价值的快速说明。" }}</p>
          <pre class="mt-4 max-h-[380px] overflow-auto rounded-[8px] bg-[#f7faff] px-4 py-4 text-xs leading-6 text-slate-700">{{ docForm.docContent || "文档正文预览" }}</pre>
        </div>
      </div>
      </Transition>
    </UiCard>
  </div>
</template>
