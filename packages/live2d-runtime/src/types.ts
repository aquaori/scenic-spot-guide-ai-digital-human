export type CubismLogLevel = "verbose" | "warning" | "error" | "off";

export type CubismBootstrapOptions = {
  memorySize?: number;
  logFunction?: Live2DCubismCore.csmLogFunction;
  loggingLevel?: CubismLogLevel;
};

export type Live2DModelSource = {
  modelJsonUrl: string;
};

export type Live2DCanvasBinding = {
  canvas: HTMLCanvasElement;
};

export type Live2DStageLayout = {
  landscapeHeight?: number;
  portraitHeight?: number;
  scaleX?: number;
  offsetX?: number;
  offsetY?: number;
};

export type Live2DLoadOptions = Live2DCanvasBinding &
  Live2DModelSource & {
    layout?: Live2DStageLayout;
  };

export type Live2DModelHandle = {
  resize: (width: number, height: number) => void;
  updatePointer: (clientX: number, clientY: number, rect: DOMRect) => void;
  resetPointer: () => void;
  tick: (deltaTimeSeconds: number) => void;
  playMotion: (groupName: string, index?: number) => Promise<boolean>;
  speak: (audioUrl: string) => Promise<void>;
  dispose: () => void;
};
