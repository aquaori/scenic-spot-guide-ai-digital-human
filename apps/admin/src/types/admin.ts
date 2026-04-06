export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface PaginatedResponse<T> {
  total: number;
  rows: T[];
  code: number;
  msg: string;
}

export interface Scenic {
  id: number;
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
  createTime: string;
  updateTime: string;
}

export interface DigitalHuman {
  id: number;
  scenicId: number;
  humanName: string;
  appearanceConfig: string;
  voiceConfig: string;
  lipSync: 0 | 1;
  defaultGreeting: string;
  avatarImage: string;
  isDefault: 0 | 1;
  creator: number;
  updater: number;
  createTime: string;
  updateTime: string;
}

export interface FaqItem {
  id: number;
  scenicId: number;
  question: string;
  questionKeywords: string;
  answer: string;
  answerType: "text" | "rich" | "html";
  spotId: number | null;
  similarQuestions: string;
  clickCount: number;
  helpfulCount: number;
  unhelpfulCount: number;
  vectorId: string;
  similarityThreshold: number;
  creator?: number;
  updater?: number;
  status: 0 | 1;
  createTime: string;
  updateTime: string;
}

export interface HotFaqItem {
  id: number;
  question: string;
  answer: string;
  clickCount: number;
  helpfulCount: number;
}

export interface KnowledgeDoc {
  id: number;
  scenicId: number;
  scenicName: string;
  docTitle: string;
  docType: "markdown" | "text" | "html";
  docContent: string;
  docSummary: string;
  wordCount: number;
  chunkCount: number;
  vectorized: 0 | 1;
  viewCount: number;
  creatorName: string;
  status: 0 | 1;
  createTime: string;
  updateTime: string;
}

export interface TodayOverview {
  todayVisitors: number;
  todayInteractions: number;
  todayQuestions: number;
  satisfactionRate: number;
  peakHour: string;
  activeGuides: number;
}

export interface WeeklyStatItem {
  statDate: string;
  totalInteractions: number;
  uniqueVisitors: number;
  avgResponseTimeMs: number;
  avgSatisfaction: number;
  textCount: number;
  voiceCount: number;
  createTime: string;
}

export interface WeeklyStats {
  dailyStats: WeeklyStatItem[];
  summary: {
    totalInteractions: number;
    uniqueVisitors: number;
    avgResponseTimeMs: number;
    avgSatisfaction: number;
    textCount: number;
    voiceCount: number;
    daysWithData: number;
  };
}

export interface HotQuestionStats {
  hotQuestions: Array<{
    question: string;
    count: number;
    helpfulRate: number;
  }>;
  totalCount: number;
  lastUpdated: string;
}

export interface EmotionTrend {
  trendData: Array<{
    date: string;
    positiveRate: number;
    neutralRate: number;
    negativeRate: number;
    sampleCount: number;
  }>;
  avgPositiveRate: number;
  avgNegativeRate: number;
  overallSentiment: "positive" | "neutral" | "negative";
}

export interface FocusPoints {
  focusPoints: Array<{
    keyword: string;
    count: number;
    sentiment: "positive" | "neutral" | "negative";
    percentage: number;
  }>;
  totalKeywords: number;
  analysisDate: string;
}

export interface SatisfactionTrend {
  satisfactionTrend: Array<{
    date: string;
    satisfactionScore: number;
    feedbackCount: number;
  }>;
  avgSatisfaction: number;
  trendDirection: "up" | "stable" | "down";
}

export interface DailyReport {
  id: number;
  scenicId: number;
  statsDate: string;
  statsType: "daily" | "weekly" | "monthly";
  totalInteractions: number;
  uniqueVisitors: number;
  avgSessionDuration: number;
  focusPoints: string;
  emotionDistribution: string;
  satisfactionRate: number;
  satisfactionTrend: "rising" | "stable" | "falling";
  hotQuestions: string;
  complaintTopics: string;
  suggestionSummary: string;
  serviceSuggest: string;
  aiGenerated: 0 | 1;
  reportFile: string | null;
  creator: number;
  createTime: string;
  updateTime: string;
}

export interface DailyReportDetail {
  id: number;
  scenicId: number;
  reportDate: string;
  reportType: "daily" | "weekly" | "monthly";
  visitorCount: number;
  interactionCount: number;
  avgSatisfaction: number;
  emotionAnalysis: string;
  keyInsights: string;
  recommendations: string;
  createTime: string;
}
