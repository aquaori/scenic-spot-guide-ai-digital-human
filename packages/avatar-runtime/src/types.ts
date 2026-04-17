export type AvatarPartKey = "hair" | "top" | "bottom" | "shoes" | "accessory";

export type AvatarExpressionKey =
  | "neutral"
  | "smile"
  | "thinking"
  | "speaking"
  | "surprised";

export type AvatarMotionKey = "idle" | "greeting" | "answer" | "wave";

export type AvatarPartOption = {
  id: string;
  label: string;
  assetUrl?: string;
  thumbnailUrl?: string;
};

export type AvatarPreset = {
  id: string;
  label: string;
  previewImageUrl?: string;
  parts: Partial<Record<AvatarPartKey, string>>;
};

export type AvatarMotionBinding = {
  name: AvatarMotionKey | (string & {});
  label: string;
  clipUrl?: string;
  loop?: boolean;
};

export type AvatarExpressionBinding = {
  name: AvatarExpressionKey | (string & {});
  label: string;
  preset: AvatarExpressionKey | (string & {});
  previewImageUrl?: string;
};

export type AvatarStageConfig = {
  background?: string;
  lightIntensity?: number;
};

export type AvatarCameraConfig = {
  distance?: number;
  yaw?: number;
  pitch?: number;
};

export type AvatarVoiceConfig = {
  voiceId: string;
  speed: number;
  pitch: number;
  volume: number;
  enableLipSync: boolean;
};

export type AvatarConfig = {
  version: 1;
  modelUrl: string;
  previewImageUrl?: string;
  presetId?: string;
  bodyPresetId?: string;
  parts: Partial<Record<AvatarPartKey, string>>;
  partOptions?: Partial<Record<AvatarPartKey, AvatarPartOption[]>>;
  presets: AvatarPreset[];
  motions: AvatarMotionBinding[];
  expressions: AvatarExpressionBinding[];
  camera?: AvatarCameraConfig;
  stage?: AvatarStageConfig;
  voice?: AvatarVoiceConfig;
};

export type AvatarLoadOptions = {
  canvas: HTMLCanvasElement;
  config: AvatarConfig;
};

export type AvatarRuntimeState = {
  activeMotion?: string;
  activeExpression?: string;
  speaking: boolean;
  loadedModelUrl?: string;
};

export type AvatarRuntimeHandle = {
  resize: (width: number, height: number) => void;
  updatePointer: (clientX: number, clientY: number, rect: DOMRect) => void;
  resetPointer: () => void;
  tick: (deltaTimeSeconds: number) => void;
  loadAvatar: (config: AvatarConfig) => Promise<void>;
  playMotion: (name: string) => Promise<boolean>;
  setExpression: (name: string, weight?: number) => void;
  speak: (audioUrl: string) => Promise<void>;
  getState: () => AvatarRuntimeState;
  dispose: () => void;
};
