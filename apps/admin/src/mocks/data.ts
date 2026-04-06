import type {
  DailyReport,
  DailyReportDetail,
  DigitalHuman,
  EmotionTrend,
  FaqItem,
  FocusPoints,
  HotQuestionStats,
  KnowledgeDoc,
  SatisfactionTrend,
  Scenic,
  TodayOverview,
  WeeklyStats
} from "@/types/admin";

export const scenicList: Scenic[] = [
  {
    id: 1,
    scenicName: "黄山风景区",
    scenicAddress: "安徽省黄山市黄山区汤口镇",
    scenicDesc: "以迎客松、云海和奇峰怪石为核心体验的世界文化与自然双遗产景区。",
    openTime: "06:00-17:30",
    ticketInfo: "旺季 190 元，淡季 150 元，索道另计。",
    contactPhone: "0559-5561111",
    officialWebsite: "https://www.huangshan.com.cn",
    coverImage: "/upload/scenic/huangshan.jpg",
    gpsLatitude: 30.134567,
    gpsLongitude: 118.16789,
    starLevel: "5A",
    status: 1,
    sort: 1,
    createTime: "2026-04-01 10:30:00",
    updateTime: "2026-04-05 09:20:00"
  },
  {
    id: 2,
    scenicName: "宏村景区",
    scenicAddress: "安徽省黄山市黟县宏村镇",
    scenicDesc: "以徽派古村落、南湖月沼和夜游讲解为特色的文化型景区。",
    openTime: "07:30-20:30",
    ticketInfo: "门票 94 元，学生票 47 元。",
    contactPhone: "0559-5541158",
    officialWebsite: "https://www.hongcun.com.cn",
    coverImage: "/upload/scenic/hongcun.jpg",
    gpsLatitude: 29.92974,
    gpsLongitude: 117.9994,
    starLevel: "5A",
    status: 1,
    sort: 2,
    createTime: "2026-04-01 11:20:00",
    updateTime: "2026-04-05 09:20:00"
  }
];

export const digitalHumans: DigitalHuman[] = [
  {
    id: 1,
    scenicId: 1,
    humanName: "小美导览官",
    appearanceConfig: JSON.stringify({ model: "qwen-avatar-v2", costume: "mountain-blue", enhancement: "4k-face" }),
    voiceConfig: JSON.stringify({ voice: "xiaomei", speed: 1, pitch: 1, tone: "warm" }),
    lipSync: 1,
    defaultGreeting: "欢迎来到黄山风景区，我可以为你提供路线、购票、索道和天气等信息。",
    avatarImage: "/upload/avatar/xiaomei.png",
    isDefault: 1,
    creator: 1,
    updater: 1,
    createTime: "2026-04-02 09:00:00",
    updateTime: "2026-04-05 14:00:00"
  },
  {
    id: 2,
    scenicId: 1,
    humanName: "云谷讲解员",
    appearanceConfig: JSON.stringify({ model: "qwen-avatar-v2", costume: "peak-white", enhancement: "expressive" }),
    voiceConfig: JSON.stringify({ voice: "yunhai", speed: 0.95, pitch: 0.92, tone: "calm" }),
    lipSync: 1,
    defaultGreeting: "您好，这里是黄山游客智能服务台，路线和排队情况都可以直接问我。",
    avatarImage: "/upload/avatar/yungu.png",
    isDefault: 0,
    creator: 1,
    updater: 1,
    createTime: "2026-04-02 09:00:00",
    updateTime: "2026-04-05 14:00:00"
  },
  {
    id: 3,
    scenicId: 2,
    humanName: "徽州小婉",
    appearanceConfig: JSON.stringify({ model: "qwen-avatar-lite", costume: "huizhou-ink", enhancement: "soft-light" }),
    voiceConfig: JSON.stringify({ voice: "xiaowan", speed: 1.02, pitch: 1.05, tone: "gentle" }),
    lipSync: 0,
    defaultGreeting: "欢迎来到宏村，我可以帮你介绍打卡点、夜游路线和周边美食。",
    avatarImage: "/upload/avatar/xiaowan.png",
    isDefault: 1,
    creator: 1,
    updater: 1,
    createTime: "2026-04-02 09:00:00",
    updateTime: "2026-04-05 14:00:00"
  }
];

