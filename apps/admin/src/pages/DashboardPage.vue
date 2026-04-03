<script setup lang="ts">
import { BarChart, LineChart, ScatterChart } from "echarts/charts";
import { GridComponent, TooltipComponent } from "echarts/components";
import { init, use, graphic, type ECharts } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiCard from "@/components/ui/UiCard.vue";
import {
  conversationPreview,
  hotQuestions,
  satisfactionTrend,
  serviceBreakdown,
  serviceOverview,
  serviceTimeline
} from "@/mocks/dashboard";

use([BarChart, LineChart, ScatterChart, GridComponent, TooltipComponent, CanvasRenderer]);

const trafficChartRef = ref<HTMLDivElement | null>(null);
const satisfactionChartRef = ref<HTMLDivElement | null>(null);

let trafficChart: ECharts | null = null;
let satisfactionChart: ECharts | null = null;
let trafficChartObserver: ResizeObserver | null = null;
let satisfactionChartObserver: ResizeObserver | null = null;

const timelineMax = Math.max(...serviceTimeline.map((item) => item.value));
const timelineAverage = Math.round(
  serviceTimeline.reduce((total, item) => total + item.value, 0) / serviceTimeline.length
);
const timelinePeak = serviceTimeline.reduce((peak, item) => (item.value > peak.value ? item : peak));

const satisfactionDateLabels = ["3月27日", "3月28日", "3月29日", "3月30日", "3月31日", "4月1日", "4月2日"];
const bestSatisfactionIndex = satisfactionTrend.reduce(
  (bestIndex, item, index, source) => (item.value > source[bestIndex].value ? index : bestIndex),
  0
);
const minSatisfactionValue = Math.min(...satisfactionTrend.map((item) => item.value));
const maxSatisfactionValue = Math.max(...satisfactionTrend.map((item) => item.value));

const getTrendStroke = (delta: number) => {
  if (delta > 0.5) return "#16a34a";
  if (delta >= 0) return "#2563eb";
  if (delta > -0.5) return "#f59e0b";
  return "#dc2626";
};

const satisfactionSeries = computed(() => {
  const labels = satisfactionDateLabels;
  const values = satisfactionTrend.map((item) => item.value);

  const areaSeries = {
    type: "line",
    data: values,
    smooth: 0.24,
    symbol: "none",
    lineStyle: { width: 0, color: "transparent" },
    areaStyle: {
      color: new graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: "rgba(59, 130, 246, 0.14)" },
        { offset: 1, color: "rgba(59, 130, 246, 0.02)" }
      ])
    },
    z: 1
  };

  const segmentSeries = labels.slice(0, -1).map((label, index) => {
    const delta = Number((values[index + 1] - values[index]).toFixed(1));
    const segmentData = labels.map((_, pointIndex) => {
      if (pointIndex === index) return values[index];
      if (pointIndex === index + 1) return values[index + 1];
      return null;
    });

    return {
      name: `${label}-${labels[index + 1]}`,
      type: "line",
      data: segmentData,
      connectNulls: false,
      symbol: "none",
      lineStyle: {
        width: 4,
        color: getTrendStroke(delta),
        cap: "round",
        join: "round"
      },
      emphasis: { disabled: true },
      z: 3
    };
  });

  const pointSeries = {
    type: "scatter",
    data: values,
    symbolSize: 4.5,
    itemStyle: {
      color: "#ffffff",
      borderColor: "#64748b",
      borderWidth: 1.1
    },
    emphasis: { scale: false },
    z: 4
  };

  return [areaSeries, ...segmentSeries, pointSeries];
});

