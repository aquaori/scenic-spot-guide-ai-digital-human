/// <reference path="../vendor/Core/live2dcubismcore.d.ts" />

import coreScriptUrl from "../vendor/Core/live2dcubismcore.js?url";

import type {
  CubismBootstrapOptions,
  Live2DLoadOptions,
  Live2DModelHandle,
  Live2DStageLayout,
} from "./types";

type CubismGlobal = typeof globalThis & {
  Live2DCubismCore?: typeof Live2DCubismCore;
};

const DEFAULT_SHADER_PATH = "/live2d-shaders/";

function resolveLoggingLevel(level: CubismBootstrapOptions["loggingLevel"]): number {
  switch (level) {
    case "verbose":
      return 0;
    case "warning":
      return 1;
    case "error":
      return 2;
    case "off":
    default:
      return 3;
  }
}

export function getCubismCore(): typeof Live2DCubismCore {
  const core = (globalThis as CubismGlobal).Live2DCubismCore;

  if (!core) {
    throw new Error("Live2D Cubism Core failed to initialize.");
  }

  return core;
}

let coreScriptLoadingPromise: Promise<void> | null = null;
let frameworkModulesPromise: Promise<{
  CubismFramework: any;
  CubismModelSettingJson: any;
  CubismUserModel: any;
  CubismEyeBlink: any;
}> | null = null;

export async function ensureCubismCoreLoaded(): Promise<void> {
  if ((globalThis as CubismGlobal).Live2DCubismCore) {
    return;
  }

  if (!coreScriptLoadingPromise) {
    coreScriptLoadingPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        'script[data-live2d-cubism-core="true"]',
      );

      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load Live2D Cubism Core script.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.src = coreScriptUrl;
      script.async = true;
      script.dataset.live2dCubismCore = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Live2D Cubism Core script."));
      document.head.appendChild(script);
    }).then(() => {
      if (!(globalThis as CubismGlobal).Live2DCubismCore) {
        throw new Error("Live2D Cubism Core is not available on window after script load.");
      }
    });
  }

  await coreScriptLoadingPromise;
}

type CubismFrameworkOption = {
  logFunction: Live2DCubismCore.csmLogFunction | null;
  loggingLevel: number;
};

export function createCubismFrameworkOption(
  options: CubismBootstrapOptions = {},
): CubismFrameworkOption {
  return {
    logFunction: options.logFunction ?? null,
    loggingLevel: resolveLoggingLevel(options.loggingLevel),
  };
}

async function loadFrameworkModules() {
  if (!frameworkModulesPromise) {
    frameworkModulesPromise = Promise.all([
      import("../vendor/Framework/src/live2dcubismframework"),
      import("../vendor/Framework/src/cubismmodelsettingjson"),
      import("../vendor/Framework/src/model/cubismusermodel"),
      import("../vendor/Framework/src/effect/cubismeyeblink"),
    ]).then(([frameworkModule, modelSettingModule, userModelModule, eyeBlinkModule]) => ({
      CubismFramework: frameworkModule.CubismFramework,
      CubismModelSettingJson: modelSettingModule.CubismModelSettingJson,
      CubismUserModel: userModelModule.CubismUserModel,
      CubismEyeBlink: eyeBlinkModule.CubismEyeBlink,
    }));
  }

  return frameworkModulesPromise;
}

export async function ensureCubismStarted(
  options: CubismBootstrapOptions = {},
): Promise<void> {
  await ensureCubismCoreLoaded();
  getCubismCore();
  const { CubismFramework } = await loadFrameworkModules();

  if (!CubismFramework.isStarted()) {
    CubismFramework.startUp(createCubismFrameworkOption(options));
  }

  if (!CubismFramework.isInitialized()) {
    CubismFramework.initialize(options.memorySize ?? 0);
  }
}