export const knowledgeDocs: KnowledgeDoc[] = [
  {
    id: 1,
    scenicId: 1,
    scenicName: "黄山风景区",
    docTitle: "黄山索道与步行路线联动指引",
    docType: "markdown",
    docContent: "# 黄山索道与步行路线联动指引\n\n覆盖云谷、玉屏、太平索道和主峰路线建议。",
    docSummary: "整理索道开放时间、步行耗时和天气变化下的推荐换乘方案。",
    wordCount: 5280,
    chunkCount: 11,
    vectorized: 1,
    viewCount: 231,
    creatorName: "运营中心",
    status: 1,
    createTime: "2026-04-01 09:10:00",
    updateTime: "2026-04-05 10:00:00"
  },
  {
    id: 2,
    scenicId: 1,
    scenicName: "黄山风景区",
    docTitle: "节假日游客高峰应答手册",
    docType: "markdown",
    docContent: "# 节假日游客高峰应答手册\n\n重点覆盖排队、分流、天气和安全提醒。",
    docSummary: "面向高峰时段问答场景设计的统一话术和分流建议。",
    wordCount: 3660,
    chunkCount: 8,
    vectorized: 0,
    viewCount: 118,
    creatorName: "知识运营",
    status: 1,
    createTime: "2026-04-02 13:20:00",
    updateTime: "2026-04-05 11:10:00"
  },
  {
    id: 3,
    scenicId: 2,
    scenicName: "宏村景区",
    docTitle: "宏村夜游和摄影点位说明",
    docType: "markdown",
    docContent: "# 宏村夜游和摄影点位说明\n\n包含南湖、月沼、巷道和高峰时段建议。",
    docSummary: "帮助数字人回答夜游、拍照时机和路线规划相关问题。",
    wordCount: 2890,
    chunkCount: 6,
    vectorized: 1,
    viewCount: 96,
    creatorName: "内容组",
    status: 1,
    createTime: "2026-04-02 17:20:00",
    updateTime: "2026-04-05 11:10:00"
  }
];

export const faqItems: FaqItem[] = [
  {
    id: 1,
    scenicId: 1,
    question: "黄山索道几点开始运营？",
    questionKeywords: "黄山,索道,运营时间,开门",
    answer: "云谷、玉屏、太平索道通常随景区开园后陆续运行，恶劣天气会临时调整，建议以当天公告为准。",
    answerType: "text",
    spotId: null,
    similarQuestions: JSON.stringify(["黄山索道开了吗", "黄山索道营业时间是什么时候"]),
    clickCount: 324,
    helpfulCount: 281,
    unhelpfulCount: 12,
    vectorId: "vec_faq_001",
    similarityThreshold: 0.85,
    creator: 1,
    updater: 1,
    status: 1,
    createTime: "2026-04-01 10:00:00",
    updateTime: "2026-04-05 15:30:00"
  },
  {
    id: 2,
    scenicId: 1,
    question: "下雨天适合上山吗？",
    questionKeywords: "黄山,下雨,天气,登山",
    answer: "小雨情况下可以游览，但请优先确认栈道和索道公告，注意防滑、保暖和可见度变化。",
    answerType: "text",
    spotId: null,
    similarQuestions: JSON.stringify(["黄山雨天还能玩吗", "下雨能不能去黄山"]),
    clickCount: 208,
    helpfulCount: 164,
    unhelpfulCount: 19,
    vectorId: "vec_faq_002",
    similarityThreshold: 0.82,
    creator: 1,
    updater: 1,
    status: 1,
    createTime: "2026-04-01 11:00:00",
    updateTime: "2026-04-05 15:30:00"
  },
  {
    id: 3,
    scenicId: 1,
    question: "山上住宿怎么安排更合理？",
    questionKeywords: "黄山,住宿,酒店,路线",
    answer: "如果计划看日出，建议优先选择北海或白云片区住宿，并提前结合次日线路安排索道上下山。",
    answerType: "text",
    spotId: null,
    similarQuestions: JSON.stringify(["黄山住哪看日出方便", "黄山住宿怎么选"]),
    clickCount: 173,
    helpfulCount: 140,
    unhelpfulCount: 8,
    vectorId: "vec_faq_003",
    similarityThreshold: 0.8,
    creator: 1,
    updater: 1,
    status: 1,
    createTime: "2026-04-01 11:20:00",
    updateTime: "2026-04-05 15:30:00"
  },
  {
    id: 4,
    scenicId: 2,
    question: "宏村夜游几点开始比较合适？",
    questionKeywords: "宏村,夜游,时间,拍照",
    answer: "夏季建议 18:30 后开始，能兼顾落日与亮灯时段；节假日请尽量避开 19:00-20:00 的主拥堵时间。",
    answerType: "text",
    spotId: null,
    similarQuestions: JSON.stringify(["宏村夜游什么时候去最好", "宏村晚上几点拍照好看"]),
    clickCount: 145,
    helpfulCount: 121,
    unhelpfulCount: 6,
    vectorId: "vec_faq_004",
    similarityThreshold: 0.78,
    creator: 1,
    updater: 1,
    status: 1,
    createTime: "2026-04-01 12:00:00",
    updateTime: "2026-04-05 15:30:00"
  }
];

