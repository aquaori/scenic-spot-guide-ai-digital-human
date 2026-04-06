<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { adminApi } from "@/api/admin";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiCard from "@/components/ui/UiCard.vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import UiSkeleton from "@/components/ui/UiSkeleton.vue";
import { useAdminStore } from "@/stores/admin";
import type { FaqItem, HotFaqItem } from "@/types/admin";

const adminStore = useAdminStore();
const { selectedScenicId } = storeToRefs(adminStore);

type FaqForm = {
  id: number | null;
  scenicId: number;
  question: string;
  questionKeywords: string;
  answer: string;
  answerType: "text" | "rich" | "html";
  spotId: number | null;
  similarQuestions: string;
  status: 0 | 1;
};

const faqs = ref<FaqItem[]>([]);
const hotFaqs = ref<HotFaqItem[]>([]);
const loading = ref(false);
const saving = ref(false);
const deleting = ref(false);
const matching = ref(false);
const activeFaqId = ref<number | null>(null);
const matchedFaq = ref<FaqItem | null>(null);
const matchQuestion = ref("");

const faqForm = reactive<FaqForm>({
  id: null,
  scenicId: 0,
  question: "",
  questionKeywords: "",
  answer: "",
  answerType: "text",
  spotId: null,
  similarQuestions: "[]",
  status: 1
});

const faqSkeletonItems = Array.from({ length: 3 }, (_, index) => index);
const sidebarSkeletonItems = Array.from({ length: 2 }, (_, index) => index);

const activeFaq = computed(() => faqs.value.find((item) => item.id === activeFaqId.value) ?? null);
const answerTypeOptions = [
  { label: "纯文本", value: "text" },
  { label: "富文本", value: "rich" },
  { label: "HTML", value: "html" }
] as const;
const statusOptions = [
  { label: "在线", value: 1 },
  { label: "停用", value: 0 }
] as const;

const fillFaqForm = (faq: FaqItem | null, scenicId: number) => {
  Object.assign(faqForm, {
    id: faq?.id ?? null,
    scenicId,
    question: faq?.question ?? "",
    questionKeywords: faq?.questionKeywords ?? "",
    answer: faq?.answer ?? "",
    answerType: faq?.answerType ?? "text",
    spotId: faq?.spotId ?? null,
    similarQuestions: faq?.similarQuestions ?? "[]",
    status: faq?.status ?? 1
  });
};

const loadFaqData = async (scenicId: number) => {
  loading.value = true;
  try {
    const [faqRes, hotRes] = await Promise.all([adminApi.listFaqs(scenicId), adminApi.getHotFaqs(scenicId)]);
    faqs.value = Array.isArray(faqRes.rows) ? faqRes.rows : [];
    hotFaqs.value = Array.isArray(hotRes.data) ? hotRes.data : [];

    const nextId =
      activeFaqId.value && faqs.value.some((item) => item.id === activeFaqId.value)
        ? activeFaqId.value
        : faqs.value[0]?.id ?? null;

    activeFaqId.value = nextId;

    if (nextId) {
      const detail = await adminApi.getFaqDetail(nextId);
      fillFaqForm(detail.data, scenicId);
    } else {
      fillFaqForm(null, scenicId);
    }
  } finally {
    loading.value = false;
  }
};

const selectFaq = async (id: number) => {
  if (!selectedScenicId.value) return;
  activeFaqId.value = id;
  const detail = await adminApi.getFaqDetail(id);
  fillFaqForm(detail.data, selectedScenicId.value);
};

const createNewFaq = () => {
  if (!selectedScenicId.value) return;
  activeFaqId.value = null;
  fillFaqForm(null, selectedScenicId.value);
};