export function disposeCubismFramework(): void {
  if (!frameworkModulesPromise) {
    return;
  }

  void frameworkModulesPromise.then(({ CubismFramework }) => {
    if (CubismFramework.isInitialized()) {
      CubismFramework.dispose();
    }

    if (CubismFramework.isStarted()) {
      CubismFramework.cleanUp();
    }
  });
}

function resolveAssetUrl(baseUrl: string, relativePath: string): string {
  return new URL(relativePath, baseUrl).toString();
}

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch Live2D asset: ${url}`);
  }

  return response.arrayBuffer();
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.crossOrigin = "anonymous";

  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`Failed to load texture: ${url}`));
  });

  image.src = url;
  await loaded;

  if ("decode" in image) {
    try {
      await image.decode();
    } catch {
      // decode is best-effort here.
    }
  }

  return image;
}

function createGlTexture(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  image: HTMLImageElement,
): WebGLTexture {
  const texture = gl.createTexture();

  if (!texture) {
    throw new Error("Failed to create WebGL texture for Live2D model.");
  }

  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return texture;
}

function updateCanvasSize(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext | WebGL2RenderingContext,
  width: number,
  height: number,
): void {
  const pixelRatio = Math.max(window.devicePixelRatio || 1, 2);
  const nextWidth = Math.max(Math.floor(width * pixelRatio), 1);
  const nextHeight = Math.max(Math.floor(height * pixelRatio), 1);

  if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
    canvas.width = nextWidth;
    canvas.height = nextHeight;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
}

function updateModelMatrix(
  model: any,
  width: number,
  height: number,
  layout: Live2DStageLayout = {},
) {
  const matrix = model.getModelMatrix();
  matrix.loadIdentity();

  const viewAspect = width / Math.max(height, 1);
  const {
    landscapeHeight = 1.5,
    portraitHeight = 1.6,
    scaleX = 2,
    offsetX = 1.2,
    offsetY = 0.5,
  } = layout;

  if (viewAspect > 1) {
    matrix.setHeight(landscapeHeight);
  } else {
    matrix.setHeight(portraitHeight);
  }
  matrix.scaleRelative(scaleX, 1);
  matrix.setCenterPosition(offsetX, offsetY);
  return matrix;
}

function getEffectParameterIds(
  modelSetting: any,
  kind: "EyeBlink" | "LipSync",
): any[] {
  const count =
    kind === "EyeBlink"
      ? modelSetting.getEyeBlinkParameterCount?.() ?? 0
      : modelSetting.getLipSyncParameterCount?.() ?? 0;

  const ids: any[] = [];

  for (let index = 0; index < count; index += 1) {
    const id =
      kind === "EyeBlink"
        ? modelSetting.getEyeBlinkParameterId?.(index)
        : modelSetting.getLipSyncParameterId?.(index);

    if (id) {
      ids.push(id);
    }
  }

  return ids;
}

function normalizeMotionGroupMap(modelSetting: any): Map<string, number> {
  const groups = new Map<string, number>();
  const groupCount = modelSetting.getMotionGroupCount?.() ?? 0;

  for (let index = 0; index < groupCount; index += 1) {
    const groupName = modelSetting.getMotionGroupName?.(index);
    if (!groupName) {
      continue;
    }

    groups.set(groupName, modelSetting.getMotionCount?.(groupName) ?? 0);
  }

  return groups;
}

function resolveIdleGroupName(groupMap: Map<string, number>): string | null {
  for (const groupName of groupMap.keys()) {
    if (groupName.toLowerCase() === "idle") {
      return groupName;
    }
  }

  return null;
}

export async function loadLive2DModel(
  options: Live2DLoadOptions,
): Promise<Live2DModelHandle> {
  await ensureCubismStarted();
  const { CubismFramework, CubismModelSettingJson, CubismUserModel, CubismEyeBlink } =
    await loadFrameworkModules();

  const { canvas, modelJsonUrl, layout } = options;
  const gl =
    canvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    }) ??
    canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
    });

  if (!gl) {
    throw new Error("WebGL is not available in the current browser.");
  }

  const modelSettingBuffer = await fetchArrayBuffer(modelJsonUrl);
  console.info("[live2d] model json loaded", modelJsonUrl, modelSettingBuffer.byteLength);
  const modelSetting = new CubismModelSettingJson(
    modelSettingBuffer,
    modelSettingBuffer.byteLength,
  );

  const normalizedModelUrl = new URL(modelJsonUrl, window.location.href).toString();
  const modelBaseUrl = new URL(".", normalizedModelUrl).toString();
  const userModel = new CubismUserModel() as any;
  const eyeBlinkParameterIds = getEffectParameterIds(modelSetting, "EyeBlink");
  const lipSyncParameterIds = getEffectParameterIds(modelSetting, "LipSync");
  const motionGroups = normalizeMotionGroupMap(modelSetting);
  const motionCache = new Map<string, any>();
  const idleGroupName = resolveIdleGroupName(motionGroups);
  const idleMotionCount = idleGroupName ? motionGroups.get(idleGroupName) ?? 0 : 0;
  let lastIdleMotionIndex = -1;
  let pendingIdleMotion: Promise<boolean> | null = null;
  const audioElement = new Audio();
  audioElement.preload = "auto";
  let audioContext: AudioContext | null = null;
  let audioSourceNode: MediaElementAudioSourceNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  let analyserData: Uint8Array | null = null;
  let currentLipSyncValue = 0;
  const idManager = CubismFramework.getIdManager();
  const followIds = {
    angleX: idManager.getId("PARAM_ANGLE_X"),
    angleY: idManager.getId("PARAM_ANGLE_Y"),
    angleZ: idManager.getId("PARAM_ANGLE_Z"),
    bodyAngleX: idManager.getId("PARAM_BODY_ANGLE_X"),
    eyeBallX: idManager.getId("PARAM_EYE_BALL_X"),
    eyeBallY: idManager.getId("PARAM_EYE_BALL_Y"),
  };

  userModel.updateFrame = (deltaTimeSeconds: number) => {
    const model = userModel.getModel?.();

    if (!model) {
      return;
    }

    const motionUpdated =
      userModel._motionManager?.updateMotion?.(model, deltaTimeSeconds) ?? false;

    if (!motionUpdated) {
      userModel._eyeBlink?.updateParameters?.(model, deltaTimeSeconds);
    }

    userModel._expressionManager?.updateMotion?.(model, deltaTimeSeconds);
    userModel._dragManager?.update(deltaTimeSeconds);
    const dragX = userModel._dragManager?.getX?.() ?? 0;
    const dragY = userModel._dragManager?.getY?.() ?? 0;
    let nextLipSyncValue = currentLipSyncValue * 0.84;

    if (analyserNode && analyserData && !audioElement.paused && !audioElement.ended) {
      analyserNode.getByteTimeDomainData(analyserData as Uint8Array<ArrayBuffer>);

      let sum = 0;
      for (let index = 0; index < analyserData.length; index += 1) {
        const centered = (analyserData[index] - 128) / 128;
        sum += centered * centered;
      }

      const rms = Math.sqrt(sum / analyserData.length);
      const targetLipSyncValue = Math.min(1, rms * 4.2);
      nextLipSyncValue = nextLipSyncValue * 0.65 + targetLipSyncValue * 0.35;
    }

    currentLipSyncValue = nextLipSyncValue;

    model.addParameterValueById(followIds.angleX, dragX * 24);
    model.addParameterValueById(followIds.angleY, dragY * 18);
    model.addParameterValueById(followIds.angleZ, dragX * dragY * -8);
    model.addParameterValueById(followIds.bodyAngleX, dragX * 8);
    model.addParameterValueById(followIds.eyeBallX, dragX);
    model.addParameterValueById(followIds.eyeBallY, dragY);
    for (const lipSyncId of lipSyncParameterIds) {
      model.addParameterValueById(lipSyncId, currentLipSyncValue);
    }

    userModel._physics?.evaluate?.(model, deltaTimeSeconds);
    userModel._pose?.updateParameters?.(model, deltaTimeSeconds);
    model.update();
  };

  const mocBuffer = await fetchArrayBuffer(
    resolveAssetUrl(modelBaseUrl, modelSetting.getModelFileName()),
  );
  console.info("[live2d] moc loaded", modelSetting.getModelFileName(), mocBuffer.byteLength);
  userModel.loadModel(mocBuffer, false);
  console.info("[live2d] model canvas size", {
    width: userModel.getModel()?.getCanvasWidth?.(),
    height: userModel.getModel()?.getCanvasHeight?.(),
  });

  const physicsFile = modelSetting.getPhysicsFileName();
  if (physicsFile) {
    const physicsBuffer = await fetchArrayBuffer(resolveAssetUrl(modelBaseUrl, physicsFile));
    userModel.loadPhysics(physicsBuffer, physicsBuffer.byteLength);
  }

  if (CubismEyeBlink && eyeBlinkParameterIds.length > 0) {
    userModel._eyeBlink = CubismEyeBlink.create(modelSetting);
  }

  const poseFile = modelSetting.getPoseFileName();
  if (poseFile) {
    const poseBuffer = await fetchArrayBuffer(resolveAssetUrl(modelBaseUrl, poseFile));
    userModel.loadPose(poseBuffer, poseBuffer.byteLength);
    userModel._pose?.updateParameters?.(userModel.getModel?.(), 0);
  }

  userModel.createRenderer(canvas.width, canvas.height);
  const renderer = userModel.getRenderer();
  renderer.startUp(gl);
  renderer.setIsPremultipliedAlpha(true);

  const textures = await Promise.all(
    Array.from({ length: modelSetting.getTextureCount() }, async (_, textureIndex) => {
      const textureUrl = resolveAssetUrl(modelBaseUrl, modelSetting.getTextureFileName(textureIndex));
      const textureImage = await loadImage(
        textureUrl,
      );
      const texture = createGlTexture(gl, textureImage);
      renderer.bindTexture(textureIndex, texture);
      console.info("[live2d] texture bound", textureIndex, textureUrl, textureImage.width, textureImage.height);
      return texture;
    }),
  );

  let viewportWidth = canvas.clientWidth || canvas.width || 1;
  let viewportHeight = canvas.clientHeight || canvas.height || 1;

  updateCanvasSize(canvas, gl, viewportWidth, viewportHeight);
  renderer.setRenderState(null, [0, 0, canvas.width, canvas.height]);
  renderer.setMvpMatrix(updateModelMatrix(userModel, viewportWidth, viewportHeight, layout));
  console.info("[live2d] renderer ready", {
    viewportWidth,
    viewportHeight,
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
  });

  async function getOrLoadMotion(groupName: string, index: number) {
    const cacheKey = `${groupName}:${index}`;
    const cachedMotion = motionCache.get(cacheKey);

    if (cachedMotion) {
      return cachedMotion;
    }

    const motionFileName = modelSetting.getMotionFileName?.(groupName, index);

    if (!motionFileName) {
      return null;
    }

    const motionUrl = resolveAssetUrl(modelBaseUrl, motionFileName);
    const motionBuffer = await fetchArrayBuffer(motionUrl);
    const motion = userModel.loadMotion(
      motionBuffer,
      motionBuffer.byteLength,
      cacheKey,
      undefined,
      undefined,
      modelSetting,
      groupName,
      index,
    );

    motion?.setEffectIds?.(eyeBlinkParameterIds, lipSyncParameterIds);
    motionCache.set(cacheKey, motion);

    return motion;
  }

  async function playMotion(groupName: string, index?: number): Promise<boolean> {
    const motionCount = motionGroups.get(groupName) ?? 0;

    if (motionCount <= 0) {
      return false;
    }

    let targetIndex = index ?? 0;

    if (index === undefined) {
      if (motionCount === 1) {
        targetIndex = 0;
      } else {
        do {
          targetIndex = Math.floor(Math.random() * motionCount);
        } while (groupName === idleGroupName && targetIndex === lastIdleMotionIndex);
      }
    }

    const motion = await getOrLoadMotion(groupName, targetIndex);

    if (!motion) {
      return false;
    }

    userModel._motionManager?.startMotionPriority?.(motion, false, 1);

    if (groupName === idleGroupName) {
      lastIdleMotionIndex = targetIndex;
    }

    return true;
  }

  function queueIdleMotion() {
    if (!idleGroupName || pendingIdleMotion) {
      return;
    }

    pendingIdleMotion = playMotion(idleGroupName).finally(() => {
      pendingIdleMotion = null;
    });
  }

  async function ensureAudioGraph() {
    if (!audioContext) {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

      if (!AudioContextCtor) {
        throw new Error("Web Audio API is not available in the current browser.");
      }

      audioContext = new AudioContextCtor();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (!audioSourceNode) {
      audioSourceNode = audioContext.createMediaElementSource(audioElement);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.82;
      analyserData = new Uint8Array(analyserNode.frequencyBinCount);
      audioSourceNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination);
    }
  }

  async function speak(audioUrl: string): Promise<void> {
    await ensureAudioGraph();

    audioElement.pause();
    audioElement.currentTime = 0;
    currentLipSyncValue = 0;
    audioElement.src = audioUrl;
    audioElement.load();

    await audioElement.play();

    await new Promise<void>((resolve, reject) => {
      const handleEnded = () => {
        cleanup();
        currentLipSyncValue = 0;
        resolve();
      };

      const handleError = () => {
        cleanup();
        currentLipSyncValue = 0;
        reject(new Error(`Failed to play audio: ${audioUrl}`));
      };

      const cleanup = () => {
        audioElement.removeEventListener("ended", handleEnded);
        audioElement.removeEventListener("error", handleError);
      };

      audioElement.addEventListener("ended", handleEnded, { once: true });
      audioElement.addEventListener("error", handleError, { once: true });
    });
  }

  if (idleGroupName && idleMotionCount > 0) {
    await Promise.all(
      Array.from({ length: idleMotionCount }, (_, index) => getOrLoadMotion(idleGroupName, index)),
    );
    queueIdleMotion();
  }

  return {
    resize(width, height) {
      viewportWidth = width;
      viewportHeight = height;
      updateCanvasSize(canvas, gl, width, height);
      userModel.setRenderTargetSize(canvas.width, canvas.height);
      renderer.setRenderState(null, [0, 0, canvas.width, canvas.height]);
      renderer.setMvpMatrix(updateModelMatrix(userModel, width, height, layout));
    },
    updatePointer(clientX, clientY, rect) {
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = 1 - ((clientY - rect.top) / rect.height) * 2;
      userModel.setDragging(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
    },
    resetPointer() {
      userModel.setDragging(0, 0);
    },
    tick(deltaTimeSeconds) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      renderer.setRenderState(null, [0, 0, canvas.width, canvas.height]);
      renderer.setMvpMatrix(updateModelMatrix(userModel, viewportWidth, viewportHeight, layout));
      userModel.updateFrame(deltaTimeSeconds);
      renderer.drawModel(DEFAULT_SHADER_PATH);

      if (idleGroupName && userModel._motionManager?.isFinished?.()) {
        queueIdleMotion();
      }
    },
    playMotion(groupName: string, index?: number) {
      return playMotion(groupName, index);
    },
    speak(audioUrl: string) {
      return speak(audioUrl);
    },
    dispose() {
      audioElement.pause();
      audioElement.src = "";
      audioSourceNode?.disconnect();
      analyserNode?.disconnect();
      void audioContext?.close();
      textures.forEach((texture) => gl.deleteTexture(texture));
      userModel.deleteRenderer();
      userModel.release();
    },
  };
}