export const todayOverviewByScenic: Record<number, TodayOverview> = {
  1: {
    todayVisitors: 1250,
    todayInteractions: 3580,
    todayQuestions: 890,
    satisfactionRate: 92.5,
    peakHour: "10:00-11:00",
    activeGuides: 5
  },
  2: {
    todayVisitors: 840,
    todayInteractions: 2160,
    todayQuestions: 540,
    satisfactionRate: 94.2,
    peakHour: "19:00-20:00",
    activeGuides: 3
  }
};

export const weeklyStatsByScenic: Record<number, WeeklyStats> = {
  1: {
    dailyStats: [
      { statDate: "2026-03-31", totalInteractions: 420, uniqueVisitors: 165, avgResponseTimeMs: 236, avgSatisfaction: 4.4, textCount: 266, voiceCount: 154, createTime: "2026-03-31 23:00:00" },
      { statDate: "2026-04-01", totalInteractions: 468, uniqueVisitors: 182, avgResponseTimeMs: 229, avgSatisfaction: 4.5, textCount: 284, voiceCount: 184, createTime: "2026-04-01 23:00:00" },
      { statDate: "2026-04-02", totalInteractions: 503, uniqueVisitors: 201, avgResponseTimeMs: 224, avgSatisfaction: 4.6, textCount: 301, voiceCount: 202, createTime: "2026-04-02 23:00:00" },
      { statDate: "2026-04-03", totalInteractions: 545, uniqueVisitors: 223, avgResponseTimeMs: 218, avgSatisfaction: 4.6, textCount: 326, voiceCount: 219, createTime: "2026-04-03 23:00:00" },
      { statDate: "2026-04-04", totalInteractions: 572, uniqueVisitors: 246, avgResponseTimeMs: 214, avgSatisfaction: 4.7, textCount: 332, voiceCount: 240, createTime: "2026-04-04 23:00:00" },
      { statDate: "2026-04-05", totalInteractions: 611, uniqueVisitors: 264, avgResponseTimeMs: 209, avgSatisfaction: 4.8, textCount: 350, voiceCount: 261, createTime: "2026-04-05 23:00:00" },
      { statDate: "2026-04-06", totalInteractions: 461, uniqueVisitors: 188, avgResponseTimeMs: 212, avgSatisfaction: 4.7, textCount: 275, voiceCount: 186, createTime: "2026-04-06 23:00:00" }
    ],
    summary: {
      totalInteractions: 3580,
      uniqueVisitors: 1469,
      avgResponseTimeMs: 220,
      avgSatisfaction: 4.61,
      textCount: 2134,
      voiceCount: 1446,
      daysWithData: 7
    }
  },
  2: {
    dailyStats: [
      { statDate: "2026-03-31", totalInteractions: 280, uniqueVisitors: 122, avgResponseTimeMs: 216, avgSatisfaction: 4.5, textCount: 182, voiceCount: 98, createTime: "2026-03-31 23:00:00" },
      { statDate: "2026-04-01", totalInteractions: 295, uniqueVisitors: 128, avgResponseTimeMs: 214, avgSatisfaction: 4.6, textCount: 190, voiceCount: 105, createTime: "2026-04-01 23:00:00" },
      { statDate: "2026-04-02", totalInteractions: 301, uniqueVisitors: 130, avgResponseTimeMs: 210, avgSatisfaction: 4.6, textCount: 194, voiceCount: 107, createTime: "2026-04-02 23:00:00" },
      { statDate: "2026-04-03", totalInteractions: 322, uniqueVisitors: 143, avgResponseTimeMs: 208, avgSatisfaction: 4.7, textCount: 206, voiceCount: 116, createTime: "2026-04-03 23:00:00" },
      { statDate: "2026-04-04", totalInteractions: 338, uniqueVisitors: 152, avgResponseTimeMs: 205, avgSatisfaction: 4.7, textCount: 215, voiceCount: 123, createTime: "2026-04-04 23:00:00" },
      { statDate: "2026-04-05", totalInteractions: 350, uniqueVisitors: 160, avgResponseTimeMs: 202, avgSatisfaction: 4.8, textCount: 224, voiceCount: 126, createTime: "2026-04-05 23:00:00" },
      { statDate: "2026-04-06", totalInteractions: 274, uniqueVisitors: 116, avgResponseTimeMs: 204, avgSatisfaction: 4.7, textCount: 170, voiceCount: 104, createTime: "2026-04-06 23:00:00" }
    ],
    summary: {
      totalInteractions: 2160,
      uniqueVisitors: 951,
      avgResponseTimeMs: 208,
      avgSatisfaction: 4.66,
      textCount: 1381,
      voiceCount: 779,
      daysWithData: 7
    }
  }
};

