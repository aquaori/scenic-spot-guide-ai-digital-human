<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { adminApi } from "@/api/admin";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiCard from "@/components/ui/UiCard.vue";
import UiSkeleton from "@/components/ui/UiSkeleton.vue";
import { directionTextMap, formatDateLabel, formatNumber, formatPercent, formatRate, sentimentTextMap } from "@/lib/format";
import { useAdminStore } from "@/stores/admin";
import type { DailyReport, EmotionTrend, FocusPoints, HotQuestionStats, SatisfactionTrend, TodayOverview, WeeklyStats } from "@/types/admin";

const adminStore = useAdminStore();
const { selectedScenic, selectedScenicId } = storeToRefs(adminStore);

const overview = ref<TodayOverview | null>(null);
const weeklyStats = ref<WeeklyStats | null>(null);
const hotQuestions = ref<HotQuestionStats | null>(null);
const emotionTrend = ref<EmotionTrend | null>(null);
const focusPoints = ref<FocusPoints | null>(null);
const satisfactionTrend = ref<SatisfactionTrend | null>(null);
const latestReport = ref<DailyReport | null>(null);
const loading = ref(false);
const generating = ref(false);

const reportDate = "2026-04-06";
const summarySkeletonCards = Array.from({ length: 4 }, (_, index) => index);
const listSkeletonItems = Array.from({ length: 6 }, (_, index) => index);
const compactSkeletonItems = Array.from({ length: 4 }, (_, index) => index);

const summaryCards = computed(() => {
  if (!overview.value || !weeklyStats.value) return [];

  return [
    {
      label: "今日访客",
      value: formatNumber(overview.value.todayVisitors),
      hint: `峰值时段 ${overview.value.peakHour}`
    },
    {
      label: "今日交互",
      value: formatNumber(overview.value.todayInteractions),
      hint: `近 7 天累计 ${formatNumber(weeklyStats.value.summary.totalInteractions)}`
    },
    {
      label: "今日问题",
      value: formatNumber(overview.value.todayQuestions),
      hint: `在线数字人 ${overview.value.activeGuides} 个`
    },
    {
      label: "满意度",
      value: formatPercent(overview.value.satisfactionRate),
      hint: `周均 ${weeklyStats.value.summary.avgSatisfaction.toFixed(2)} / 5`
    }
  ];
});

const loadDashboard = async (scenicId: number) => {
  loading.value = true;
  try {
    const [overviewRes, weeklyRes, hotRes, emotionRes, focusRes, satisfactionRes, reportRes] = await Promise.all([
      adminApi.getTodayOverview(scenicId),
      adminApi.getWeeklyStats(scenicId),
      adminApi.getHotQuestionStats(scenicId),
      adminApi.getEmotionTrend(scenicId, "2026-03-31", "2026-04-06"),
      adminApi.getFocusPoints(scenicId),
      adminApi.getSatisfactionTrend(scenicId),
      adminApi.generateDailyReport(scenicId, reportDate)
    ]);

    overview.value = overviewRes.data;
    weeklyStats.value = weeklyRes.data;
    hotQuestions.value = hotRes.data;
    emotionTrend.value = emotionRes.data;
    focusPoints.value = focusRes.data;
    satisfactionTrend.value = satisfactionRes.data;
    latestReport.value = reportRes.data;
  } finally {
    loading.value = false;
  }
};

const handleGenerateReport = async () => {
  if (!selectedScenicId.value) return;
  generating.value = true;
  try {
    latestReport.value = (await adminApi.generateDailyReport(selectedScenicId.value, reportDate)).data;
  } finally {
    generating.value = false;
  }
};

watch(
  selectedScenicId,
  async (scenicId) => {
    if (!scenicId) return;
    await loadDashboard(scenicId);
  },
  { immediate: true }
);
</script>