const renderTrafficChart = () => {
  if (!trafficChartRef.value) return;

  if (!trafficChart) {
    trafficChart = init(trafficChartRef.value);
  }

  trafficChart.setOption({
    animationDuration: 450,
    animationEasing: "cubicOut",
    grid: {
      top: 16,
      right: 8,
      bottom: 28,
      left: 8,
      containLabel: true
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      axisPointer: {
        type: "shadow",
        shadowStyle: {
          color: "rgba(148, 163, 184, 0.08)"
        }
      },
      formatter: (params: Array<{ axisValueLabel: string; data: number }>) => {
        const value = params[0]?.data ?? 0;
        return `${params[0]?.axisValueLabel ?? ""}<br/>服务请求 ${value} 次`;
      }
    },
    xAxis: {
      type: "category",
      data: serviceTimeline.map((item) => item.label),
      axisLine: {
        lineStyle: { color: "#cbd5e1" }
      },
      axisTick: { show: false },
      axisLabel: {
        color: "#94a3b8",
        fontSize: 11,
        margin: 12
      }
    },
    yAxis: {
      type: "value",
      min: 0,
      max: Math.ceil(timelineMax / 10) * 10 + 10,
      splitNumber: 4,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        lineStyle: {
          color: "#e2e8f0",
          type: "dashed"
        }
      }
    },
    series: [
      {
        type: "bar",
        data: serviceTimeline.map((item) => item.value),
        barWidth: 18,
        barCategoryGap: "32%",
        itemStyle: {
          borderRadius: [10, 10, 4, 4],
          color: new graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "#93c5fd" },
            { offset: 0.45, color: "#60a5fa" },
            { offset: 1, color: "#2563eb" }
          ])
        },
        label: {
          show: true,
          position: "top",
          color: "#334155",
          fontSize: 11,
          fontWeight: 600,
          distance: 8
        },
        emphasis: {
          itemStyle: {
            color: new graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: "#60a5fa" },
              { offset: 0.55, color: "#3b82f6" },
              { offset: 1, color: "#1d4ed8" }
            ])
          }
        },
        z: 3
      }
    ]
  });
};

const renderSatisfactionChart = () => {
  if (!satisfactionChartRef.value) return;

  if (!satisfactionChart) {
    satisfactionChart = init(satisfactionChartRef.value);
  }

  satisfactionChart.setOption({
    animationDuration: 500,
    animationEasing: "cubicOut",
    grid: {
      top: 18,
      right: 10,
      bottom: 20,
      left: 10,
      containLabel: true
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      axisPointer: {
        type: "line",
        lineStyle: { color: "rgba(148, 163, 184, 0.45)" }
      },
      formatter: (params: Array<{ axisValueLabel: string; data: number | null }>) => {
        const value = params.find((item) => item.data !== null)?.data ?? null;
        return `${params[0]?.axisValueLabel ?? ""}<br/>满意度 ${value ?? "--"}%`;
      }
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: satisfactionDateLabels,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: "#94a3b8",
        fontSize: 11,
        margin: 14
      }
    },
    yAxis: {
      type: "value",
      min: minSatisfactionValue - 0.8,
      max: maxSatisfactionValue + 0.8,
      splitNumber: 3,
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { show: false },
      splitLine: {
        lineStyle: {
          color: "#e2e8f0",
          type: "dashed"
        }
      }
    },
    series: satisfactionSeries.value
  });
};

onMounted(async () => {
  await nextTick();
  renderTrafficChart();
  renderSatisfactionChart();

  if (trafficChartRef.value) {
    trafficChartObserver = new ResizeObserver(() => trafficChart?.resize());
    trafficChartObserver.observe(trafficChartRef.value);
  }

  if (satisfactionChartRef.value) {
    satisfactionChartObserver = new ResizeObserver(() => satisfactionChart?.resize());
    satisfactionChartObserver.observe(satisfactionChartRef.value);
  }
});

onBeforeUnmount(() => {
  trafficChartObserver?.disconnect();
  trafficChartObserver = null;
  trafficChart?.dispose();
  trafficChart = null;

  satisfactionChartObserver?.disconnect();
  satisfactionChartObserver = null;
  satisfactionChart?.dispose();
  satisfactionChart = null;
});