export const hotQuestionStatsByScenic: Record<number, HotQuestionStats> = {
  1: {
    hotQuestions: [
      { question: "黄山索道几点开始运营？", count: 256, helpfulRate: 0.95 },
      { question: "下雨天适合上山吗？", count: 198, helpfulRate: 0.91 },
      { question: "山上住宿怎么安排更合理？", count: 162, helpfulRate: 0.93 },
      { question: "迎客松需要走多久？", count: 149, helpfulRate: 0.9 },
      { question: "日出观景点怎么选？", count: 138, helpfulRate: 0.94 }
    ],
    totalCount: 5,
    lastUpdated: "2026-04-06 16:20:00"
  },
  2: {
    hotQuestions: [
      { question: "宏村夜游几点开始比较合适？", count: 143, helpfulRate: 0.94 },
      { question: "月沼拍照怎么避开人群？", count: 126, helpfulRate: 0.9 },
      { question: "宏村停车方便吗？", count: 104, helpfulRate: 0.88 },
      { question: "附近还有哪些徽州村落值得去？", count: 97, helpfulRate: 0.92 },
      { question: "晚上有哪些讲解活动？", count: 81, helpfulRate: 0.9 }
    ],
    totalCount: 5,
    lastUpdated: "2026-04-06 16:20:00"
  }
};

