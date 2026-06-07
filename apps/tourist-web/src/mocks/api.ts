import {
  quickPromptsMock,
  type ConversationMessage,
  type MessageAttachment
} from "./guide";
import type {
  TouristAuthData,
  TouristChatPayload,
  TouristBootstrapData,
  TouristBootstrapPayload,
  TouristChatEndPayload,
  TouristConversationDetail,
  TouristConversationListData,
  TouristConversationListPayload,
  TouristLoginPayload,
  TouristRegisterPayload,
  TouristStreamHandlers,
  TouristStreamSubscription
} from "../api/tourist";

const wait = (ms: number) => new Promise((resolve) => globalThis.setTimeout(resolve, ms));
const getMockThinkingDelay = () => 700 + Math.floor(Math.random() * 1400);
const getMockChunkDelay = () => 140 + Math.floor(Math.random() * 140);
let mockConversationSequence = 0;

type MockPendingConversation = {
  conversationId: string;
  answer: ReturnType<typeof buildAnswer>;
  sessionId: string;
  scenicId?: string | number;
  visitorId?: string | number;
  userMessage: string;
  completed: boolean;
};

type MockActiveStream = {
  close: () => void;
  emitInterrupted: () => void;
};

const attachmentLibrary: Record<string, MessageAttachment[]> = {
  route: [
    {
      id: "mock-routes-1",
      type: "routes",
      eyebrow: "Route Recommendation",
      title: "轻松游览路线",
      meta: "约 100 分钟",
      items: [
        {
          id: "mock-route-1",
          title: "看景优先线",
          summary: "先快速建立整体视野，再顺着主游线推进，折返最少。",
          duration: "100 分钟",
          tags: ["少走回头路", "看景", "第一次来"]
        },
        {
          id: "mock-route-2",
          title: "讲解穿插线",
          summary: "在主节点补充轻讲解，整体节奏更稳。",
          duration: "120 分钟",
          tags: ["讲解", "节奏均衡", "信息量更高"]
        }
      ]
    }
  ],
  spot: [
    {
      id: "mock-spot-1",
      type: "spot",
      eyebrow: "Spot Explanation",
      title: "主观景平台",
      description: "这里适合做整段路线的起点，视野打开快，方便先建立方向感，再进入后续游览。",
      metrics: [
        { label: "建议停留", value: "15 分钟" },
        { label: "适合人群", value: "第一次来景区的游客" }
      ]
    }
  ]
};

const bootstrapData: TouristBootstrapData = {
  scenicId: 1,
  scenicName: "黄山风景区",
  scenic: {
    scenicName: "黄山风景区"
  },
  digitalHuman: {
    id: 1,
    scenicId: 1,
    humanName: "景区导览 AI 数字人",
    defaultGreeting: "你好，欢迎来到景区。",
    lipSync: 1,
    isDefault: 1
  },
  onlineCount: 42
};

const pendingConversations = new Map<string, MockPendingConversation>();
const mockStreamClosers = new Map<string, MockActiveStream>();

