import { delay, http, HttpResponse } from "msw";
import { adminEnv } from "@/config/env";
import {
  dailyReportDetails,
  dailyReports,
  digitalHumans,
  emotionTrendByScenic,
  faqItems,
  focusPointsByScenic,
  hotQuestionStatsByScenic,
  knowledgeDocs,
  satisfactionTrendByScenic,
  scenicList,
  todayOverviewByScenic,
  weeklyStatsByScenic
} from "@/mocks/data";
import type { DigitalHuman, FaqItem, KnowledgeDoc, Scenic } from "@/types/admin";

const createApiResponse = <T>(data: T, msg = "操作成功") => ({ code: 200, msg, data });
const createListResponse = <T>(rows: T[], total = rows.length, msg = "查询成功") => ({ total, rows, code: 200, msg });
const parseScenicId = (value: string | null) => Number(value ?? scenicList[0]?.id ?? 1);
const apiPath = (path: string) => `*${adminEnv.apiBaseUrl}${path}`;
const now = () => "2026-04-06 17:10:00";

const mockToken = "mock-jwt-token-admin";
const mockCaptchaUuid = "mock-captcha-uuid";
const mockCaptchaCode = "1234";
const mockCaptchaSvgBase64 = btoa(
  `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="56" viewBox="0 0 160 56">
    <rect width="160" height="56" rx="16" fill="#e2e8f0"/>
    <text x="80" y="36" text-anchor="middle" font-size="28" font-family="Arial, sans-serif" fill="#0f172a" font-weight="700">1234</text>
  </svg>`
);

const isAuthorized = (request: Request) => request.headers.get("Authorization") === `Bearer ${mockToken}`;
const unauthorizedResponse = () =>
  HttpResponse.json(
    {
      code: 401,
      msg: "未登录或登录已失效",
      data: null
    },
    { status: 401 }
  );