export const emotionTrendByScenic: Record<number, EmotionTrend> = {
  1: {
    trendData: [
      { date: "2026-03-31", positiveRate: 0.81, neutralRate: 0.13, negativeRate: 0.06, sampleCount: 185 },
      { date: "2026-04-01", positiveRate: 0.83, neutralRate: 0.11, negativeRate: 0.06, sampleCount: 201 },
      { date: "2026-04-02", positiveRate: 0.84, neutralRate: 0.1, negativeRate: 0.06, sampleCount: 220 },
      { date: "2026-04-03", positiveRate: 0.86, neutralRate: 0.09, negativeRate: 0.05, sampleCount: 234 },
      { date: "2026-04-04", positiveRate: 0.88, neutralRate: 0.08, negativeRate: 0.04, sampleCount: 248 },
      { date: "2026-04-05", positiveRate: 0.87, neutralRate: 0.08, negativeRate: 0.05, sampleCount: 255 },
      { date: "2026-04-06", positiveRate: 0.85, neutralRate: 0.09, negativeRate: 0.06, sampleCount: 230 }
    ],
    avgPositiveRate: 0.849,
    avgNegativeRate: 0.053,
    overallSentiment: "positive"
  },
  2: {
    trendData: [
      { date: "2026-03-31", positiveRate: 0.84, neutralRate: 0.11, negativeRate: 0.05, sampleCount: 120 },
      { date: "2026-04-01", positiveRate: 0.85, neutralRate: 0.1, negativeRate: 0.05, sampleCount: 131 },
      { date: "2026-04-02", positiveRate: 0.86, neutralRate: 0.1, negativeRate: 0.04, sampleCount: 135 },
      { date: "2026-04-03", positiveRate: 0.87, neutralRate: 0.09, negativeRate: 0.04, sampleCount: 141 },
      { date: "2026-04-04", positiveRate: 0.89, neutralRate: 0.08, negativeRate: 0.03, sampleCount: 148 },
      { date: "2026-04-05", positiveRate: 0.88, neutralRate: 0.08, negativeRate: 0.04, sampleCount: 152 },
      { date: "2026-04-06", positiveRate: 0.87, neutralRate: 0.08, negativeRate: 0.05, sampleCount: 136 }
    ],
    avgPositiveRate: 0.866,
    avgNegativeRate: 0.043,
    overallSentiment: "positive"
  }
};

export const focusPointsByScenic: Record<number, FocusPoints> = {
  1: {
    focusPoints: [
      { keyword: "索道排队", count: 456, sentiment: "neutral", percentage: 0.35 },
      { keyword: "天气变化", count: 234, sentiment: "neutral", percentage: 0.18 },
      { keyword: "日出路线", count: 188, sentiment: "positive", percentage: 0.14 },
      { keyword: "住宿预订", count: 165, sentiment: "positive", percentage: 0.13 },
      { keyword: "登山强度", count: 138, sentiment: "negative", percentage: 0.11 },
      { keyword: "停车换乘", count: 124, sentiment: "neutral", percentage: 0.09 }
    ],
    totalKeywords: 6,
    analysisDate: "2026-04-06"
  },
  2: {
    focusPoints: [
      { keyword: "夜游时间", count: 201, sentiment: "positive", percentage: 0.29 },
      { keyword: "摄影点位", count: 189, sentiment: "positive", percentage: 0.27 },
      { keyword: "停车接驳", count: 112, sentiment: "negative", percentage: 0.16 },
      { keyword: "徽州美食", count: 98, sentiment: "positive", percentage: 0.14 },
      { keyword: "讲解服务", count: 57, sentiment: "neutral", percentage: 0.08 },
      { keyword: "购票入园", count: 44, sentiment: "neutral", percentage: 0.06 }
    ],
    totalKeywords: 6,
    analysisDate: "2026-04-06"
  }
};

export const satisfactionTrendByScenic: Record<number, SatisfactionTrend> = {
  1: {
    satisfactionTrend: [
      { date: "2026-03-31", satisfactionScore: 4.4, feedbackCount: 102 },
      { date: "2026-04-01", satisfactionScore: 4.5, feedbackCount: 118 },
      { date: "2026-04-02", satisfactionScore: 4.6, feedbackCount: 124 },
      { date: "2026-04-03", satisfactionScore: 4.6, feedbackCount: 138 },
      { date: "2026-04-04", satisfactionScore: 4.7, feedbackCount: 152 },
      { date: "2026-04-05", satisfactionScore: 4.8, feedbackCount: 160 },
      { date: "2026-04-06", satisfactionScore: 4.7, feedbackCount: 135 }
    ],
    avgSatisfaction: 4.61,
    trendDirection: "up"
  },
  2: {
    satisfactionTrend: [
      { date: "2026-03-31", satisfactionScore: 4.5, feedbackCount: 80 },
      { date: "2026-04-01", satisfactionScore: 4.6, feedbackCount: 84 },
      { date: "2026-04-02", satisfactionScore: 4.6, feedbackCount: 88 },
      { date: "2026-04-03", satisfactionScore: 4.7, feedbackCount: 92 },
      { date: "2026-04-04", satisfactionScore: 4.7, feedbackCount: 101 },
      { date: "2026-04-05", satisfactionScore: 4.8, feedbackCount: 110 },
      { date: "2026-04-06", satisfactionScore: 4.7, feedbackCount: 96 }
    ],
    avgSatisfaction: 4.66,
    trendDirection: "up"
  }
};

