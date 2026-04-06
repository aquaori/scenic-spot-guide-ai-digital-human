import { http } from "@/lib/http";
import type {
  DailyReport,
  DailyReportDetail,
  DigitalHuman,
  EmotionTrend,
  FaqItem,
  FocusPoints,
  HotFaqItem,
  HotQuestionStats,
  KnowledgeDoc,
  SatisfactionTrend,
  Scenic,
  TodayOverview,
  WeeklyStats
} from "@/types/admin";

export interface ScenicPayload {
  scenicName: string;
  scenicAddress?: string;
  scenicDesc?: string;
  openTime?: string;
  ticketInfo?: string;
  contactPhone?: string;
  officialWebsite?: string;
  coverImage?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  starLevel?: string;
  status?: 0 | 1;
  sort?: number;
}

export interface ScenicUpdatePayload extends ScenicPayload {
  id: number;
}

export interface DigitalHumanPayload {
  scenicId: number;
  humanName: string;
  appearanceConfig?: string;
  voiceConfig?: string;
  lipSync?: 0 | 1;
  defaultGreeting?: string;
  avatarImage?: string;
  isDefault?: 0 | 1;
}

export interface DigitalHumanUpdatePayload extends DigitalHumanPayload {
  id: number;
}

export interface FaqPayload {
  scenicId: number;
  question: string;
  questionKeywords?: string;
  answer: string;
  answerType?: "text" | "rich" | "html";
  spotId?: number | null;
  similarQuestions?: string;
  status?: 0 | 1;
}

export interface FaqUpdatePayload extends FaqPayload {
  id: number;
}

export interface KnowledgeDocPayload {
  scenicId: number;
  docTitle: string;
  docType: "markdown" | "text" | "html";
  docContent: string;
  docSummary?: string;
  status?: 0 | 1;
}

export interface KnowledgeDocUpdatePayload extends KnowledgeDocPayload {
  id: number;
}

export const adminApi = {
  listScenic() {
    return http.getList<Scenic>("/manage/scenic/list", { pageNum: 1, pageSize: 50 });
  },
  getScenicDetail(id: number) {
    return http.getApi<Scenic>(`/manage/scenic/${id}`);
  },
  createScenic(payload: ScenicPayload) {
    return http.postApi<null>("/manage/scenic", payload);
  },
  updateScenic(payload: ScenicUpdatePayload) {
    return http.putApi<null>("/manage/scenic", payload);
  },
  deleteScenic(id: number) {
    return http.deleteApi<null>(`/manage/scenic/${id}`);
  },
  getTodayOverview(scenicId: number) {
    return http.getApi<TodayOverview>("/manage/stats/today-overview", { scenicId });
  },
  getWeeklyStats(scenicId: number) {
    return http.getApi<WeeklyStats>("/manage/stats/weekly-stats", { scenicId });
  },
  getHotQuestionStats(scenicId: number, limit = 5) {
    return http.getApi<HotQuestionStats>("/manage/stats/hot-questions", { scenicId, limit });
  },
  generateStats(scenicId: number, date: string, type: "daily" | "weekly" | "monthly" = "daily") {
    return http.postApi<null>("/manage/stats/generate", undefined, { scenicId, date, type });
  },
  getEmotionTrend(scenicId: number, startDate: string, endDate: string) {
    return http.getApi<EmotionTrend>("/manage/analysis/emotion-trend", { scenicId, startDate, endDate });
  },
  getFocusPoints(scenicId: number, limit = 6) {
    return http.getApi<FocusPoints>("/manage/analysis/focus-points", { scenicId, limit });
  },
  getSatisfactionTrend(scenicId: number, days = 7) {
    return http.getApi<SatisfactionTrend>("/manage/analysis/satisfaction-trend", { scenicId, days });
  },
  generateDailyReport(scenicId: number, date: string) {
    return http.postApi<DailyReport>("/manage/analysis/generate-daily-report", undefined, { scenicId, date });
  },
  getDailyReportDetail(id: number) {
    return http.getApi<DailyReportDetail>(`/manage/analysis/${id}`);
  },
  listDigitalHumans(scenicId?: number) {
    return http.getList<DigitalHuman>("/manage/digital-human/list", { pageNum: 1, pageSize: 50, scenicId });
  },
  getDigitalHumanDetail(id: number) {
    return http.getApi<DigitalHuman>(`/manage/digital-human/${id}`);
  },
  getDefaultDigitalHuman(scenicId: number) {
    return http.getApi<DigitalHuman>(`/manage/digital-human/scenic/${scenicId}/default`);
  },
  createDigitalHuman(payload: DigitalHumanPayload) {
    return http.postApi<null>("/manage/digital-human", payload);
  },
  updateDigitalHuman(payload: DigitalHumanUpdatePayload) {
    return http.putApi<null>("/manage/digital-human", payload);
  },
  setDefaultDigitalHuman(id: number, scenicId: number) {
    return http.postApi<null>(`/manage/digital-human/${id}/set-default`, undefined, { scenicId });
  },
  deleteDigitalHuman(id: number) {
    return http.deleteApi<null>(`/manage/digital-human/${id}`);
  },
  listKnowledgeDocs(scenicId?: number) {
    return http.getList<KnowledgeDoc>("/manage/knowledge/list", { pageNum: 1, pageSize: 50, scenicId });
  },
  getKnowledgeDocDetail(id: number) {
    return http.getApi<KnowledgeDoc>(`/manage/knowledge/${id}`);
  },
  createKnowledgeDoc(payload: KnowledgeDocPayload) {
    return http.postApi<null>("/manage/knowledge", payload);
  },
  updateKnowledgeDoc(payload: KnowledgeDocUpdatePayload) {
    return http.putApi<null>("/manage/knowledge", payload);
  },
  deleteKnowledgeDoc(id: number) {
    return http.deleteApi<null>(`/manage/knowledge/${id}`);
  },
  vectorizeKnowledgeDoc(id: number) {
    return http.postApi<null>(`/manage/knowledge/${id}/vectorize`);
  },
  listFaqs(scenicId?: number) {
    return http.getList<FaqItem>("/manage/faq/list", { pageNum: 1, pageSize: 50, scenicId });
  },
  getFaqDetail(id: number) {
    return http.getApi<FaqItem>(`/manage/faq/${id}`);
  },
  matchFaq(scenicId: number, question: string) {
    return http.getApi<FaqItem | null>("/manage/faq/match", { scenicId, question });
  },
  getHotFaqs(scenicId: number, limit = 5) {
    return http.getApi<HotFaqItem[]>("/manage/faq/hot", { scenicId, limit });
  },
  createFaq(payload: FaqPayload) {
    return http.postApi<null>("/manage/faq", payload);
  },
  updateFaq(payload: FaqUpdatePayload) {
    return http.putApi<null>("/manage/faq", payload);
  },
  deleteFaq(id: number) {
    return http.deleteApi<null>(`/manage/faq/${id}`);
  },
  markFaqHelpful(id: number) {
    return http.postApi<null>(`/manage/faq/${id}/helpful`);
  },
  markFaqUnhelpful(id: number) {
    return http.postApi<null>(`/manage/faq/${id}/unhelpful`);
  }
};
