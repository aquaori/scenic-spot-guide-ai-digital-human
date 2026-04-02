export const serviceOverview = [
  { label: "今日服务人次", value: "2,846", hint: "较昨日 +12.4%" },
  { label: "本周服务人次", value: "18,392", hint: "周累计稳定增长" },
  { label: "今日路线推荐", value: "1,092", hint: "推荐触达率 72%" },
  { label: "平均满意度", value: "96.4%", hint: "较上周 +1.8%" }
] as const;

export const serviceTimeline = [
  { label: "08:00", value: 24 },
  { label: "09:00", value: 31 },
  { label: "10:00", value: 45 },
  { label: "11:00", value: 58 },
  { label: "12:00", value: 72 },
  { label: "13:00", value: 81 },
  { label: "14:00", value: 96 },
  { label: "15:00", value: 88 },
  { label: "16:00", value: 76 },
  { label: "17:00", value: 64 },
  { label: "18:00", value: 52 },
  { label: "19:00", value: 38 }
] as const;

export const hotQuestions = [
  { rank: "01", question: "两小时怎么安排路线最顺？", count: 328 },
  { rank: "02", question: "适合老人和孩子一起走哪条线？", count: 274 },
  { rank: "03", question: "傍晚最适合拍照的点位是哪里？", count: 231 },
  { rank: "04", question: "先看风景还是先听讲解更合理？", count: 198 },
  { rank: "05", question: "下雨天有哪些室内点位可替代？", count: 167 }
] as const;

export const satisfactionTrend = [
  { label: "周四", value: 93.8 },
  { label: "周五", value: 94.6 },
  { label: "周六", value: 95.1 },
  { label: "周日", value: 95.9 },
  { label: "周一", value: 96.4 },
  { label: "周二", value: 96.1 },
  { label: "周三", value: 96.8 }
] as const;

export const serviceBreakdown = [
  { label: "路线推荐请求", value: "41%" },
  { label: "景点讲解请求", value: "33%" },
  { label: "多轮追问占比", value: "18%" },
  { label: "人工接管占比", value: "8%" }
] as const;

export const conversationPreview = [
  { time: "14:12", user: "游客 A-17", topic: "两小时路线推荐", status: "完成" },
  { time: "14:18", user: "游客 B-03", topic: "老人友好版路线", status: "讲解中" },
  { time: "14:22", user: "游客 A-05", topic: "傍晚拍照建议", status: "完成" },
  { time: "14:26", user: "游客 C-09", topic: "景点历史提问", status: "待复核" }
] as const;

export const avatarProfiles = [
  { name: "青岚导览形象", tags: ["亲和讲解", "景区文化版", "普通话女声"] },
  { name: "山野导览形象", tags: ["自然语气", "游客问答", "轻量推荐"] },
  { name: "夜游导览形象", tags: ["夜景讲解", "路线推荐", "舒缓语调"] }
] as const;

export const knowledgeStats = [
  { label: "知识条目总数", value: "1,286" },
  { label: "接入文档数量", value: "18" },
  { label: "知识命中率", value: "91.8%" }
] as const;