<template>
  <div class="space-y-4 min-[1800px]:space-y-3">
    <section class="rounded-[8px] border border-[color:var(--color-border)] bg-white px-5 py-5 min-[1800px]:px-4 min-[1800px]:py-4">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">Dashboard</p>
          <h1 class="mt-3 text-[30px] font-semibold tracking-tight text-slate-950">{{ selectedScenic?.scenicName ?? "景区数据看板" }}</h1>
          <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            页面已接到真实请求链路，开发环境通过 MSW 拦截 `/manage/*` 接口，后续只需要把 `VITE_API_BASE_URL` 切到真实网关即可。
          </p>
        </div>
        <div class="flex items-center gap-3">
          <UiBadge variant="info">MSW 已启用</UiBadge>
          <UiButton :disabled="generating || loading" @click="handleGenerateReport">
            {{ generating ? "生成中..." : "重新生成日报" }}
          </UiButton>
        </div>
      </div>

      <Transition name="admin-fade" mode="out-in">
      <div v-if="loading" key="dashboard-summary-skeleton" class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 min-[1800px]:gap-3">
        <article
          v-for="item in summarySkeletonCards"
          :key="`summary-skeleton-${item}`"
          class="relative overflow-hidden rounded-[8px] border border-[#dbe6f6] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4"
        >
          <div class="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#dbeafe_0%,#bfdbfe_100%)]" />
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <UiSkeleton width="88px" height="12px" class="mb-4" />
              <UiSkeleton width="124px" height="38px" />
            </div>
            <UiSkeleton width="42px" height="28px" />
          </div>
          <div class="mt-4 border-t border-[#e7eef8] pt-3">
            <UiSkeleton width="100%" height="12px" />
          </div>
        </article>
      </div>
      <div v-else key="dashboard-summary-content" class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 min-[1800px]:gap-3">
        <article
          v-for="metric in summaryCards"
          :key="metric.label"
          class="group relative overflow-hidden rounded-[8px] border border-[#dbe6f6] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]"
        >
          <div class="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,#2563eb_0%,#93c5fd_100%)]" />
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">{{ metric.label }}</p>
              <strong class="mt-4 block text-[32px] font-semibold tracking-[-0.03em] text-slate-950">{{ metric.value }}</strong>
            </div>
            <div class="mt-1 rounded-[8px] bg-[#eef4ff] px-2.5 py-1 text-[11px] font-medium text-[#2563eb]">KPI</div>
          </div>
          <div class="mt-4 flex items-center justify-between gap-3 border-t border-[#e7eef8] pt-3">
            <p class="min-w-0 text-xs leading-5 text-slate-500">{{ metric.hint }}</p>
            <span class="shrink-0 text-[11px] font-medium text-slate-400">实时</span>
          </div>
        </article>
      </div>
      </Transition>
    </section>

    <section class="grid gap-3 xl:grid-cols-[1.18fr_0.82fr] min-[1800px]:grid-cols-[1.24fr_0.76fr]">
      <UiCard class="rounded-[8px] px-5 py-5 min-[1800px]:px-4 min-[1800px]:py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Weekly Stats</p>
            <h2 class="mt-2 text-xl font-semibold text-slate-950">近 7 天运营趋势</h2>
          </div>
          <UiBadge variant="secondary">{{ weeklyStats?.summary.daysWithData ?? 0 }} 天</UiBadge>
        </div>

        <Transition name="admin-fade" mode="out-in">
        <div v-if="loading" key="dashboard-weekly-skeleton" class="mt-5 space-y-3 min-[1800px]:grid min-[1800px]:grid-cols-2 min-[1800px]:gap-2.5 min-[1800px]:space-y-0">
          <article
            v-for="item in listSkeletonItems"
            :key="`weekly-skeleton-${item}`"
            class="rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 px-4 py-3"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0 flex-1">
                <UiSkeleton width="48px" height="16px" class="mb-2" />
                <UiSkeleton width="78%" height="12px" />
              </div>
              <div class="w-[84px]">
                <UiSkeleton width="100%" height="22px" class="mb-2" />
                <UiSkeleton width="72%" height="12px" class="ml-auto" />
              </div>
            </div>
          </article>
        </div>
        <div v-else key="dashboard-weekly-content" class="mt-5 space-y-3 min-[1800px]:grid min-[1800px]:grid-cols-2 min-[1800px]:gap-2.5 min-[1800px]:space-y-0">
          <article
            v-for="item in weeklyStats?.dailyStats ?? []"
            :key="item.statDate"
            class="rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 px-4 py-3"
          >
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-slate-900">{{ formatDateLabel(item.statDate) }}</p>
                <p class="mt-1 text-xs text-slate-500">响应 {{ item.avgResponseTimeMs }} ms，满意度 {{ item.avgSatisfaction.toFixed(1) }}/5</p>
              </div>
              <div class="text-right">
                <p class="text-lg font-semibold text-slate-950">{{ formatNumber(item.totalInteractions) }}</p>
                <p class="text-xs text-slate-500">{{ formatNumber(item.uniqueVisitors) }} 访客</p>
              </div>
            </div>
          </article>
        </div>
        </Transition>
      </UiCard>

      <UiCard class="rounded-[8px] px-5 py-5 min-[1800px]:px-4 min-[1800px]:py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Latest Report</p>
            <h2 class="mt-2 text-xl font-semibold text-slate-950">AI 每日报告</h2>
          </div>
          <UiBadge variant="success">{{ latestReport?.aiGenerated === 1 ? "AI 生成" : "人工整理" }}</UiBadge>
        </div>

        <Transition name="admin-fade" mode="out-in">
        <div v-if="loading" key="dashboard-report-skeleton" class="mt-4 space-y-3 rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <article class="rounded-[8px] bg-white px-4 py-3">
              <UiSkeleton width="56px" height="12px" class="mb-3" />
              <UiSkeleton width="90px" height="32px" />
            </article>
            <article class="rounded-[8px] bg-white px-4 py-3">
              <UiSkeleton width="56px" height="12px" class="mb-3" />
              <UiSkeleton width="90px" height="32px" />
            </article>
          </div>
          <div>
            <UiSkeleton width="72px" height="14px" class="mb-3" />
            <UiSkeleton width="100%" height="12px" class="mb-2" />
            <UiSkeleton width="84%" height="12px" />
          </div>
          <div>
            <UiSkeleton width="72px" height="14px" class="mb-3" />
            <UiSkeleton width="100%" height="12px" class="mb-2" />
            <UiSkeleton width="92%" height="12px" class="mb-2" />
            <UiSkeleton width="78%" height="12px" />
          </div>
        </div>
        <div v-else-if="latestReport" key="dashboard-report-content" class="mt-4 space-y-3 rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 p-4">
          <div class="grid gap-3 sm:grid-cols-2">
            <article class="rounded-[8px] bg-white px-4 py-3">
              <p class="text-xs uppercase tracking-[0.16em] text-slate-400">互动量</p>
              <strong class="mt-2 block text-2xl font-semibold text-slate-950">{{ formatNumber(latestReport.totalInteractions) }}</strong>
            </article>
            <article class="rounded-[8px] bg-white px-4 py-3">
              <p class="text-xs uppercase tracking-[0.16em] text-slate-400">满意度</p>
              <strong class="mt-2 block text-2xl font-semibold text-slate-950">{{ formatPercent(latestReport.satisfactionRate) }}</strong>
            </article>
          </div>
          <div>
            <p class="text-sm font-medium text-slate-900">策略摘要</p>
            <p class="mt-2 text-sm leading-7 text-slate-600">{{ latestReport.suggestionSummary }}</p>
          </div>
          <div>
            <p class="text-sm font-medium text-slate-900">服务建议</p>
            <p class="mt-2 whitespace-pre-line text-sm leading-7 text-slate-600">{{ latestReport.serviceSuggest }}</p>
          </div>
        </div>
        </Transition>
      </UiCard>
    </section>

    <section class="grid gap-3 xl:grid-cols-3 min-[1800px]:grid-cols-[1.25fr_1fr_1fr]">
      <UiCard class="rounded-[8px] px-4 py-4 min-[1800px]:col-span-1">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Hot Questions</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-900">高频问题</h3>
          </div>
          <UiBadge variant="secondary">{{ hotQuestions?.totalCount ?? 0 }} 条</UiBadge>
        </div>

        <Transition name="admin-fade" mode="out-in">
        <div v-if="loading" key="dashboard-hot-skeleton" class="mt-5 space-y-3 min-[1800px]:grid min-[1800px]:grid-cols-2 min-[1800px]:gap-2.5 min-[1800px]:space-y-0">
          <article
            v-for="item in compactSkeletonItems"
            :key="`hot-skeleton-${item}`"
            class="rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 px-4 py-3"
          >
            <div class="flex items-start justify-between gap-4">
              <UiSkeleton width="74%" height="16px" />
              <UiSkeleton width="30px" height="16px" />
            </div>
            <UiSkeleton width="88px" height="12px" class="mt-3" />
          </article>
        </div>
        <div v-else key="dashboard-hot-content" class="mt-5 space-y-3 min-[1800px]:grid min-[1800px]:grid-cols-2 min-[1800px]:gap-2.5 min-[1800px]:space-y-0">
          <article
            v-for="item in hotQuestions?.hotQuestions ?? []"
            :key="item.question"
            class="rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 px-4 py-3"
          >
            <div class="flex items-start justify-between gap-4">
              <p class="text-sm font-medium text-slate-900">{{ item.question }}</p>
              <span class="shrink-0 text-sm text-slate-500">{{ item.count }}</span>
            </div>
            <p class="mt-2 text-xs text-emerald-600">帮助率 {{ formatRate(item.helpfulRate) }}</p>
          </article>
        </div>
        </Transition>
      </UiCard>

      <UiCard class="rounded-[8px] px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Focus Points</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-900">关注话题</h3>
          </div>
          <UiBadge variant="secondary">{{ focusPoints?.analysisDate ?? "--" }}</UiBadge>
        </div>

        <Transition name="admin-fade" mode="out-in">
        <div v-if="loading" key="dashboard-focus-skeleton" class="mt-5 space-y-3">
          <article
            v-for="item in compactSkeletonItems"
            :key="`focus-skeleton-${item}`"
            class="rounded-[8px] border border-[color:var(--color-border)] px-4 py-3"
          >
            <div class="flex items-center justify-between gap-4">
              <div class="min-w-0 flex-1">
                <UiSkeleton width="52%" height="16px" class="mb-2" />
                <UiSkeleton width="68px" height="12px" />
              </div>
              <div class="w-[72px]">
                <UiSkeleton width="100%" height="18px" class="mb-2" />
                <UiSkeleton width="70%" height="12px" class="ml-auto" />
              </div>
            </div>
          </article>
        </div>
        <div v-else key="dashboard-focus-content" class="mt-5 space-y-3">
          <article
            v-for="item in focusPoints?.focusPoints ?? []"
            :key="item.keyword"
            class="rounded-[8px] border border-[color:var(--color-border)] px-4 py-3"
          >
            <div class="flex items-center justify-between gap-4">
              <div>
                <p class="text-sm font-medium text-slate-900">{{ item.keyword }}</p>
                <p class="mt-1 text-xs text-slate-500">{{ sentimentTextMap[item.sentiment] }}情绪</p>
              </div>
              <div class="text-right">
                <strong class="text-base font-semibold text-slate-900">{{ formatRate(item.percentage) }}</strong>
                <p class="text-xs text-slate-500">{{ item.count }} 次</p>
              </div>
            </div>
          </article>
        </div>
        </Transition>
      </UiCard>

      <UiCard class="rounded-[8px] px-4 py-4">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Sentiment</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-900">情绪与满意度</h3>
          </div>
          <UiBadge variant="success">{{ sentimentTextMap[emotionTrend?.overallSentiment ?? "neutral"] }}</UiBadge>
        </div>

        <Transition name="admin-fade" mode="out-in">
        <div v-if="loading" key="dashboard-sentiment-skeleton" class="mt-5 space-y-3">
          <article class="rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 px-4 py-3">
            <UiSkeleton width="92px" height="14px" class="mb-3" />
            <UiSkeleton width="98px" height="36px" />
          </article>
          <article class="rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 px-4 py-3">
            <UiSkeleton width="92px" height="14px" class="mb-3" />
            <UiSkeleton width="98px" height="36px" class="mb-3" />
            <UiSkeleton width="78px" height="12px" />
          </article>
          <div class="space-y-2">
            <div
              v-for="item in compactSkeletonItems"
              :key="`sentiment-skeleton-${item}`"
              class="flex items-center justify-between rounded-[8px] bg-slate-50 px-4 py-3"
            >
              <UiSkeleton width="48px" height="14px" />
              <UiSkeleton width="54px" height="14px" />
            </div>
          </div>
        </div>
        <div v-else key="dashboard-sentiment-content" class="mt-5 space-y-3">
          <article class="rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 px-4 py-3">
            <p class="text-sm text-slate-500">平均正向占比</p>
            <strong class="mt-2 block text-3xl font-semibold text-slate-950">{{ formatRate(emotionTrend?.avgPositiveRate ?? 0) }}</strong>
          </article>
          <article class="rounded-[8px] border border-[color:var(--color-border)] bg-slate-50 px-4 py-3">
            <p class="text-sm text-slate-500">平均满意度</p>
            <strong class="mt-2 block text-3xl font-semibold text-slate-950">{{ satisfactionTrend?.avgSatisfaction?.toFixed(2) ?? "--" }}</strong>
            <p class="mt-2 text-xs text-slate-500">{{ directionTextMap[satisfactionTrend?.trendDirection ?? "stable"] }}</p>
          </article>
          <div class="space-y-2">
            <div
              v-for="item in emotionTrend?.trendData ?? []"
              :key="item.date"
              class="flex items-center justify-between rounded-[8px] bg-slate-50 px-4 py-3 text-sm"
            >
              <span class="text-slate-600">{{ formatDateLabel(item.date) }}</span>
              <span class="font-medium text-slate-900">{{ formatRate(item.positiveRate) }}</span>
            </div>
          </div>
        </div>
        </Transition>
      </UiCard>
    </section>
  </div>
</template>