const getQueryNumber = (request: Request, key: string, fallback: number) => {
  const value = Number(new URL(request.url).searchParams.get(key));
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const paginate = <T>(rows: T[], request: Request) => {
  const total = rows.length;
  const pageNum = getQueryNumber(request, "pageNum", 1);
  const pageSize = getQueryNumber(request, "pageSize", 10);
  const start = (pageNum - 1) * pageSize;
  return { total, rows: rows.slice(start, start + pageSize) };
};

const getNextId = <T extends { id: number }>(rows: T[]) => rows.reduce((max, item) => Math.max(max, item.id), 0) + 1;

const findScenicName = (scenicId: number) => scenicList.find((item) => item.id === scenicId)?.scenicName ?? "";

const setDefaultDigitalHumanForScenic = (scenicId: number, activeId: number | null) => {
  let hasDefault = false;

  digitalHumans.forEach((item) => {
    if (item.scenicId !== scenicId) return;
    item.isDefault = item.id === activeId ? 1 : 0;
    if (item.isDefault === 1) {
      hasDefault = true;
      item.updateTime = now();
    }
  });

  if (!hasDefault && activeId === null) {
    const fallback = digitalHumans.find((item) => item.scenicId === scenicId);
    if (fallback) {
      fallback.isDefault = 1;
      fallback.updateTime = now();
    }
  }
};

const normalizeScenicPayload = (body: Partial<Scenic>): Scenic => ({
  id: body.id ?? getNextId(scenicList),
  scenicName: body.scenicName ?? "",
  scenicAddress: body.scenicAddress ?? "",
  scenicDesc: body.scenicDesc ?? "",
  openTime: body.openTime ?? "",
  ticketInfo: body.ticketInfo ?? "",
  contactPhone: body.contactPhone ?? "",
  officialWebsite: body.officialWebsite ?? "",
  coverImage: body.coverImage ?? "",
  gpsLatitude: body.gpsLatitude ?? 0,
  gpsLongitude: body.gpsLongitude ?? 0,
  starLevel: body.starLevel ?? "",
  status: body.status ?? 1,
  sort: body.sort ?? scenicList.length + 1,
  createTime: body.createTime ?? now(),
  updateTime: now()
});

const normalizeDigitalHumanPayload = (body: Partial<DigitalHuman>): DigitalHuman => ({
  id: body.id ?? getNextId(digitalHumans),
  scenicId: body.scenicId ?? scenicList[0]?.id ?? 1,
  humanName: body.humanName ?? "",
  appearanceConfig: body.appearanceConfig ?? JSON.stringify({ model: "qwen-avatar-v2", enhancement: null }),
  voiceConfig: body.voiceConfig ?? JSON.stringify({ voice: "xiaomei", speed: 1, pitch: 1 }),
  lipSync: body.lipSync ?? 1,
  defaultGreeting: body.defaultGreeting ?? "",
  avatarImage: body.avatarImage ?? "",
  isDefault: body.isDefault ?? 0,
  creator: body.creator ?? 1,
  updater: body.updater ?? 1,
  createTime: body.createTime ?? now(),
  updateTime: now()
});

const normalizeFaqPayload = (body: Partial<FaqItem>): FaqItem => {
  const id = body.id ?? getNextId(faqItems);

  return {
    id,
    scenicId: body.scenicId ?? scenicList[0]?.id ?? 1,
    question: body.question ?? "",
    questionKeywords: body.questionKeywords ?? "",
    answer: body.answer ?? "",
    answerType: body.answerType ?? "text",
    spotId: body.spotId ?? null,
    similarQuestions: body.similarQuestions ?? "[]",
    clickCount: body.clickCount ?? 0,
    helpfulCount: body.helpfulCount ?? 0,
    unhelpfulCount: body.unhelpfulCount ?? 0,
    vectorId: body.vectorId ?? `vec_faq_${String(id).padStart(3, "0")}`,
    similarityThreshold: body.similarityThreshold ?? 0.8,
    creator: body.creator ?? 1,
    updater: body.updater ?? 1,
    status: body.status ?? 1,
    createTime: body.createTime ?? now(),
    updateTime: now()
  };
};

const normalizeKnowledgePayload = (body: Partial<KnowledgeDoc>): KnowledgeDoc => {
  const docContent = body.docContent ?? "";

  return {
    id: body.id ?? getNextId(knowledgeDocs),
    scenicId: body.scenicId ?? scenicList[0]?.id ?? 1,
    scenicName: body.scenicName ?? findScenicName(body.scenicId ?? scenicList[0]?.id ?? 1),
    docTitle: body.docTitle ?? "",
    docType: body.docType ?? "markdown",
    docContent,
    docSummary: body.docSummary ?? "",
    wordCount: body.wordCount ?? docContent.length,
    chunkCount: body.chunkCount ?? 0,
    vectorized: body.vectorized ?? 0,
    viewCount: body.viewCount ?? 0,
    creatorName: body.creatorName ?? "管理员",
    status: body.status ?? 1,
    createTime: body.createTime ?? now(),
    updateTime: now()
  };
};

export const handlers = [
  http.get(apiPath("/captchaImage"), async () => {
    await delay(120);
    return HttpResponse.json({
      captchaEnabled: true,
      img: mockCaptchaSvgBase64,
      uuid: mockCaptchaUuid
    });
  }),

  http.post(apiPath("/login"), async ({ request }) => {
    await delay(260);
    const body = (await request.json()) as {
      username?: string;
      password?: string;
      code?: string;
      uuid?: string;
    };

    if (
      body.username !== "admin" ||
      body.password !== "admin123" ||
      body.code !== mockCaptchaCode ||
      body.uuid !== mockCaptchaUuid
    ) {
      return HttpResponse.json(
        {
          code: 500,
          msg: "用户名、密码或验证码错误"
        },
        { status: 500 }
      );
    }

    return HttpResponse.json({
      code: 200,
      msg: "登录成功",
      token: mockToken
    });
  }),

  http.post(apiPath("/logout"), async ({ request }) => {
    await delay(120);
    if (!isAuthorized(request)) return unauthorizedResponse();
    return HttpResponse.json(createApiResponse(null, "退出成功"));
  }),

  http.get(apiPath("/manage/scenic/list"), async ({ request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const { total, rows } = paginate(scenicList, request);
    return HttpResponse.json(createListResponse(rows, total));
  }),

  http.get(apiPath("/manage/scenic/:id"), async ({ params, request }) => {
    await delay(160);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenic = scenicList.find((item) => item.id === Number(params.id)) ?? null;
    return HttpResponse.json(createApiResponse(scenic));
  }),

  http.post(apiPath("/manage/scenic"), async ({ request }) => {
    await delay(220);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const body = (await request.json()) as Partial<Scenic>;
    const scenic = normalizeScenicPayload(body);
    scenicList.push(scenic);
    return HttpResponse.json(createApiResponse(null));
  }),

  http.put(apiPath("/manage/scenic"), async ({ request }) => {
    await delay(220);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const body = (await request.json()) as Partial<Scenic> & { id: number };
    const scenic = scenicList.find((item) => item.id === Number(body.id));

    if (scenic) {
      Object.assign(scenic, normalizeScenicPayload({ ...scenic, ...body, createTime: scenic.createTime }));
    }

    return HttpResponse.json(createApiResponse(null));
  }),

  http.delete(apiPath("/manage/scenic/:id"), async ({ params, request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const index = scenicList.findIndex((item) => item.id === Number(params.id));
    if (index >= 0) scenicList.splice(index, 1);
    return HttpResponse.json(createApiResponse(null));
  }),

  http.get(apiPath("/manage/stats/today-overview"), async ({ request }) => {
    await delay(220);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = parseScenicId(new URL(request.url).searchParams.get("scenicId"));
    return HttpResponse.json(createApiResponse(todayOverviewByScenic[scenicId]));
  }),

  http.get(apiPath("/manage/stats/weekly-stats"), async ({ request }) => {
    await delay(220);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = parseScenicId(new URL(request.url).searchParams.get("scenicId"));
    return HttpResponse.json(createApiResponse(weeklyStatsByScenic[scenicId]));
  }),

  http.get(apiPath("/manage/stats/hot-questions"), async ({ request }) => {
    await delay(220);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = parseScenicId(new URL(request.url).searchParams.get("scenicId"));
    const limit = getQueryNumber(request, "limit", 10);
    const source = hotQuestionStatsByScenic[scenicId];
    return HttpResponse.json(
      createApiResponse({
        ...source,
        hotQuestions: source.hotQuestions.slice(0, limit),
        totalCount: Math.min(source.totalCount, limit)
      })
    );
  }),

  http.post(apiPath("/manage/stats/generate"), async ({ request }) => {
    await delay(380);
    if (!isAuthorized(request)) return unauthorizedResponse();
    return HttpResponse.json(createApiResponse(null, "统计任务已进入队列"));
  }),

  http.get(apiPath("/manage/analysis/emotion-trend"), async ({ request }) => {
    await delay(200);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = parseScenicId(new URL(request.url).searchParams.get("scenicId"));
    return HttpResponse.json(createApiResponse(emotionTrendByScenic[scenicId]));
  }),

  http.get(apiPath("/manage/analysis/focus-points"), async ({ request }) => {
    await delay(200);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = parseScenicId(new URL(request.url).searchParams.get("scenicId"));
    const limit = getQueryNumber(request, "limit", 10);
    const source = focusPointsByScenic[scenicId];
    return HttpResponse.json(
      createApiResponse({
        ...source,
        focusPoints: source.focusPoints.slice(0, limit),
        totalKeywords: Math.min(source.totalKeywords, limit)
      })
    );
  }),

  http.get(apiPath("/manage/analysis/satisfaction-trend"), async ({ request }) => {
    await delay(200);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = parseScenicId(new URL(request.url).searchParams.get("scenicId"));
    const days = getQueryNumber(request, "days", 30);
    const source = satisfactionTrendByScenic[scenicId];
    return HttpResponse.json(
      createApiResponse({
        ...source,
        satisfactionTrend: source.satisfactionTrend.slice(-days)
      })
    );
  }),

  http.post(apiPath("/manage/analysis/generate-daily-report"), async ({ request }) => {
    await delay(420);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = parseScenicId(new URL(request.url).searchParams.get("scenicId"));
    const report = dailyReports.find((item) => item.scenicId === scenicId) ?? dailyReports[0];
    return HttpResponse.json(createApiResponse(report, "日报已生成"));
  }),

  http.get(apiPath("/manage/analysis/:id"), async ({ params, request }) => {
    await delay(200);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const id = Number(params.id);
    const detail = dailyReportDetails.find((item) => item.id === id) ?? dailyReportDetails[0];
    return HttpResponse.json(createApiResponse(detail));
  }),

  http.get(apiPath("/manage/digital-human/list"), async ({ request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = new URL(request.url).searchParams.get("scenicId");
    const filtered = scenicId ? digitalHumans.filter((item) => item.scenicId === Number(scenicId)) : digitalHumans;
    const { total, rows } = paginate(filtered, request);
    return HttpResponse.json(createListResponse(rows, total));
  }),

  http.get(apiPath("/manage/digital-human/:id"), async ({ params, request }) => {
    await delay(160);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const data = digitalHumans.find((item) => item.id === Number(params.id)) ?? null;
    return HttpResponse.json(createApiResponse(data));
  }),

  http.get(apiPath("/manage/digital-human/scenic/:scenicId/default"), async ({ params, request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = Number(params.scenicId);
    const data =
      digitalHumans.find((item) => item.scenicId === scenicId && item.isDefault === 1) ??
      digitalHumans.find((item) => item.scenicId === scenicId) ??
      null;
    return HttpResponse.json(createApiResponse(data));
  }),

  http.post(apiPath("/manage/digital-human"), async ({ request }) => {
    await delay(240);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const body = (await request.json()) as Partial<DigitalHuman>;
    const item = normalizeDigitalHumanPayload(body);
    if (item.isDefault === 1) setDefaultDigitalHumanForScenic(item.scenicId, item.id);
    digitalHumans.push(item);
    if (item.isDefault !== 1 && !digitalHumans.some((row) => row.scenicId === item.scenicId && row.isDefault === 1)) {
      setDefaultDigitalHumanForScenic(item.scenicId, item.id);
    }
    return HttpResponse.json(createApiResponse(null));
  }),

  http.put(apiPath("/manage/digital-human"), async ({ request }) => {
    await delay(240);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const body = (await request.json()) as Partial<DigitalHuman> & { id: number };
    const item = digitalHumans.find((row) => row.id === Number(body.id));

    if (item) {
      Object.assign(item, normalizeDigitalHumanPayload({ ...item, ...body, createTime: item.createTime }));
      if (item.isDefault === 1) {
        setDefaultDigitalHumanForScenic(item.scenicId, item.id);
      }
    }

    return HttpResponse.json(createApiResponse(null));
  }),

  http.post(apiPath("/manage/digital-human/:id/set-default"), async ({ params, request }) => {
    await delay(260);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const id = Number(params.id);
    const scenicId = parseScenicId(new URL(request.url).searchParams.get("scenicId"));
    setDefaultDigitalHumanForScenic(scenicId, id);
    return HttpResponse.json(createApiResponse(null));
  }),

  http.delete(apiPath("/manage/digital-human/:id"), async ({ params, request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const target = digitalHumans.find((item) => item.id === Number(params.id));
    const index = digitalHumans.findIndex((item) => item.id === Number(params.id));

    if (index >= 0) {
      digitalHumans.splice(index, 1);
    }

    if (target?.isDefault === 1) {
      setDefaultDigitalHumanForScenic(target.scenicId, null);
    }

    return HttpResponse.json(createApiResponse(null));
  }),

  http.get(apiPath("/manage/knowledge/list"), async ({ request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = new URL(request.url).searchParams.get("scenicId");
    const filtered = scenicId ? knowledgeDocs.filter((item) => item.scenicId === Number(scenicId)) : knowledgeDocs;
    const { total, rows } = paginate(filtered, request);
    return HttpResponse.json(createListResponse(rows, total));
  }),

  http.get(apiPath("/manage/knowledge/:id"), async ({ params, request }) => {
    await delay(160);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const data = knowledgeDocs.find((item) => item.id === Number(params.id)) ?? null;
    return HttpResponse.json(createApiResponse(data));
  }),

  http.post(apiPath("/manage/knowledge"), async ({ request }) => {
    await delay(240);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const body = (await request.json()) as Partial<KnowledgeDoc>;
    const item = normalizeKnowledgePayload(body);
    knowledgeDocs.push(item);
    return HttpResponse.json(createApiResponse(null));
  }),

  http.put(apiPath("/manage/knowledge"), async ({ request }) => {
    await delay(240);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const body = (await request.json()) as Partial<KnowledgeDoc> & { id: number };
    const item = knowledgeDocs.find((row) => row.id === Number(body.id));

    if (item) {
      Object.assign(
        item,
        normalizeKnowledgePayload({
          ...item,
          ...body,
          scenicName: body.scenicId ? findScenicName(body.scenicId) : item.scenicName,
          createTime: item.createTime
        })
      );
    }

    return HttpResponse.json(createApiResponse(null));
  }),

  http.delete(apiPath("/manage/knowledge/:id"), async ({ params, request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const index = knowledgeDocs.findIndex((item) => item.id === Number(params.id));
    if (index >= 0) knowledgeDocs.splice(index, 1);
    return HttpResponse.json(createApiResponse(null));
  }),

  http.post(apiPath("/manage/knowledge/:id/vectorize"), async ({ params, request }) => {
    await delay(260);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const id = Number(params.id);
    const doc = knowledgeDocs.find((item) => item.id === id);

    if (doc) {
      doc.vectorized = 1;
      doc.chunkCount = Math.max(doc.chunkCount, Math.ceil(Math.max(doc.wordCount, 1) / 500));
      doc.updateTime = now();
    }

    return HttpResponse.json(createApiResponse(null));
  }),

  http.get(apiPath("/manage/faq/list"), async ({ request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = new URL(request.url).searchParams.get("scenicId");
    const filtered = scenicId ? faqItems.filter((item) => item.scenicId === Number(scenicId)) : faqItems;
    const { total, rows } = paginate(filtered, request);
    return HttpResponse.json(createListResponse(rows, total));
  }),

  http.get(apiPath("/manage/faq/match"), async ({ request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const url = new URL(request.url);
    const scenicId = parseScenicId(url.searchParams.get("scenicId"));
    const question = (url.searchParams.get("question") ?? "").trim().toLowerCase();

    const data =
      faqItems.find((item) => {
        if (item.scenicId !== scenicId) return false;
        const haystack = [item.question, item.questionKeywords, item.similarQuestions].join(" ").toLowerCase();
        return question !== "" && haystack.includes(question);
      }) ?? null;

    return HttpResponse.json(createApiResponse(data));
  }),

  http.get(apiPath("/manage/faq/:id"), async ({ params, request }) => {
    await delay(160);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const data = faqItems.find((item) => item.id === Number(params.id)) ?? null;
    return HttpResponse.json(createApiResponse(data));
  }),

  http.get(apiPath("/manage/faq/hot"), async ({ request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const scenicId = parseScenicId(new URL(request.url).searchParams.get("scenicId"));
    const limit = getQueryNumber(request, "limit", 10);
    const data = faqItems
      .filter((item) => item.scenicId === scenicId)
      .sort((left, right) => right.clickCount - left.clickCount)
      .slice(0, limit)
      .map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        clickCount: item.clickCount,
        helpfulCount: item.helpfulCount
      }));

    return HttpResponse.json(createApiResponse(data));
  }),

  http.post(apiPath("/manage/faq"), async ({ request }) => {
    await delay(240);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const body = (await request.json()) as Partial<FaqItem>;
    const item = normalizeFaqPayload(body);
    faqItems.push(item);
    return HttpResponse.json(createApiResponse(null));
  }),

  http.put(apiPath("/manage/faq"), async ({ request }) => {
    await delay(240);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const body = (await request.json()) as Partial<FaqItem> & { id: number };
    const item = faqItems.find((row) => row.id === Number(body.id));

    if (item) {
      Object.assign(item, normalizeFaqPayload({ ...item, ...body, createTime: item.createTime }));
    }

    return HttpResponse.json(createApiResponse(null));
  }),

  http.delete(apiPath("/manage/faq/:id"), async ({ params, request }) => {
    await delay(180);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const index = faqItems.findIndex((item) => item.id === Number(params.id));
    if (index >= 0) faqItems.splice(index, 1);
    return HttpResponse.json(createApiResponse(null));
  }),

  http.post(apiPath("/manage/faq/:id/helpful"), async ({ params, request }) => {
    await delay(150);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const item = faqItems.find((faq) => faq.id === Number(params.id));
    if (item) {
      item.helpfulCount += 1;
      item.updateTime = now();
    }

    return HttpResponse.json(createApiResponse(null));
  }),

  http.post(apiPath("/manage/faq/:id/unhelpful"), async ({ params, request }) => {
    await delay(150);
    if (!isAuthorized(request)) return unauthorizedResponse();
    const item = faqItems.find((faq) => faq.id === Number(params.id));
    if (item) {
      item.unhelpfulCount += 1;
      item.updateTime = now();
    }

    return HttpResponse.json(createApiResponse(null));
  }),

  http.all(apiPath("/*"), async ({ request }) => {
    return HttpResponse.json(
      {
        code: 404,
        msg: `Unhandled mock route: ${request.method} ${new URL(request.url).pathname}`,
        data: null
      },
      { status: 404 }
    );
  })
];