const buildAnswer = (message: string) => {
  if (/索道|营业|开门/.test(message)) {
    return {
      intent: "spot_question",
      attachments: [] as MessageAttachment[],
      content: "当前问题更适合直接命中 FAQ：索道通常会在开园后陆续运行，遇到天气或检修会临时调整，建议以当天景区公告为准。"
    };
  }

  if (/老人|轻松|少走|回头路|路线/.test(message)) {
    return {
      intent: "route_plan",
      attachments: [...attachmentLibrary.route, ...attachmentLibrary.spot],
      content: "我建议先走一条折返更少、步行压力更低的路线：从主观景平台开始，再顺着主游线推进，把讲解点压在沿途节点里，整体节奏会更稳。"
    };
  }

  if (/拍照|傍晚|日落/.test(message)) {
    return {
      intent: "route_plan",
      attachments: attachmentLibrary.route,
      content: "如果你更偏拍照，建议把路线放到傍晚，重点停留在光线变化最明显的两个平台，讲解比例可以稍微降低，把时间留给观景和取景。"
    };
  }

  if(/长文本/.test(message)) {
    return {
      intent: "complex_other",
      attachments: [] as MessageAttachment[],
      content: "这是一段长文本测试，主要用来测试分块发送的效果。".repeat(10)
    };
  }

  const contents = [
    "可以，我会基于你的时间和偏好给出更顺的游览建议。你也可以继续补充想看风景、听讲解还是少走路，我会把路线进一步收紧。",
    "这是一个比较复杂的场景，我会综合考虑你的需求给出建议，你也可以继续补充想看风景、听讲解还是少走路，我会把路线进一步收紧。",
    "我理解你想在有限的时间里尽可能多的体验景区，我会基于你的时间和偏好给出更顺的游览建议。",
    "两小时的时间比较紧张，但我会基于你的时间和偏好给出更顺的游览建议。你也可以继续补充想看风景、听讲解还是少走路？",
    "现在正值春季，景区里有很多花开了，如果你喜欢看花，我可以推荐一些赏花的路线和时间段。",
    "这里最值得看的当属主观景平台了，视野非常开阔，可以先去那里建立整体的方向感，再沿着主游线慢慢推进，这样能保证你在有限的时间里看到更多的风景。",
    "如果你喜欢听讲解，我可以在主游线上的一些重点节点给你补充一些轻讲解，这样整体的节奏会更稳，不会太赶。",
    "如果你想少走路，我可以帮你把路线缩短成两个重点节点，中间保留一些休息点，尽量避开坡度明显的路段，这样会更轻松一些。",
    "如果你想拍照，我建议你把路线放到傍晚，重点停留在光线变化最明显的两个平台，讲解比例可以稍微降低，把时间留给观景和取景，这样能拍出更好的照片。"
  ]

  return {
    intent: "complex_other",
    attachments: [] as MessageAttachment[],
    content: contents[Math.floor(Math.random() * contents.length)]
  };
};

const chunkText = (value: string) => {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += 12) {
    chunks.push(value.slice(index, index + 12));
  }
  return chunks;
};
const mockAudioChunks = [
  "UklGRhQBAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YfAAAAAAACYKoRF6FPIRswqlAGv2te6L68HtwvS3/gIJ",
  "8BBrFIgSxwvtAZP3b++l6zTttPNv/dYHLxBGFAsTzgw0A8P4OPDT67vss/Iq/KIGXQ8OFHoTyA14BPr5EvEW7FXswPHo+mcF",
  "ew7BE9YTtQ63BTj7+/Ft7ATs2vCs+ScEiw1gEx4Ukw/wBnv88vLY7MbrBPB2+OMCjQzsElEUYRAiCMH99vNW7Z3rP+9I95sB",
  "gwtkEnAUHhFMCQn/B/Xn7Yjriu4i9lIAbQrKEXsUyhFtClIAIvaK7ojr5+0H9Qn/TAkeEXAUZBKDC5sBSPc/753rVu0="
];

const mockConversationDetails: TouristConversationDetail[] = [
  {
    sessionId: "mock-history-1",
    visitorId: 1,
    scenicId: 1,
    turns: [
      {
        role: "user",
        content: "我只有两小时，想看风景，也想听一点轻讲解。",
        time: "2026-05-02 10:18"
      },
      {
        role: "assistant",
        content: "建议从主观景平台开始，再沿主游线慢慢推进。这样能先建立方向感，再把讲解点自然穿插进去，整体不会太赶。",
        time: "2026-05-02 10:18"
      },
      {
        role: "user",
        content: "如果带老人一起呢？",
        time: "2026-05-02 10:20"
      },
      {
        role: "assistant",
        content: "可以把路线缩短成两个重点节点，中间保留休息点，少走坡度明显的路段。",
        time: "2026-05-02 10:20"
      }
    ]
  },
  {
    sessionId: "mock-history-2",
    visitorId: 1,
    scenicId: 1,
    turns: [
      {
        role: "user",
        content: "傍晚适合走哪条拍照路线？",
        time: "2026-05-01 17:36"
      },
      {
        role: "assistant",
        content: "傍晚建议优先去光线变化明显的平台和湖岸转角，讲解比例可以降低，把时间留给取景和停留。",
        time: "2026-05-01 17:36"
      }
    ]
  }
];