export const dailyReports: DailyReport[] = [
  {
    id: 1,
    scenicId: 1,
    statsDate: "2026-04-06",
    statsType: "daily",
    totalInteractions: 3580,
    uniqueVisitors: 1250,
    avgSessionDuration: 186,
    focusPoints: JSON.stringify([{ keyword: "索道排队", count: 456 }, { keyword: "天气变化", count: 234 }]),
    emotionDistribution: JSON.stringify({ positive: 0.85, neutral: 0.09, negative: 0.06 }),
    satisfactionRate: 92.5,
    satisfactionTrend: "rising",
    hotQuestions: JSON.stringify([{ question: "黄山索道几点开始运营？", count: 256 }]),
    complaintTopics: JSON.stringify([{ topic: "高峰排队时长", count: 23 }]),
    suggestionSummary: "游客对路线规划和排队预期管理最敏感，建议在问答首轮即给出当前索道状态和替代路线。",
    serviceSuggest: "1. 在首页强化高峰分流提示\n2. 为雨天场景补充话术模板\n3. 对住宿类问题增加多轮推荐策略",
    aiGenerated: 1,
    reportFile: null,
    creator: 1,
    createTime: "2026-04-06 23:00:00",
    updateTime: "2026-04-06 23:00:00"
  },
  {
    id: 2,
    scenicId: 2,
    statsDate: "2026-04-06",
    statsType: "daily",
    totalInteractions: 2160,
    uniqueVisitors: 840,
    avgSessionDuration: 164,
    focusPoints: JSON.stringify([{ keyword: "夜游时间", count: 201 }, { keyword: "摄影点位", count: 189 }]),
    emotionDistribution: JSON.stringify({ positive: 0.87, neutral: 0.08, negative: 0.05 }),
    satisfactionRate: 94.2,
    satisfactionTrend: "rising",
    hotQuestions: JSON.stringify([{ question: "宏村夜游几点开始比较合适？", count: 143 }]),
    complaintTopics: JSON.stringify([{ topic: "停车接驳效率", count: 12 }]),
    suggestionSummary: "宏村场景更偏内容导览，游客更愿意看到摄影、夜游和美食组合推荐。",
    serviceSuggest: "1. 增加夜游入口提示\n2. 强化拍照点位推荐\n3. 停车类问答增加等待时间说明",
    aiGenerated: 1,
    reportFile: null,
    creator: 1,
    createTime: "2026-04-06 23:00:00",
    updateTime: "2026-04-06 23:00:00"
  }
];

export const dailyReportDetails: DailyReportDetail[] = [
  {
    id: 1,
    scenicId: 1,
    reportDate: "2026-04-06",
    reportType: "daily",
    visitorCount: 1250,
    interactionCount: 3580,
    avgSatisfaction: 4.7,
    emotionAnalysis: "整体情绪保持正向，游客对日出路线和住宿建议的满意度最高，负向反馈主要集中在索道排队。",
    keyInsights: "高峰时段集中在 10:00-11:00，索道与天气相关问题占比高。FAQ 的帮助率维持在较高水平，知识库覆盖仍有补充空间。",
    recommendations: "1. 为高峰时段建立明确分流话术\n2. 将天气、路线和住宿三类问题合并成首屏组合问答\n3. 对排队话题增加时效性提示",
    createTime: "2026-04-06 23:00:00"
  },
  {
    id: 2,
    scenicId: 2,
    reportDate: "2026-04-06",
    reportType: "daily",
    visitorCount: 840,
    interactionCount: 2160,
    avgSatisfaction: 4.7,
    emotionAnalysis: "夜游和拍照相关咨询带来更高的正向反馈，投诉点集中在停车和节假日入园等待。",
    keyInsights: "宏村问题结构更加内容导向，问答回复如果带点位推荐和时段建议， helpful rate 明显更高。",
    recommendations: "1. 强化夜游摄影组合推荐\n2. 为停车接驳补充实时指引\n3. 扩展徽州周边联游内容",
    createTime: "2026-04-06 23:00:00"
  }
];