const saveFaq = async () => {
  if (!selectedScenicId.value || !faqForm.question.trim() || !faqForm.answer.trim()) return;
  saving.value = true;
  try {
    const payload = {
      scenicId: selectedScenicId.value,
      question: faqForm.question.trim(),
      questionKeywords: faqForm.questionKeywords.trim(),
      answer: faqForm.answer.trim(),
      answerType: faqForm.answerType,
      spotId: faqForm.spotId,
      similarQuestions: faqForm.similarQuestions.trim() || "[]",
      status: faqForm.status
    } as const;

    if (faqForm.id) {
      await adminApi.updateFaq({ id: faqForm.id, ...payload });
      await loadFaqData(selectedScenicId.value);
      await selectFaq(faqForm.id);
      return;
    }

    await adminApi.createFaq(payload);
    await loadFaqData(selectedScenicId.value);
    const newest = [...faqs.value].sort((left, right) => right.id - left.id)[0];
    if (newest) {
      await selectFaq(newest.id);
    }
  } finally {
    saving.value = false;
  }
};

const removeFaq = async () => {
  if (!selectedScenicId.value || !faqForm.id) return;
  deleting.value = true;
  try {
    await adminApi.deleteFaq(faqForm.id);
    activeFaqId.value = null;
    await loadFaqData(selectedScenicId.value);
  } finally {
    deleting.value = false;
  }
};

const runMatch = async () => {
  if (!selectedScenicId.value || !matchQuestion.value.trim()) return;
  matching.value = true;
  try {
    matchedFaq.value = (await adminApi.matchFaq(selectedScenicId.value, matchQuestion.value.trim())).data;
  } finally {
    matching.value = false;
  }
};

const markHelpful = async (id: number, type: "helpful" | "unhelpful") => {
  if (!selectedScenicId.value) return;
  if (type === "helpful") {
    await adminApi.markFaqHelpful(id);
  } else {
    await adminApi.markFaqUnhelpful(id);
  }
  await loadFaqData(selectedScenicId.value);
};

