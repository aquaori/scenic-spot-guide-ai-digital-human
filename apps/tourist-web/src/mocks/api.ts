import {
  quickPromptsMock,
  type ConversationMessage,
  type MessageAttachment
} from "./guide";
import type {
  TouristBootstrapData,
  TouristBootstrapPayload,
  TouristChatEndPayload,
  TouristStreamHandlers,
  TouristStreamPayload
} from "../api/tourist";

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
const getMockThinkingDelay = () => 700 + Math.floor(Math.random() * 1400);
const getMockChunkDelay = () => 140 + Math.floor(Math.random() * 140);

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
  digitalHuman: {
    id: 1,
    scenicId: 1,
    humanName: "景区导览 AI 数字人",
    defaultGreeting: "欢迎来到景区，我可以按时间、体力和偏好帮你安排行程，也可以直接讲景点和路线。",
    lipSync: 1,
    isDefault: 1
  }
};

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

  return {
    intent: "complex_other",
    attachments: [] as MessageAttachment[],
    content: "可以，我会基于你的时间和偏好给出更顺的游览建议。你也可以继续补充想看风景、听讲解还是少走路，我会把路线进一步收紧。"
  };
};

const chunkText = (value: string) => {
  const chunks: string[] = [];
  for (let index = 0; index < value.length; index += 12) {
    chunks.push(value.slice(index, index + 12));
  }
  return chunks;
};

export const getMockTouristBootstrap = async (payload: TouristBootstrapPayload = {}) => {
  const scenicId = payload.id ?? bootstrapData.scenicId;

  return {
    code: 200,
    msg: "操作成功",
    data: {
      ...bootstrapData,
      scenicId,
      digitalHuman: bootstrapData.digitalHuman ? { ...bootstrapData.digitalHuman, scenicId } : null
    }
  };
};

export const openMockTouristStream = async (payload: TouristStreamPayload, handlers: TouristStreamHandlers) => {
  const answer = buildAnswer(payload.message);
  const sessionId = payload.sessionId ?? `mock-session-${Date.now()}`;

  await wait(getMockThinkingDelay());
  handlers.onEvent({
    event: "metadata",
    sessionId,
    intent: answer.intent,
    attachments: answer.attachments
  });

  for (const chunk of chunkText(answer.content)) {
    await wait(getMockChunkDelay());
    handlers.onEvent({
      event: "answer_fragment",
      content: chunk
    });
  }

  await wait(60);
  handlers.onEvent({
    event: "done",
    totalCostMs: 420
  });
};

export const endMockTouristChat = async (_payload: TouristChatEndPayload) => {
  await wait(40);
};

export const getMockQuickPrompts = () => quickPromptsMock;

export const getInitialMockConversation = (greeting: string): ConversationMessage[] => [
  {
    id: "assistant-bootstrap",
    role: "assistant",
    content: greeting
  }
];
