const isFiniteNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export const formatNumber = (value: number | undefined | null) =>
  (isFiniteNumber(value) ? new Intl.NumberFormat("zh-CN").format(value) : "--");

export const formatPercent = (value: number | undefined | null, digits = 1) =>
  (isFiniteNumber(value) ? `${value.toFixed(digits)}%` : "--");

export const formatRate = (value: number | undefined | null, digits = 1) =>
  (isFiniteNumber(value) ? `${(value * 100).toFixed(digits)}%` : "--");

export const formatDateLabel = (value: string) =>
  new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric"
  }).format(new Date(value));

export const sentimentTextMap = {
  positive: "正向",
  neutral: "中性",
  negative: "负向"
} as const;

export const directionTextMap = {
  up: "持续上升",
  stable: "基本稳定",
  down: "轻微回落",
  rising: "稳步走高",
  falling: "需要关注"
} as const;