const mockSessionDetails = new Map<string, TouristConversationDetail>(
  mockConversationDetails.map((detail) => [
    detail.sessionId,
    {
      ...detail,
      turns: detail.turns.map((turn) => ({ ...turn }))
    }
  ])
);

const buildConversationSummary = (detail: TouristConversationDetail) => {
  const firstUserTurn = detail.turns.find((turn) => turn.role === "user");
  const lastTurn = detail.turns[detail.turns.length - 1];

  return {
    sessionId: detail.sessionId,
    title: firstUserTurn?.content ?? "未命名会话",
    preview: lastTurn?.content ?? "",
    updatedAt: lastTurn?.time ?? ""
  };
};

export const getMockTouristBootstrap = async (payload: TouristBootstrapPayload = {}) => {
  const scenicId = payload.id ?? bootstrapData.scenicId;

  return {
    code: 200,
    msg: "操作成功",
    data: {
      ...bootstrapData,
      scenicId,
      scenic: {
        scenicName: bootstrapData.scenic.scenicName
      },
      digitalHuman: bootstrapData.digitalHuman ? { ...bootstrapData.digitalHuman, scenicId } : null
    }
  };
};

const buildMockAuthData = (userName: string, phonenumber?: string): TouristAuthData => ({
  token: `mock-tourist-token-${userName}`,
  userInfo: {
    userId: 100,
    userName,
    nickName: userName,
    ...(phonenumber ? { phonenumber } : {})
  }
});

export const registerMockTourist = async (payload: TouristRegisterPayload) => {
  await wait(80);

  return {
    code: 200,
    msg: "操作成功",
    data: buildMockAuthData(payload.userName, payload.phonenumber)
  };
};

export const loginMockTourist = async (payload: TouristLoginPayload) => {
  await wait(80);

  return {
    code: 200,
    msg: "操作成功",
    data: buildMockAuthData(payload.userName)
  };
};

export const submitMockTouristChat = async (payload: TouristChatPayload) => {
  await wait(60);

  const conversationId = `mock-conversation-${Date.now()}-${mockConversationSequence}`;
  mockConversationSequence += 1;
  const sessionId = payload.sessionId ?? `mock-session-${Date.now()}`;
  const scenicId = payload.scenicId ?? 1;
  const visitorId = payload.visitorId ?? "mock-visitor";

  const existingSession = mockSessionDetails.get(sessionId);
  if (!existingSession) {
    mockSessionDetails.set(sessionId, {
      sessionId,
      visitorId,
      scenicId,
      turns: []
    });
  }

  mockSessionDetails.get(sessionId)?.turns.push({
    role: "user",
    content: payload.message,
    time: new Date().toISOString()
  });

  pendingConversations.set(conversationId, {
    conversationId,
    answer: buildAnswer(payload.message),
    sessionId,
    scenicId,
    visitorId,
    userMessage: payload.message,
    completed: false
  });

  return {
    code: 200,
    msg: "操作成功",
    data: {
      conversationId,
      sessionId
    }
  };
};