watch(
  selectedScenicId,
  async (scenicId) => {
    if (!scenicId) return;
    matchedFaq.value = null;
    matchQuestion.value = "";
    await loadFaqData(scenicId);
  },
  { immediate: true }
);
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
    <UiCard class="rounded-[8px] px-5 py-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">FAQ Library</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-950">问答列表</h2>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiBadge variant="info">{{ loading ? "读取中" : `${faqs.length} 条 FAQ` }}</UiBadge>
          <UiButton size="sm" variant="outline" @click="createNewFaq">新建 FAQ</UiButton>
        </div>
      </div>

      <Transition name="admin-fade" mode="out-in">
      <div v-if="loading" key="faq-list-skeleton" class="mt-5 space-y-3">
        <article
          v-for="item in faqSkeletonItems"
          :key="`faq-skeleton-${item}`"
          class="rounded-[8px] border border-[color:var(--color-border)] bg-[#f8fafc] p-4"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-3">
                <UiSkeleton width="220px" height="18px" />
                <UiSkeleton width="44px" height="24px" />
              </div>
              <UiSkeleton width="100%" height="12px" class="mt-4" />
              <UiSkeleton width="86%" height="12px" class="mt-2" />
            </div>
            <div class="flex gap-2">
              <UiSkeleton width="62px" height="32px" />
              <UiSkeleton width="62px" height="32px" />
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <UiSkeleton width="40px" height="24px" />
            <UiSkeleton width="44px" height="24px" />
            <UiSkeleton width="56px" height="24px" />
          </div>
        </article>
      </div>
      <div v-else key="faq-list-content" class="mt-5 space-y-3">
        <article
          v-for="item in faqs"
          :key="item.id"
          :class="[
            'rounded-[8px] border p-4 transition',
            activeFaqId === item.id
              ? 'border-[#b7ccf7] bg-[linear-gradient(180deg,#f8fbff_0%,#edf4ff_100%)] text-slate-900 shadow-[0_20px_34px_rgba(37,99,235,0.12)]'
              : 'border-[color:var(--color-border)] bg-[#f8fafc]'
          ]"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <button type="button" class="min-w-0 flex-1 cursor-pointer text-left" @click="selectFaq(item.id)">
              <div class="flex items-center gap-3">
                <p :class="activeFaqId === item.id ? 'text-[#1d4ed8]' : 'text-slate-900'" class="text-base font-semibold">
                  {{ item.question }}
                </p>
                <UiBadge :variant="item.status === 1 ? 'success' : 'secondary'">
                  {{ item.status === 1 ? "在线" : "停用" }}
                </UiBadge>
              </div>
              <p :class="activeFaqId === item.id ? 'text-[#4a6693]' : 'text-slate-600'" class="mt-2 text-sm leading-7">
                {{ item.answer }}
              </p>
            </button>
            <div class="flex gap-2">
              <UiButton size="sm" variant="outline" @click="markHelpful(item.id, 'helpful')">有帮助</UiButton>
              <UiButton size="sm" variant="secondary" @click="markHelpful(item.id, 'unhelpful')">待优化</UiButton>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap gap-2">
            <UiBadge v-for="keyword in item.questionKeywords.split(',').filter(Boolean)" :key="keyword" variant="secondary">
              {{ keyword }}
            </UiBadge>
          </div>
        </article>
      </div>
      </Transition>
    </UiCard>

    <div class="space-y-5">
      <UiCard class="rounded-[8px] px-5 py-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">FAQ Editor</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">{{ faqForm.id ? "编辑问答" : "创建新问答" }}</h3>
          </div>
          <UiBadge variant="secondary">热门 {{ hotFaqs.length }}</UiBadge>
        </div>

        <div class="mt-5 grid gap-3 md:grid-cols-2">
          <label class="space-y-2 md:col-span-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">问题标题</span>
            <input v-model="faqForm.question" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 text-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
          </label>
          <label class="space-y-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">回答类型</span>
            <UiSelect v-model="faqForm.answerType" :options="answerTypeOptions" />
          </label>
          <label class="space-y-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">状态</span>
            <UiSelect v-model="faqForm.status" :options="statusOptions" />
          </label>
          <label class="space-y-2 md:col-span-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">关键词</span>
            <input v-model="faqForm.questionKeywords" class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 text-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
          </label>
          <label class="space-y-2 md:col-span-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">回答内容</span>
            <textarea v-model="faqForm.answer" rows="5" class="w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm leading-7 outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
          </label>
          <label class="space-y-2 md:col-span-2">
            <span class="text-[13px] font-medium tracking-[0.04em] text-slate-500">相似问题 JSON</span>
            <textarea v-model="faqForm.similarQuestions" rows="4" class="w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 py-3 font-mono text-xs leading-6 outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10" />
          </label>
        </div>

        <div class="mt-5 flex flex-wrap gap-3">
          <UiButton :disabled="saving || !faqForm.question.trim() || !faqForm.answer.trim()" @click="saveFaq">
            {{ saving ? "保存中..." : faqForm.id ? "保存问答" : "创建问答" }}
          </UiButton>
          <UiButton variant="outline" :disabled="deleting || !faqForm.id" @click="removeFaq">
            {{ deleting ? "删除中..." : "删除问答" }}
          </UiButton>
        </div>

        <Transition name="admin-fade" mode="out-in">
        <div v-if="loading" key="faq-side-skeleton" class="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div class="rounded-[8px] border border-[color:var(--color-border)] bg-[#f7faff] p-4">
            <UiSkeleton width="92px" height="12px" class="mb-4" />
            <div class="space-y-3">
              <article
                v-for="item in sidebarSkeletonItems"
                :key="`hot-ranking-skeleton-${item}`"
                class="rounded-[8px] bg-white px-4 py-3"
              >
                <UiSkeleton width="52px" height="12px" class="mb-3" />
                <UiSkeleton width="82%" height="16px" class="mb-3" />
                <UiSkeleton width="64px" height="12px" />
              </article>
            </div>
          </div>

          <div class="rounded-[8px] border border-[color:var(--color-border)] p-4">
            <UiSkeleton width="92px" height="12px" class="mb-4" />
            <div class="space-y-3">
              <div class="rounded-[8px] bg-[#f7faff] px-4 py-3">
                <UiSkeleton width="64px" height="12px" class="mb-3" />
                <UiSkeleton width="68%" height="16px" />
              </div>
              <div class="rounded-[8px] bg-[#f7faff] px-4 py-3">
                <UiSkeleton width="64px" height="12px" class="mb-3" />
                <UiSkeleton width="84%" height="12px" class="mb-2" />
                <UiSkeleton width="72%" height="12px" />
              </div>
            </div>
          </div>
        </div>
        <div v-else key="faq-side-content" class="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div class="rounded-[8px] border border-[color:var(--color-border)] bg-[#f7faff] p-4">
            <p class="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Hot Ranking</p>
            <div class="mt-4 space-y-3">
              <article v-for="(item, index) in hotFaqs" :key="item.id" class="rounded-[8px] bg-white px-4 py-3">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <p class="text-xs tracking-[0.04em] text-slate-400">TOP {{ String(index + 1).padStart(2, "0") }}</p>
                    <p class="mt-2 text-sm font-medium text-slate-900">{{ item.question }}</p>
                  </div>
                  <div class="text-right text-sm text-slate-500">
                    <p>{{ item.clickCount }}</p>
                    <p>helpful {{ item.helpfulCount }}</p>
                  </div>
                </div>
              </article>
            </div>
          </div>

          <div class="rounded-[8px] border border-[color:var(--color-border)] p-4">
            <p class="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">Current Detail</p>
            <div class="mt-4 space-y-3">
              <div class="rounded-[8px] bg-[#f7faff] px-4 py-3">
                <p class="text-xs tracking-[0.04em] text-slate-400">当前选中</p>
                <p class="mt-2 font-medium text-slate-900">{{ activeFaq?.question ?? "未选择 FAQ" }}</p>
              </div>
              <div class="rounded-[8px] bg-[#f7faff] px-4 py-3">
                <p class="text-xs tracking-[0.04em] text-slate-400">数据统计</p>
                <p class="mt-2 text-sm leading-7 text-slate-600">
                  点击 {{ activeFaq?.clickCount ?? 0 }}，有帮助 {{ activeFaq?.helpfulCount ?? 0 }}，待优化 {{ activeFaq?.unhelpfulCount ?? 0 }}
                </p>
              </div>
            </div>
          </div>
        </div>
        </Transition>
      </UiCard>

      <UiCard class="rounded-[8px] px-5 py-5">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Semantic Match</p>
            <h3 class="mt-2 text-xl font-semibold text-slate-950">智能问题匹配</h3>
          </div>
          <UiBadge variant="secondary">RAG 检索</UiBadge>
        </div>

        <div class="mt-5 flex flex-col gap-3 xl:flex-row">
          <input
            v-model="matchQuestion"
            class="h-12 flex-1 rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 text-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10"
            placeholder="输入一个用户真实问题，测试知识库里的匹配效果"
          />
          <UiButton :disabled="matching || !matchQuestion.trim()" @click="runMatch">
            {{ matching ? "匹配中..." : "开始匹配" }}
          </UiButton>
        </div>

        <Transition name="admin-fade" mode="out-in">
        <div v-if="loading" key="faq-match-skeleton" class="mt-4 rounded-[8px] border border-[color:var(--color-border)] bg-[#f7faff] p-4">
          <UiSkeleton width="88px" height="12px" class="mb-3" />
          <UiSkeleton width="72%" height="16px" class="mb-3" />
          <UiSkeleton width="100%" height="12px" class="mb-2" />
          <UiSkeleton width="84%" height="12px" />
        </div>
        <div v-else key="faq-match-content" class="mt-4 rounded-[8px] border border-[color:var(--color-border)] bg-[#f7faff] p-4">
          <template v-if="matchedFaq">
            <p class="text-xs tracking-[0.04em] text-slate-400">匹配结果</p>
            <h4 class="mt-2 text-base font-semibold text-slate-900">{{ matchedFaq.question }}</h4>
            <p class="mt-3 text-sm leading-7 text-slate-600">{{ matchedFaq.answer }}</p>
          </template>
          <p v-else class="text-sm leading-7 text-slate-500">这里会显示 `/manage/faq/match` 返回的匹配结果，没有命中时会保持为空。</p>
        </div>
        </Transition>
      </UiCard>
    </div>
  </div>
</template>