const statusVariantMap = {
  完成: "success",
  讲解中: "info",
  待复核: "secondary"
} as const;
</script>

<template>
  <div class="space-y-5">
    <section class="flex flex-col gap-3 rounded-[28px] border border-[color:var(--color-border)] bg-white px-6 py-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">Operations Overview</p>
          <h1 class="mt-3 text-[30px] font-semibold tracking-tight text-slate-950">核心运营数据总览</h1>
          <p class="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
            聚焦当日与本周服务人次、热门问答、游客满意度趋势以及服务结构等核心运营数据。
          </p>
        </div>
        <UiBadge variant="secondary">今日</UiBadge>
      </div>

      <div class="grid gap-4 xl:grid-cols-4">
        <article
          v-for="metric in serviceOverview"
          :key="metric.label"
          class="rounded-[24px] border border-[color:var(--color-border)] bg-slate-50 px-5 py-5"
        >
          <p class="text-sm text-slate-500">{{ metric.label }}</p>
          <strong class="mt-4 block text-[34px] font-semibold tracking-tight text-slate-950">{{ metric.value }}</strong>
          <p class="mt-3 text-xs text-slate-400">{{ metric.hint }}</p>
        </article>
      </div>
    </section>

    <section class="grid items-stretch gap-4 xl:grid-cols-2">
      <UiCard class="rounded-[28px] px-6 py-6">
        <div class="flex h-full min-h-[440px] flex-col">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Traffic Trend</p>
              <h2 class="mt-2 text-xl font-semibold text-slate-950">今日服务分时</h2>
              <p class="mt-2 text-sm text-slate-500">覆盖全天主要时段的服务流量走势，方便识别高峰与回落区间。</p>
            </div>
            <UiBadge variant="secondary">今日</UiBadge>
          </div>

          <div class="mt-6 flex-1 rounded-[24px] border border-[color:var(--color-border)] bg-slate-50 px-5 py-5">
            <div class="grid gap-3 sm:grid-cols-3">
              <article class="rounded-[20px] bg-white px-4 py-4">
                <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Peak Hour</p>
                <strong class="mt-3 block text-[30px] font-semibold text-slate-950">{{ timelinePeak.label }}</strong>
                <p class="mt-2 text-sm text-slate-500">{{ timelinePeak.value }} 次服务请求</p>
              </article>
              <article class="rounded-[20px] bg-white px-4 py-4">
                <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Average</p>
                <strong class="mt-3 block text-[30px] font-semibold text-slate-950">{{ timelineAverage }}</strong>
                <p class="mt-2 text-sm text-slate-500">分时平均服务量</p>
              </article>
              <article class="rounded-[20px] bg-white px-4 py-4">
                <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Coverage</p>
                <strong class="mt-3 block text-[30px] font-semibold text-slate-950">{{ serviceTimeline.length }}</strong>
                <p class="mt-2 text-sm text-slate-500">全天监测时段</p>
              </article>
            </div>

            <div class="mt-4 rounded-[22px] bg-white px-4 py-5">
              <div ref="trafficChartRef" class="h-[300px] w-full"></div>
            </div>
          </div>
        </div>
      </UiCard>

      <UiCard class="rounded-[28px] px-6 py-6">
        <div class="flex h-full min-h-[440px] flex-col">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Satisfaction Trend</p>
              <h2 class="mt-2 text-xl font-semibold text-slate-950">游客满意度趋势</h2>
              <p class="mt-2 text-sm text-slate-500">呈现最近一周满意度变化，观察服务体验的稳定性与波动幅度。</p>
            </div>
            <UiBadge variant="secondary">本周</UiBadge>
          </div>

          <div class="mt-6 flex-1 rounded-[24px] border border-[color:var(--color-border)] bg-slate-50 px-5 py-5">
            <div class="grid gap-3 sm:grid-cols-3">
              <article class="rounded-[20px] bg-white px-4 py-4">
                <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Week Avg</p>
                <strong class="mt-3 block text-[30px] font-semibold text-slate-950">95.5%</strong>
                <p class="mt-2 text-sm text-emerald-600">较上周 +1.8%</p>
              </article>
              <article class="rounded-[20px] bg-white px-4 py-4">
                <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Best Day</p>
                <strong class="mt-3 block text-[30px] font-semibold text-slate-950">
                  {{ satisfactionDateLabels[bestSatisfactionIndex] }}
                </strong>
                <p class="mt-2 text-sm text-slate-500">
                  {{ satisfactionTrend[bestSatisfactionIndex]?.value ?? "--" }}% 满意度
                </p>
              </article>
              <article class="rounded-[20px] bg-white px-4 py-4">
                <p class="text-xs uppercase tracking-[0.16em] text-slate-400">Range</p>
                <strong class="mt-3 block text-[30px] font-semibold text-slate-950">3.0%</strong>
                <p class="mt-2 text-sm text-slate-500">本周波动范围</p>
              </article>
            </div>

            <div class="mt-4 rounded-[22px] bg-white px-4 py-5">
              <div ref="satisfactionChartRef" class="h-[300px] w-full"></div>
            </div>
          </div>
        </div>
      </UiCard>
    </section>

    <section class="grid gap-4 xl:grid-cols-[1fr_0.92fr_0.92fr]">
      <UiCard class="rounded-[28px] px-5 py-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Hot Questions</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-900">热门问答</h3>
          </div>
          <UiBadge variant="secondary">Top 5</UiBadge>
        </div>

        <div class="mt-6 space-y-3">
          <article
            v-for="item in hotQuestions"
            :key="item.rank"
            class="flex items-center justify-between gap-4 rounded-3xl border border-[color:var(--color-border)] bg-slate-50 px-4 py-4"
          >
            <div class="flex min-w-0 items-start gap-4">
              <span class="text-sm font-semibold text-slate-400">{{ item.rank }}</span>
              <p class="truncate text-sm font-medium text-slate-800">{{ item.question }}</p>
            </div>
            <span class="shrink-0 text-sm text-slate-500">{{ item.count }} 次</span>
          </article>
        </div>
      </UiCard>

      <UiCard class="rounded-[28px] px-5 py-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Service Breakdown</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-900">服务结构占比</h3>
          </div>
          <UiBadge variant="secondary">今日</UiBadge>
        </div>

        <div class="mt-6 space-y-3">
          <article
            v-for="item in serviceBreakdown"
            :key="item.label"
            class="rounded-3xl border border-[color:var(--color-border)] px-4 py-4"
          >
            <div class="flex items-center justify-between gap-4">
              <span class="text-sm text-slate-500">{{ item.label }}</span>
              <strong class="text-lg font-semibold text-slate-900">{{ item.value }}</strong>
            </div>
          </article>
        </div>
      </UiCard>

      <UiCard class="rounded-[28px] px-5 py-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Service Timeline</p>
            <h3 class="mt-2 text-lg font-semibold text-slate-900">实时服务记录</h3>
          </div>
          <UiBadge variant="info">Live</UiBadge>
        </div>

        <div class="mt-6 space-y-3">
          <article
            v-for="item in conversationPreview"
            :key="`${item.time}-${item.user}`"
            class="flex items-center justify-between gap-4 rounded-3xl border border-[color:var(--color-border)] px-4 py-4"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-3">
                <span class="text-sm font-medium text-slate-900">{{ item.user }}</span>
                <span class="text-xs text-slate-400">{{ item.time }}</span>
              </div>
              <p class="mt-2 truncate text-sm text-slate-500">{{ item.topic }}</p>
            </div>
            <UiBadge :variant="statusVariantMap[item.status as keyof typeof statusVariantMap] ?? 'secondary'">
              {{ item.status }}
            </UiBadge>
          </article>
        </div>
      </UiCard>
    </section>
  </div>
</template>