export const subscribeMockTouristStream = (
  conversationId: string,
  handlers: TouristStreamHandlers
): TouristStreamSubscription => {
  let closed = false;
  let interrupted = false;

  const close = () => {
    if (closed) {
      return;
    }

    closed = true;
    mockStreamClosers.delete(conversationId);
    pendingConversations.delete(conversationId);
  };

  const emitInterrupted = () => {
    if (closed || interrupted) {
      return;
    }

    interrupted = true;
    handlers.onEvent({
      event: "error",
      message: "interrupted",
      interrupted: true
    });
  };

  const pendingConversation = pendingConversations.get(conversationId);
  if (!pendingConversation) {
    queueMicrotask(() => {
      if (closed) return;
      handlers.onEvent({
        event: "error",
        message: "未找到会话流"
      });
      close();
    });

    return { close };
  }

  mockStreamClosers.set(conversationId, {
    close,
    emitInterrupted
  });

  void (async () => {
    await wait(getMockThinkingDelay());
    if (closed) return;

    handlers.onEvent({
      event: "metadata",
      sessionId: pendingConversation.sessionId,
      intent: pendingConversation.answer.intent,
      attachments: pendingConversation.answer.attachments
    });

    mockAudioChunks.forEach((chunk, index) => {
      handlers.onEvent({
        event: "audio",
        seq: index + 1,
        chunk,
        mimeType: "audio/wav",
        audioCostMs: 0,
        serverTime: Date.now()
      });
    });

    for (const chunk of chunkText(pendingConversation.answer.content)) {
      await wait(getMockChunkDelay());
      if (closed) return;
      handlers.onEvent({
        event: "answer_fragment",
        content: chunk
      });
    }

    await wait(60);
    if (closed) return;
    pendingConversation.completed = true;
    const sessionDetail = mockSessionDetails.get(pendingConversation.sessionId);
    sessionDetail?.turns.push({
      role: "assistant",
      content: pendingConversation.answer.content,
      time: new Date().toISOString()
    });
    handlers.onEvent({
      event: "done",
      totalCostMs: 420
    });
    pendingConversations.delete(conversationId);
    close();
  })();

  return { close };
};

export const interruptMockTouristChat = async (sessionId: string) => {
  await wait(40);
  for (const [conversationId, pendingConversation] of pendingConversations.entries()) {
    if (pendingConversation.sessionId !== sessionId) {
      continue;
    }
    mockStreamClosers.get(conversationId)?.emitInterrupted();
    mockStreamClosers.get(conversationId)?.close();
  }
};

export const endMockTouristChat = async (payload: TouristChatEndPayload) => {
  await wait(40);

  const sessionDetail = mockSessionDetails.get(payload.sessionId);
  if (!sessionDetail || sessionDetail.turns.length === 0) {
    return;
  }

  sessionDetail.scenicId = payload.scenicId ?? sessionDetail.scenicId ?? 1;
  if (payload.visitorId !== undefined) {
    sessionDetail.visitorId = payload.visitorId;
  }
};

export const getMockConversationList = async (payload: TouristConversationListPayload) => {
  await wait(120);

  const page = payload.page ?? 1;
  const size = payload.size ?? 10;
  const start = (page - 1) * size;
  const allList = Array.from(mockSessionDetails.values())
    .filter((detail) => detail.turns.length > 0)
    .filter((detail) => payload.scenicId === undefined || payload.scenicId === null || String(detail.scenicId) === String(payload.scenicId))
    .map(buildConversationSummary)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const visitorScopedList = Array.from(mockSessionDetails.values())
    .filter((detail) => detail.turns.length > 0)
    .filter((detail) => String(detail.visitorId) === String(payload.visitorId))
    .filter((detail) => payload.scenicId === undefined || payload.scenicId === null || String(detail.scenicId) === String(payload.scenicId))
    .map(buildConversationSummary)
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  const list = visitorScopedList.length > 0 ? visitorScopedList : allList;

  return {
    code: 200,
    msg: "操作成功",
    data: {
      list: list.slice(start, start + size),
      total: list.length,
      page,
      size
    } satisfies TouristConversationListData
  };
};

export const getMockConversationDetail = async (sessionId: string) => {
  await wait(120);

  return {
    code: 200,
    msg: "操作成功",
    data: mockSessionDetails.get(sessionId) ?? {
      sessionId,
      visitorId: "mock-visitor",
      scenicId: 1,
      turns: []
    }
  };
};

export const getMockQuickPrompts = () => quickPromptsMock;

export const getInitialMockConversation = (greeting: string): ConversationMessage[] => [
  {
    id: "assistant-bootstrap",
    role: "assistant",
    content: greeting
  }
];
