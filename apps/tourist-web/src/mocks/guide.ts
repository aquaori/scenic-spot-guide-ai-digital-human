export type RouteItem = {
  id: string;
  title: string;
  summary: string;
  duration: string;
  tags: string[];
};

export type RouteAttachment = {
  id: string;
  type: "routes";
  eyebrow: string;
  title: string;
  meta: string;
  items: RouteItem[];
};

export type SpotMetric = {
  label: string;
  value: string;
};

export type SpotAttachment = {
  id: string;
  type: "spot";
  eyebrow: string;
  title: string;
  description: string;
  metrics: SpotMetric[];
};

export type MessageAttachment = RouteAttachment | SpotAttachment;

export type ConversationMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: MessageAttachment[];
};

export const topFeaturesMock = ["路线推荐", "景点讲解"] as const;

export const quickPromptsMock = [
  "给我一条轻松路线",
  "先讲讲这里最值得看的地方",
  "适合现在去哪里",
  "两小时怎么安排"
] as const;

export const conversationMock: ConversationMessage[] = [
  {
    id: "user-1",
    role: "user",
    content: "我现在只有两小时，想先看风景，再听一点历史，别安排得太紧。"
  },
  {
    id: "assistant-1",
    role: "assistant",
    content:
      "可以。我会先给你一条更顺的看景路线，再把需要讲解的内容插进去，不会让你频繁折返。先从望湖平台开始比较合适，它能很快建立整体印象，之后沿湖岸步道继续走，既轻松，也能自然过渡到讲解点。",
    attachments: [
      {
        id: "routes-1",
        type: "routes",
        eyebrow: "Route Recommendation",
        title: "两小时看景路线",
        meta: "约 110 分钟",
        items: [
          {
            id: "route-1",
            title: "湖岸舒展线",
            summary: "先建立视野，再沿水边推进，整体最轻松。",
            duration: "110 分钟",
            tags: ["看景", "轻松", "适合第一次来"]
          },
          {
            id: "route-2",
            title: "看景 + 讲解线",
            summary: "把讲解点压进沿途节点里，边走边听更自然。",
            duration: "135 分钟",
            tags: ["讲解", "节奏均衡", "信息量更高"]
          }
        ]
      },
      {
        id: "spot-1",
        type: "spot",
        eyebrow: "Spot Explanation",
        title: "望湖平台",
        description:
          "这里适合作为起点，因为视野打开得很快，几乎不用额外铺垫就能把空间关系讲清楚。站在这里先看一圈，再进入后续路线，会让整段导览更顺。",
        metrics: [
          {
            label: "建议停留",
            value: "15 到 20 分钟"
          },
          {
            label: "推荐时段",
            value: "上午或日落前"
          }
        ]
      }
    ]
  },
  {
    id: "user-2",
    role: "user",
    content: "如果我想一路上少走回头路，优先去哪些点会比较顺？"
  },
  {
    id: "assistant-2",
    role: "assistant",
    content:
      "那我会把路线收成一条更顺的线性路径：先到望湖平台建立整体印象，再沿湖岸步道一路推进，最后在展馆区域结束。这样你基本不需要折返，节奏也更流畅。"
  },
  {
    id: "user-3",
    role: "user",
    content: "沿湖岸这一段有什么值得听的内容？不要太学术，轻一点。"
  },
  {
    id: "assistant-3",
    role: "assistant",
    content:
      "可以把讲解重心放在几段更有画面感的故事上，比如这片区域为什么适合观景、早年游览动线是怎么形成的，以及现在最适合停留和拍照的位置。这样听起来不会太硬。"
  },
  {
    id: "user-4",
    role: "user",
    content: "那如果我带着家里老人一起，路线要不要调整？"
  },
  {
    id: "assistant-4",
    role: "assistant",
    content:
      "建议调整。可以减少坡度变化明显的段落，把停留点换成视野好、步行压力小的位置，同时把路线切成两到三个短段，中间穿插休息点，会更舒适。"
  },
  {
    id: "user-5",
    role: "user",
    content: "给我一个适合老人、节奏慢一点的版本。"
  },
  {
    id: "assistant-5",
    role: "assistant",
    content:
      "可以，我会保留核心观景点，但把路线长度和步速都压下来，优先选择平缓、休息方便的节点。你会先到视野最好的位置，再慢慢往下一个讲解点移动。",
    attachments: [
      {
        id: "routes-2",
        type: "routes",
        eyebrow: "Route Recommendation",
        title: "舒缓慢行路线",
        meta: "约 95 分钟",
        items: [
          {
            id: "route-3",
            title: "平缓观景线",
            summary: "步行距离更短，停留点更集中，适合慢节奏游览。",
            duration: "95 分钟",
            tags: ["老人友好", "慢节奏", "休息点更多"]
          },
          {
            id: "route-4",
            title: "短距讲解线",
            summary: "保留一处重点讲解和一处主景观点，减少移动负担。",
            duration: "80 分钟",
            tags: ["轻讲解", "少折返", "短距离"]
          }
        ]
      },
      {
        id: "spot-2",
        type: "spot",
        eyebrow: "Spot Explanation",
        title: "湖岸步道起点",
        description:
          "这里适合做缓慢路线的开端，因为起步阶段视野不错、空间开阔，而且能比较自然地控制节奏，不会一开始就给体力造成负担。",
        metrics: [
          {
            label: "建议停留",
            value: "10 到 15 分钟"
          },
          {
            label: "路线特点",
            value: "平缓、停留点密集"
          }
        ]
      }
    ]
  },
  {
    id: "user-6",
    role: "user",
    content: "如果我更想拍照，应该在哪个时间段走这条线？"
  },
  {
    id: "assistant-6",
    role: "assistant",
    content:
      "傍晚版本会把重心进一步往观景节点倾斜，压缩讲解比例，把停留时间更多留给光线变化最明显的两个点位。整体动线差别不大，但停留顺序会略调。",
    attachments: [
      {
        id: "routes-3",
        type: "routes",
        eyebrow: "Route Recommendation",
        title: "傍晚观景路线",
        meta: "约 100 分钟",
        items: [
          {
            id: "route-5",
            title: "日落平台线",
            summary: "优先覆盖光线变化最明显的节点，适合傍晚看景和拍照。",
            duration: "100 分钟",
            tags: ["傍晚", "拍照", "视野优先"]
          },
          {
            id: "route-6",
            title: "晚霞慢行线",
            summary: "放慢节奏，把停留时间更多留给景观平台和湖岸转角。",
            duration: "105 分钟",
            tags: ["慢行", "晚霞", "轻讲解"]
          }
        ]
      }
    ]
  },
  {
    id: "user-7",
    role: "user",
    content: "可以，最后帮我总结一下你最推荐哪一条，并说一下理由。"
  },
  {
    id: "assistant-7",
    role: "assistant",
    content:
      "如果你只有两小时，又希望兼顾风景、轻讲解和舒适度，我最推荐最开始那条两小时看景路线。它的信息密度和节奏比较平衡，既能快速建立整体印象，也能把重点内容自然地穿进去，不会显得赶。"
  }
];
