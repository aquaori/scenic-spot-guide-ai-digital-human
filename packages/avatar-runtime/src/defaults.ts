import type { AvatarConfig } from "./types";

const defaultVoice = {
  voiceId: "xiaomei",
  speed: 1,
  pitch: 1,
  volume: 1,
  enableLipSync: true,
} as const;

export const demoAvatarConfig: AvatarConfig = {
  version: 1,
  modelUrl: "/avatar/xiaoA/models/xiaoA.vrm",
  previewImageUrl: "/avatar/xiaoA/previews/preview.png",
  presetId: "xiaoA-default",
  bodyPresetId: "xiaoA-base",
  parts: {
    hair: "xiaoA-default",
    top: "xiaoA-default",
    bottom: "xiaoA-default",
    shoes: "xiaoA-default",
    accessory: "xiaoA-default",
  },
  partOptions: {
    hair: [
      { id: "xiaoA-default", label: "默认发型" },
      { id: "xiaoA-uniform", label: "制服发型" },
    ],
    top: [
      { id: "xiaoA-default", label: "默认上装" },
      { id: "xiaoA-uniform", label: "制服上装" },
    ],
    bottom: [
      { id: "xiaoA-default", label: "默认下装" },
      { id: "xiaoA-uniform", label: "制服下装" },
    ],
    shoes: [
      { id: "xiaoA-default", label: "默认鞋履" },
      { id: "xiaoA-uniform", label: "制服鞋履" },
    ],
    accessory: [
      { id: "xiaoA-default", label: "默认配饰" },
      { id: "xiaoA-uniform", label: "制服配饰" },
    ],
  },
  presets: [
    {
      id: "xiaoA-default",
      label: "默认形象",
      previewImageUrl: "/avatar/xiaoA/previews/preview.png",
      parts: {
        hair: "xiaoA-default",
        top: "xiaoA-default",
        bottom: "xiaoA-default",
        shoes: "xiaoA-default",
        accessory: "xiaoA-default",
      },
    },
    {
      id: "xiaoA-uniform",
      label: "制服形象",
      previewImageUrl: "/avatar/xiaoA/previews/preview.png",
      parts: {
        hair: "xiaoA-uniform",
        top: "xiaoA-uniform",
        bottom: "xiaoA-uniform",
        shoes: "xiaoA-uniform",
        accessory: "xiaoA-uniform",
      },
    },
  ],
  motions: [
    { name: "idle", label: "待机", loop: true, clipUrl: "/avatar/xiaoA/motions/Idle.fbx" },
    { name: "greeting", label: "欢迎", clipUrl: "/avatar/xiaoA/motions/Waving.fbx" },
    { name: "answer", label: "讲解", clipUrl: "/avatar/xiaoA/motions/Talking.fbx" },
    { name: "nod", label: "点头", clipUrl: "/avatar/xiaoA/motions/Nodding.fbx" },
  ],
  expressions: [
    { name: "neutral", label: "自然", preset: "neutral" },
    { name: "smile", label: "微笑", preset: "smile" },
    { name: "thinking", label: "思考", preset: "thinking" },
    { name: "speaking", label: "说话", preset: "speaking" },
    { name: "surprised", label: "惊喜", preset: "surprised" },
  ],
  camera: {
    yaw: 0,
    pitch: 0.08,
  },
  stage: {
    background: "linear-gradient(180deg, #ffffff 0%, #eef6ff 100%)",
    lightIntensity: 1.35,
  },
  voice: defaultVoice,
};

export function createDefaultAvatarConfig(overrides?: Partial<AvatarConfig>): AvatarConfig {
  const voice = overrides?.voice
    ? {
        voiceId: overrides.voice.voiceId ?? defaultVoice.voiceId,
        speed: overrides.voice.speed ?? defaultVoice.speed,
        pitch: overrides.voice.pitch ?? defaultVoice.pitch,
        volume: overrides.voice.volume ?? defaultVoice.volume,
        enableLipSync: overrides.voice.enableLipSync ?? defaultVoice.enableLipSync,
      }
    : defaultVoice;

  return {
    ...demoAvatarConfig,
    ...overrides,
    parts: {
      ...demoAvatarConfig.parts,
      ...(overrides?.parts ?? {}),
    },
    partOptions: {
      ...demoAvatarConfig.partOptions,
      ...(overrides?.partOptions ?? {}),
    },
    presets: overrides?.presets ?? demoAvatarConfig.presets,
    motions: overrides?.motions ?? demoAvatarConfig.motions,
    expressions: overrides?.expressions ?? demoAvatarConfig.expressions,
    camera: {
      ...demoAvatarConfig.camera,
      ...(overrides?.camera ?? {}),
    },
    stage: {
      ...demoAvatarConfig.stage,
      ...(overrides?.stage ?? {}),
    },
    voice,
  };
}
