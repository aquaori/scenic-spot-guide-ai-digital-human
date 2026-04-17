import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRM, VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import type {
  AvatarConfig,
  AvatarLoadOptions,
  AvatarMotionBinding,
  AvatarRuntimeHandle,
  AvatarRuntimeState,
} from "./types";

function findMotionConfig(config: AvatarConfig, name: string): AvatarMotionBinding | undefined {
  return config.motions.find((motion) => motion.name === name);
}

const HUMAN_BONE_TO_MIXAMO: Partial<Record<string, string>> = {
  hips: "mixamorigHips",
  spine: "mixamorigSpine",
  chest: "mixamorigSpine1",
  upperChest: "mixamorigSpine2",
  neck: "mixamorigNeck",
  head: "mixamorigHead",
  leftShoulder: "mixamorigLeftShoulder",
  leftUpperArm: "mixamorigLeftArm",
  leftLowerArm: "mixamorigLeftForeArm",
  leftHand: "mixamorigLeftHand",
  leftThumbMetacarpal: "mixamorigLeftHandThumb1",
  leftThumbProximal: "mixamorigLeftHandThumb2",
  leftThumbDistal: "mixamorigLeftHandThumb3",
  leftIndexProximal: "mixamorigLeftHandIndex1",
  leftIndexIntermediate: "mixamorigLeftHandIndex2",
  leftIndexDistal: "mixamorigLeftHandIndex3",
  leftMiddleProximal: "mixamorigLeftHandMiddle1",
  leftMiddleIntermediate: "mixamorigLeftHandMiddle2",
  leftMiddleDistal: "mixamorigLeftHandMiddle3",
  leftRingProximal: "mixamorigLeftHandRing1",
  leftRingIntermediate: "mixamorigLeftHandRing2",
  leftRingDistal: "mixamorigLeftHandRing3",
  leftLittleProximal: "mixamorigLeftHandPinky1",
  leftLittleIntermediate: "mixamorigLeftHandPinky2",
  leftLittleDistal: "mixamorigLeftHandPinky3",
  rightShoulder: "mixamorigRightShoulder",
  rightUpperArm: "mixamorigRightArm",
  rightLowerArm: "mixamorigRightForeArm",
  rightHand: "mixamorigRightHand",
  rightThumbMetacarpal: "mixamorigRightHandThumb1",
  rightThumbProximal: "mixamorigRightHandThumb2",
  rightThumbDistal: "mixamorigRightHandThumb3",
  rightIndexProximal: "mixamorigRightHandIndex1",
  rightIndexIntermediate: "mixamorigRightHandIndex2",
  rightIndexDistal: "mixamorigRightHandIndex3",
  rightMiddleProximal: "mixamorigRightHandMiddle1",
  rightMiddleIntermediate: "mixamorigRightHandMiddle2",
  rightMiddleDistal: "mixamorigRightHandMiddle3",
  rightRingProximal: "mixamorigRightHandRing1",
  rightRingIntermediate: "mixamorigRightHandRing2",
  rightRingDistal: "mixamorigRightHandRing3",
  rightLittleProximal: "mixamorigRightHandPinky1",
  rightLittleIntermediate: "mixamorigRightHandPinky2",
  rightLittleDistal: "mixamorigRightHandPinky3",
  leftUpperLeg: "mixamorigLeftUpLeg",
  leftLowerLeg: "mixamorigLeftLeg",
  leftFoot: "mixamorigLeftFoot",
  leftToes: "mixamorigLeftToeBase",
  rightUpperLeg: "mixamorigRightUpLeg",
  rightLowerLeg: "mixamorigRightLeg",
  rightFoot: "mixamorigRightFoot",
  rightToes: "mixamorigRightToeBase",
};

const HUMAN_BONE_TO_MIXAMO_ENTRIES = new Map(
  Object.entries(HUMAN_BONE_TO_MIXAMO).map(([humanBoneName, mixamoBoneName]) => [mixamoBoneName, humanBoneName]),
);

const RETARGET_BONE_ORDER = [
  "hips",
  "spine",
  "chest",
  "upperChest",
  "neck",
  "head",
  "leftShoulder",
  "leftUpperArm",
  "leftLowerArm",
  "leftHand",
  "rightShoulder",
  "rightUpperArm",
  "rightLowerArm",
  "rightHand",
  "leftUpperLeg",
  "leftLowerLeg",
  "leftFoot",
  "leftToes",
  "rightUpperLeg",
  "rightLowerLeg",
  "rightFoot",
  "rightToes",
] as const;

const IDLE_CORRECTION_BONES = [
  "leftThumbMetacarpal",
  "leftThumbProximal",
  "leftThumbDistal",
  "leftIndexProximal",
  "leftIndexIntermediate",
  "leftIndexDistal",
  "leftMiddleProximal",
  "leftMiddleIntermediate",
  "leftMiddleDistal",
  "leftRingProximal",
  "leftRingIntermediate",
  "leftRingDistal",
  "leftLittleProximal",
  "leftLittleIntermediate",
  "leftLittleDistal",
  "rightThumbMetacarpal",
  "rightThumbProximal",
  "rightThumbDistal",
  "rightIndexProximal",
  "rightIndexIntermediate",
  "rightIndexDistal",
  "rightMiddleProximal",
  "rightMiddleIntermediate",
  "rightMiddleDistal",
  "rightRingProximal",
  "rightRingIntermediate",
  "rightRingDistal",
  "rightLittleProximal",
  "rightLittleIntermediate",
  "rightLittleDistal",
] as const;

type NormalizedBoneName = ((typeof RETARGET_BONE_ORDER)[number]) | ((typeof IDLE_CORRECTION_BONES)[number]);
type NormalizedBoneState = {
  bone: THREE.Object3D;
  restQuaternion: THREE.Quaternion;
  restPosition: THREE.Vector3;
};
type MotionAsset = {
  clip: THREE.AnimationClip;
  hasHeadMotion: boolean;
  hasFingerMotion: boolean;
};
type BonePose = {
  quaternion: THREE.Quaternion;
  position: THREE.Vector3;
};
type TransitionState = {
  toMotionName: string;
  asset: MotionAsset;
  fromPose: Map<NormalizedBoneName, BonePose>;
  toPose: Map<NormalizedBoneName, BonePose>;
  elapsed: number;
  duration: number;
  loopMode: THREE.AnimationActionLoopStyles;
  repetitions: number;
  startPlayback: boolean;
  nextMotionName?: string;
};

export async function createAvatarRuntime(
  options: AvatarLoadOptions,
): Promise<AvatarRuntimeHandle> {
  const { canvas } = options;
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
  });
  renderer.setPixelRatio(Math.max(window.devicePixelRatio || 1, 1.5));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1.0; // 曝光度归位
  renderer.sortObjects = true;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  const clock = new THREE.Clock();
  const pointer = new THREE.Vector2(0, 0);
  const lookAtTarget = new THREE.Object3D();
  lookAtTarget.position.set(0, 1.2, 1.2);
  scene.add(lookAtTarget);

  // 环境光：稍微提一点强度，让肤色不暗沉
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(-100.0, 200.0, 2.5); // 稍微偏侧一点，让脸部有阴影结构
  scene.add(dirLight);

  const group = new THREE.Group();
  scene.add(group);
  const shadowMaterial = new THREE.ShadowMaterial({ opacity: 0.16 });
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.82, 48), shadowMaterial);
  base.rotation.x = -Math.PI / 2;
  base.position.y = -1;
  group.add(base);

  const audioElement = new Audio();
  audioElement.preload = "auto";
  const fbxLoader = new FBXLoader();
  let audioContext: AudioContext | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  let analyserData: Uint8Array | null = null;
  let lipSync = 0;
  let motionMixer: THREE.AnimationMixer | null = null;
  let motionAction: THREE.AnimationAction | null = null;
  let currentMotionAsset: MotionAsset | null = null;
  let currentMotionNonce = 0;
  let idleTransitionQueued = false;
  let motionTransition: TransitionState | null = null;
  let pendingMotionName: string | null = null;
  const motionClipCache = new Map<string, Promise<MotionAsset | null>>();
  const normalizedBoneStates = new Map<NormalizedBoneName, NormalizedBoneState>();
  let vrm: VRM | null = null;
  let rootScene: THREE.Object3D | null = null;
  let desiredExpression = "neutral";
  let modelHeight = 1.7;
  let modelFocusY = 0.95;
  let lookAtBaseZ = 1.2;
  let eyeLevelY = 1.08;
  let idleGazeTarget = new THREE.Vector2(0, 0);
  let idleGazeFrom = new THREE.Vector2(0, 0);
  let idleGazeProgress = 1;
  let idleGazeDuration = 1.4;
  let idleGazeHold = 0.8;
  let blinkWeight = 0;
  let blinkCycleTime = 0;
  let nextBlinkAt = 2.6;
  let neckBone: THREE.Object3D | null = null;
  let headBone: THREE.Object3D | null = null;
  const neckRestQuaternion = new THREE.Quaternion();
  let headRestQuaternion = new THREE.Quaternion();
  const neckTargetEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const headTargetEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const neckTargetQuaternion = new THREE.Quaternion();
  const headTargetQuaternion = new THREE.Quaternion();

  let avatarConfig = options.config;
  const state: AvatarRuntimeState = {
    activeMotion: "idle",
    activeExpression: "neutral",
    speaking: false,
    loadedModelUrl: avatarConfig.modelUrl,
  };

  function syncFromConfig(config: AvatarConfig) {
    avatarConfig = config;
    state.loadedModelUrl = config.modelUrl;

    const stageLight = config.stage?.lightIntensity ?? 1.2;
    ambientLight.intensity = stageLight;
    dirLight.intensity = stageLight;

    const framingHeight = Math.max(modelHeight * 1.12, 1.9);
    const verticalFov = THREE.MathUtils.degToRad(camera.fov);
    const fittedDistance = framingHeight / (2 * Math.tan(verticalFov / 2));
    const distance = config.camera?.distance ?? Math.max(fittedDistance * 1.14, 3.3);
    const yaw = config.camera?.yaw ?? 0.13;
    const pitch = config.camera?.pitch ?? 0.11;
    camera.position.set(
      Math.sin(yaw) * distance,
      modelFocusY + 0.28 + pitch * 1.55,
      Math.cos(yaw) * distance,
    );
    camera.lookAt(0, modelFocusY + 0.03, 0);
    camera.updateProjectionMatrix();
  }

  function getNormalizedBoneState(name: NormalizedBoneName) {
    return normalizedBoneStates.get(name) ?? null;
  }

  function currentMotionHasHeadMotion() {
    return currentMotionAsset?.hasHeadMotion ?? false;
  }

  function scheduleNextBlink() {
    nextBlinkAt = clock.getElapsedTime() + THREE.MathUtils.randFloat(2.2, 4.6);
  }

  function updateIdleGaze(delta: number) {
    if (pointer.lengthSq() > 0.0006) {
      idleGazeProgress = 1;
      idleGazeHold = 0.45;
      idleGazeTarget.set(pointer.x * 0.08, pointer.y * 0.035);
      idleGazeFrom.lerp(idleGazeTarget, 0.18 * Math.max(delta * 60, 1));
      return idleGazeTarget;
    }

    if (idleGazeProgress >= 1) {
      idleGazeHold -= delta;
      if (idleGazeHold <= 0) {
        idleGazeFrom.copy(idleGazeTarget);
        idleGazeTarget.set(
          THREE.MathUtils.randFloatSpread(0.12),
          THREE.MathUtils.randFloatSpread(0.05),
        );
        idleGazeDuration = THREE.MathUtils.randFloat(1.4, 2.6);
        idleGazeProgress = 0;
        idleGazeHold = THREE.MathUtils.randFloat(0.8, 1.8);
      }
      return idleGazeTarget;
    }

    idleGazeProgress = Math.min(idleGazeProgress + delta / idleGazeDuration, 1);
    return new THREE.Vector2().copy(idleGazeFrom).lerp(idleGazeTarget, THREE.MathUtils.smootherstep(idleGazeProgress, 0, 1));
  }

  function updateBlink(delta: number) {
    const now = clock.getElapsedTime();
    if (blinkCycleTime <= 0 && now >= nextBlinkAt) {
      blinkCycleTime = 0.18;
      scheduleNextBlink();
    }

    if (blinkCycleTime > 0) {
      blinkCycleTime = Math.max(blinkCycleTime - delta, 0);
      const progress = 1 - blinkCycleTime / 0.18;
      blinkWeight = progress < 0.5
        ? THREE.MathUtils.smootherstep(progress / 0.5, 0, 1)
        : 1 - THREE.MathUtils.smootherstep((progress - 0.5) / 0.5, 0, 1);
      return;
    }

    blinkWeight = THREE.MathUtils.lerp(blinkWeight, 0, 0.2 * Math.max(delta * 60, 1));
  }

  function captureCurrentPose() {
    const pose = new Map<NormalizedBoneName, BonePose>();
    normalizedBoneStates.forEach((state, boneName) => {
      pose.set(boneName, {
        quaternion: state.bone.quaternion.clone(),
        position: state.bone.position.clone(),
      });
    });
    return pose;
  }

  function extractClipStartPose(clip: THREE.AnimationClip) {
    const pose = new Map<NormalizedBoneName, Partial<BonePose>>();
    clip.tracks.forEach((track) => {
      const [boneName, propertyName] = track.name.split(".");
      if (!normalizedBoneStates.has(boneName as NormalizedBoneName)) {
        return;
      }

      const next = pose.get(boneName as NormalizedBoneName) ?? {};
      if (propertyName === "quaternion" && track instanceof THREE.QuaternionKeyframeTrack) {
        next.quaternion = new THREE.Quaternion().fromArray(track.values, 0);
      } else if (propertyName === "position" && track instanceof THREE.VectorKeyframeTrack) {
        next.position = new THREE.Vector3().fromArray(track.values, 0);
      }
      pose.set(boneName as NormalizedBoneName, next);
    });

    const normalizedPose = new Map<NormalizedBoneName, BonePose>();
    normalizedBoneStates.forEach((state, boneName) => {
      const partial = pose.get(boneName);
      normalizedPose.set(boneName, {
        quaternion: partial?.quaternion?.clone() ?? state.bone.quaternion.clone(),
        position: partial?.position?.clone() ?? state.bone.position.clone(),
      });
    });
    return normalizedPose;
  }

  function createRestPose() {
    const pose = new Map<NormalizedBoneName, BonePose>();
    normalizedBoneStates.forEach((state, boneName) => {
      pose.set(boneName, {
        quaternion: state.restQuaternion.clone(),
        position: state.restPosition.clone(),
      });
    });
    return pose;
  }

  async function createIdleReferencePose() {
    const idleReferenceUrl = resolveIdleReferenceUrl();
    if (!idleReferenceUrl) {
      return createRestPose();
    }

    const idleReferenceAsset = await loadMotionClip(idleReferenceUrl);
    if (!idleReferenceAsset) {
      return createRestPose();
    }

    return extractClipStartPose(idleReferenceAsset.clip);
  }

  function applyTransitionPose(transition: TransitionState, alpha: number) {
    transition.fromPose.forEach((fromState, boneName) => {
      const boneState = normalizedBoneStates.get(boneName);
      const toState = transition.toPose.get(boneName);
      if (!boneState || !toState) {
        return;
      }
      boneState.bone.quaternion.copy(fromState.quaternion).slerp(toState.quaternion, alpha);
      if (boneName === "hips") {
        boneState.bone.position.copy(fromState.position).lerp(toState.position, alpha);
      }
    });
  }

  function beginMotionPlayback(transition: TransitionState) {
    if (!motionMixer) {
      return;
    }
    const nextAction = motionMixer.clipAction(transition.asset.clip);
    nextAction.reset();
    nextAction.setLoop(transition.loopMode, transition.repetitions);
    nextAction.clampWhenFinished = true;
    nextAction.enabled = true;
    nextAction.weight = 1;
    nextAction.time = 1 / 60;
    nextAction.play();
    motionAction = nextAction;
    currentMotionAsset = transition.asset;
    state.activeMotion = transition.toMotionName;
  }

  async function queueRestTransition(nextMotionName: string, duration: number) {
    if (!motionAction && !currentMotionAsset) {
      pendingMotionName = null;
      await playResolvedMotion(nextMotionName);
      return;
    }

    const fromPose = captureCurrentPose();
    const toPose = await createIdleReferencePose();
    motionAction?.stop();
    motionMixer?.stopAllAction();
    motionAction = null;
    currentMotionAsset = null;
    motionTransition = {
      toMotionName: state.activeMotion ?? "idle",
      asset: {
        clip: new THREE.AnimationClip("__rest__", 0, []),
        hasFingerMotion: false,
        hasHeadMotion: false,
      },
      fromPose,
      toPose,
      elapsed: 0,
      duration,
      loopMode: THREE.LoopOnce,
      repetitions: 1,
      startPlayback: false,
      nextMotionName,
    };
  }

  function applyIdlePoseCorrections(delta: number) {
    if (state.activeMotion !== "idle") {
      return;
    }

    const step = Math.min(delta * 60, 1.6);
    const applyRotationOffset = (
      boneName: NormalizedBoneName,
      degrees: { x?: number; y?: number; z?: number },
      weight: number,
      order: THREE.EulerOrder = "XYZ",
    ) => {
      const state = getNormalizedBoneState(boneName);
      if (!state) return;
      const offset = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(degrees.x ?? 0),
          THREE.MathUtils.degToRad(degrees.y ?? 0),
          THREE.MathUtils.degToRad(degrees.z ?? 0),
          order,
        ),
      );
      const target = state.restQuaternion.clone().multiply(offset);
      state.bone.quaternion.slerp(target, weight * step);
    };

    const applyPositionBlend = (
      boneName: NormalizedBoneName,
      offset: { x?: number; y?: number; z?: number },
      weight: number,
    ) => {
      const state = getNormalizedBoneState(boneName);
      if (!state) return;
      state.bone.position.lerp(
        state.restPosition.clone().add(new THREE.Vector3(offset.x ?? 0, offset.y ?? 0, offset.z ?? 0)),
        weight * step,
      );
    };

    applyPositionBlend("hips", { x: 0, y: 0.004, z: 0.008 }, 0.08);
    applyRotationOffset("hips", { x: 0.8, y: 0, z: 0 }, 0.05);
    applyRotationOffset("spine", { x: -0.8, y: 0, z: 0 }, 0.05);
    applyRotationOffset("chest", { x: -1.2, y: 0, z: 0 }, 0.06);
    applyRotationOffset("upperChest", { x: -1, y: 0, z: 0 }, 0.06);

    applyRotationOffset("leftShoulder", { y: 3, z: 4 }, 0.08, "YXZ");
    applyRotationOffset("rightShoulder", { y: -3, z: -4 }, 0.08, "YXZ");
    applyRotationOffset("leftUpperArm", { y: 4, z: 3 }, 0.1, "YXZ");
    applyRotationOffset("rightUpperArm", { y: -4, z: -3 }, 0.1, "YXZ");
    applyRotationOffset("leftLowerArm", { x: -8, y: 3, z: 5 }, 0.11, "YXZ");
    applyRotationOffset("rightLowerArm", { x: -8, y: -3, z: -5 }, 0.11, "YXZ");
    applyRotationOffset("leftHand", { x: -14, y: 8, z: 18 }, 0.1, "YXZ");
    applyRotationOffset("rightHand", { x: -14, y: -8, z: -18 }, 0.1, "YXZ");

    applyRotationOffset("leftThumbMetacarpal", { x: 2, y: -4, z: 4 }, 0.08, "YXZ");
    applyRotationOffset("leftThumbProximal", { x: 3, y: -3, z: 5 }, 0.08, "YXZ");
    applyRotationOffset("leftThumbDistal", { x: 4, y: -2, z: 4 }, 0.08, "YXZ");
    applyRotationOffset("rightThumbMetacarpal", { x: 2, y: 4, z: -4 }, 0.08, "YXZ");
    applyRotationOffset("rightThumbProximal", { x: 3, y: 3, z: -5 }, 0.08, "YXZ");
    applyRotationOffset("rightThumbDistal", { x: 4, y: 2, z: -4 }, 0.08, "YXZ");

    const curlWeight = 0.1;
    applyRotationOffset("leftIndexProximal", { x: 14 }, curlWeight);
    applyRotationOffset("leftIndexIntermediate", { x: 16 }, curlWeight);
    applyRotationOffset("leftIndexDistal", { x: 10 }, curlWeight);
    applyRotationOffset("leftMiddleProximal", { x: 18 }, curlWeight);
    applyRotationOffset("leftMiddleIntermediate", { x: 20 }, curlWeight);
    applyRotationOffset("leftMiddleDistal", { x: 12 }, curlWeight);
    applyRotationOffset("leftRingProximal", { x: 20 }, curlWeight);
    applyRotationOffset("leftRingIntermediate", { x: 22 }, curlWeight);
    applyRotationOffset("leftRingDistal", { x: 14 }, curlWeight);
    applyRotationOffset("leftLittleProximal", { x: 24, z: -3 }, curlWeight, "XZY");
    applyRotationOffset("leftLittleIntermediate", { x: 24 }, curlWeight);
    applyRotationOffset("leftLittleDistal", { x: 15 }, curlWeight);

    applyRotationOffset("rightIndexProximal", { x: 14 }, curlWeight);
    applyRotationOffset("rightIndexIntermediate", { x: 16 }, curlWeight);
    applyRotationOffset("rightIndexDistal", { x: 10 }, curlWeight);
    applyRotationOffset("rightMiddleProximal", { x: 18 }, curlWeight);
    applyRotationOffset("rightMiddleIntermediate", { x: 20 }, curlWeight);
    applyRotationOffset("rightMiddleDistal", { x: 12 }, curlWeight);
    applyRotationOffset("rightRingProximal", { x: 20 }, curlWeight);
    applyRotationOffset("rightRingIntermediate", { x: 22 }, curlWeight);
    applyRotationOffset("rightRingDistal", { x: 14 }, curlWeight);
    applyRotationOffset("rightLittleProximal", { x: 24, z: 3 }, curlWeight, "XZY");
    applyRotationOffset("rightLittleIntermediate", { x: 24 }, curlWeight);
    applyRotationOffset("rightLittleDistal", { x: 15 }, curlWeight);

    applyRotationOffset("leftUpperLeg", { y: 1, z: 0.5 }, 0.06, "YXZ");
    applyRotationOffset("rightUpperLeg", { y: -1, z: -0.5 }, 0.06, "YXZ");
    applyRotationOffset("leftLowerLeg", { x: 1 }, 0.05);
    applyRotationOffset("rightLowerLeg", { x: 1 }, 0.05);
    applyRotationOffset("leftFoot", { x: -1, y: 1 }, 0.06, "YXZ");
    applyRotationOffset("rightFoot", { x: -1, y: -1 }, 0.06, "YXZ");
    applyRotationOffset("leftToes", { x: 0.5 }, 0.05);
    applyRotationOffset("rightToes", { x: 0.5 }, 0.05);
  }

  function applyHandSecondaryMotion(delta: number) {
    if (currentMotionAsset?.hasFingerMotion) {
      return;
    }

    const actionTime = motionAction?.time ?? clock.getElapsedTime();
    const speed = state.activeMotion === "idle" ? 1.4 : 2.2;
    const phase = actionTime * speed;
    const fingerCurl = state.activeMotion === "idle" ? 4.5 : 2.4;
    const fingerSpread = state.activeMotion === "idle" ? 1.4 : 0.8;
    const thumbSwing = state.activeMotion === "idle" ? 2.6 : 1.4;
    const step = Math.min(delta * 60, 1.2);

    const applyOscillation = (
      boneName: NormalizedBoneName,
      degrees: { x?: number; y?: number; z?: number },
      weight: number,
      order: THREE.EulerOrder = "XYZ",
    ) => {
      const boneState = getNormalizedBoneState(boneName);
      if (!boneState) return;
      const offset = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          THREE.MathUtils.degToRad(degrees.x ?? 0),
          THREE.MathUtils.degToRad(degrees.y ?? 0),
          THREE.MathUtils.degToRad(degrees.z ?? 0),
          order,
        ),
      );
      const target = boneState.restQuaternion.clone().multiply(offset);
      boneState.bone.quaternion.slerp(target, weight * step);
    };

    const fingerSets: Array<[NormalizedBoneName, number]> = [
      ["leftIndexProximal", 0.0],
      ["leftIndexIntermediate", 0.25],
      ["leftIndexDistal", 0.5],
      ["leftMiddleProximal", 0.12],
      ["leftMiddleIntermediate", 0.37],
      ["leftMiddleDistal", 0.62],
      ["leftRingProximal", 0.2],
      ["leftRingIntermediate", 0.45],
      ["leftRingDistal", 0.7],
      ["leftLittleProximal", 0.3],
      ["leftLittleIntermediate", 0.55],
      ["leftLittleDistal", 0.8],
      ["rightIndexProximal", Math.PI],
      ["rightIndexIntermediate", Math.PI + 0.25],
      ["rightIndexDistal", Math.PI + 0.5],
      ["rightMiddleProximal", Math.PI + 0.12],
      ["rightMiddleIntermediate", Math.PI + 0.37],
      ["rightMiddleDistal", Math.PI + 0.62],
      ["rightRingProximal", Math.PI + 0.2],
      ["rightRingIntermediate", Math.PI + 0.45],
      ["rightRingDistal", Math.PI + 0.7],
      ["rightLittleProximal", Math.PI + 0.3],
      ["rightLittleIntermediate", Math.PI + 0.55],
      ["rightLittleDistal", Math.PI + 0.8],
    ];

    fingerSets.forEach(([boneName, offset]) => {
      const curl = Math.sin(phase + offset) * fingerCurl;
      const spread =
        boneName.startsWith("left")
          ? Math.cos(phase + offset) * fingerSpread
          : -Math.cos(phase + offset) * fingerSpread;
      applyOscillation(boneName, { x: curl, z: spread }, 0.06, "XZY");
    });

    applyOscillation("leftThumbProximal", { x: 2 + Math.sin(phase + 0.4) * thumbSwing, z: 4 }, 0.06, "YXZ");
    applyOscillation("leftThumbDistal", { x: 2 + Math.sin(phase + 0.8) * thumbSwing, z: 3 }, 0.06, "YXZ");
    applyOscillation("rightThumbProximal", { x: 2 + Math.sin(phase + Math.PI + 0.4) * thumbSwing, z: -4 }, 0.06, "YXZ");
    applyOscillation("rightThumbDistal", { x: 2 + Math.sin(phase + Math.PI + 0.8) * thumbSwing, z: -3 }, 0.06, "YXZ");
  }

  async function warmupAvatar(nextVrm: VRM) {
    const warmupScene = nextVrm.scene;
    warmupScene.updateMatrixWorld(true);

    for (let frame = 0; frame < 36; frame += 1) {
      nextVrm.update(1 / 60);
      warmupScene.updateMatrixWorld(true);
    }

    const asyncRenderer = renderer as THREE.WebGLRenderer & {
      compileAsync?: (scene: THREE.Object3D, camera: THREE.Camera) => Promise<void>;
    };

    if (asyncRenderer.compileAsync) {
      await asyncRenderer.compileAsync(scene, camera);
    } else {
      renderer.compile(scene, camera);
    }

    renderer.render(scene, camera);
  }

  async function loadVRMModel(config: AvatarConfig) {
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));
    const gltf = await loader.loadAsync(config.modelUrl);
    const nextVrm = gltf.userData.vrm as VRM | undefined;

    if (!nextVrm) {
      throw new Error(`Failed to load VRM model: ${config.modelUrl}`);
    }

    VRMUtils.rotateVRM0(nextVrm);
    const bounds = new THREE.Box3().setFromObject(nextVrm.scene);
    const center = bounds.getCenter(new THREE.Vector3());
    modelHeight = Math.max(bounds.max.y - bounds.min.y, 1.4);
    modelFocusY = bounds.min.y + modelHeight * 0.58;
    eyeLevelY = bounds.min.y + modelHeight * 0.72;
    lookAtBaseZ = Math.max(modelHeight * 0.72, 0.92);
    nextVrm.scene.position.set(-center.x, -bounds.min.y, -center.z);
    nextVrm.scene.rotation.set(0, 0, 0);
    nextVrm.scene.traverse((object) => {
      object.frustumCulled = false;
    });

    if (rootScene) {
      group.remove(rootScene);
      VRMUtils.deepDispose(rootScene);
    }

    rootScene = nextVrm.scene;
    rootScene.visible = false;
    group.add(rootScene);
    group.rotation.set(0, 0, 0);
    group.position.set(0, 0, 0);
    rootScene.rotation.set(0, 0, 0);
    vrm = nextVrm;
    normalizedBoneStates.clear();
    [...RETARGET_BONE_ORDER, ...IDLE_CORRECTION_BONES].forEach((boneName) => {
      const bone = vrm?.humanoid.getNormalizedBoneNode(boneName);
      if (bone) {
        bone.name = boneName;
        normalizedBoneStates.set(boneName, {
          bone,
          restQuaternion: bone.quaternion.clone(),
          restPosition: bone.position.clone(),
        });
      }
    });
    motionMixer = new THREE.AnimationMixer(nextVrm.scene);
    motionMixer.addEventListener("finished", () => {
      if (state.activeMotion === "idle") {
        if (idleTransitionQueued) {
          return;
        }
        idleTransitionQueued = true;
        queueMicrotask(() => {
          idleTransitionQueued = false;
          if (state.activeMotion === "idle") {
            void queueRestTransition("idle", 0.42);
          }
        });
      } else {
        queueMicrotask(() => {
          if (state.activeMotion !== "idle" && !state.speaking) {
            pendingMotionName = "idle";
            void queueRestTransition("idle", 0.46);
          }
        });
      }
    });
    motionAction = null;
    currentMotionAsset = null;
    neckBone = vrm.humanoid.getNormalizedBoneNode("neck");
    if (neckBone) {
      neckRestQuaternion.copy(neckBone.quaternion);
    }
    headBone = vrm.humanoid.getNormalizedBoneNode("head");
    if (headBone) {
      headRestQuaternion.copy(headBone.quaternion);
    }
    if (vrm.lookAt) {
      vrm.lookAt.autoUpdate = true;
      vrm.lookAt.target = lookAtTarget;
    }
    lipSync = 0;
    syncFromConfig(avatarConfig);

    await warmupAvatar(nextVrm);
    rootScene.visible = true;
  }

  function resolveMotionUrls(name: string, motionConfig?: AvatarMotionBinding): string[] {
    if (!motionConfig?.clipUrl) return [];

    if (name !== "idle") {
      return [motionConfig.clipUrl];
    }

    if (motionConfig.clipUrl.endsWith("/Idle_1.fbx")) {
      return [motionConfig.clipUrl];
    }

    if (motionConfig.clipUrl.endsWith("/Idle_3.fbx")) {
      return [motionConfig.clipUrl.replace("/Idle_3.fbx", "/Idle_1.fbx")];
    }

    if (motionConfig.clipUrl.endsWith("/Idle.fbx")) {
      return [motionConfig.clipUrl.replace("/Idle.fbx", "/Idle_1.fbx")];
    }

    return [motionConfig.clipUrl];
  }

  function resolveIdleReferenceUrl() {
    const idleConfig = findMotionConfig(avatarConfig, "idle");
    if (!idleConfig?.clipUrl) {
      return null;
    }

    if (idleConfig.clipUrl.endsWith("/Idle_1.fbx")) {
      return idleConfig.clipUrl;
    }

    if (idleConfig.clipUrl.endsWith("/Idle_3.fbx")) {
      return idleConfig.clipUrl.replace("/Idle_3.fbx", "/Idle_1.fbx");
    }

    if (idleConfig.clipUrl.endsWith("/Idle.fbx")) {
      return idleConfig.clipUrl.replace("/Idle.fbx", "/Idle_1.fbx");
    }

    return idleConfig.clipUrl;
  }

  async function loadMotionClip(url: string) {
    if (!vrm) {
      return null;
    }

    if (motionClipCache.has(url)) {
      return motionClipCache.get(url)!;
    }

    const pendingClip = (async () => {
      const fbx = await fbxLoader.loadAsync(url);
      const sourceClip = THREE.AnimationClip.findByName(fbx.animations, "mixamo.com") ?? fbx.animations[0];
      const motionHips = fbx.getObjectByName("mixamorigHips");
      const vrmHipsHeight = vrm.humanoid.normalizedRestPose.hips?.position?.[1];
      if (!sourceClip || !motionHips || vrmHipsHeight == null) {
        console.warn("[avatar] motion source is missing clip or hips", url);
        return null;
      }

      const tracks: THREE.KeyframeTrack[] = [];
      const restRotationInverse = new THREE.Quaternion();
      const parentRestWorldRotation = new THREE.Quaternion();
      const flatQuaternion = new THREE.Quaternion();
      const hipsPositionScale = vrmHipsHeight / motionHips.position.y;
      const hasHeadMotion = sourceClip.tracks.some(
        (track) =>
          track.name.startsWith("mixamorigHead.") ||
          track.name.startsWith("mixamorigNeck.") ||
          track.name.startsWith("mixamorigSpine2."),
      );
      const hasFingerMotion = sourceClip.tracks.some(
        (track) =>
          track.name.startsWith("mixamorigLeftHandThumb") ||
          track.name.startsWith("mixamorigLeftHandIndex") ||
          track.name.startsWith("mixamorigLeftHandMiddle") ||
          track.name.startsWith("mixamorigLeftHandRing") ||
          track.name.startsWith("mixamorigLeftHandPinky") ||
          track.name.startsWith("mixamorigRightHandThumb") ||
          track.name.startsWith("mixamorigRightHandIndex") ||
          track.name.startsWith("mixamorigRightHandMiddle") ||
          track.name.startsWith("mixamorigRightHandRing") ||
          track.name.startsWith("mixamorigRightHandPinky"),
      );

      sourceClip.tracks.forEach((track) => {
        const [mixamoRigName, propertyName] = track.name.split(".");
        const vrmBoneName = HUMAN_BONE_TO_MIXAMO_ENTRIES.get(mixamoRigName);
        if (!vrmBoneName) {
          return;
        }

        const vrmNodeName = vrm?.humanoid.getNormalizedBoneNode(vrmBoneName as NormalizedBoneName)?.name;
        const mixamoRigNode = fbx.getObjectByName(mixamoRigName);
        if (!vrmNodeName || !mixamoRigNode) {
          return;
        }

        mixamoRigNode.getWorldQuaternion(restRotationInverse).invert();
        mixamoRigNode.parent?.getWorldQuaternion(parentRestWorldRotation);

        if (track instanceof THREE.QuaternionKeyframeTrack) {
          const values = track.values.slice();
          for (let index = 0; index < values.length; index += 4) {
            flatQuaternion.fromArray(values, index);
            flatQuaternion.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
            flatQuaternion.toArray(values, index);
          }

          tracks.push(
            new THREE.QuaternionKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              values.map((value, index) => (vrm?.meta?.metaVersion === "0" && index % 2 === 0 ? -value : value)),
            ),
          );
        } else if (track instanceof THREE.VectorKeyframeTrack) {
          tracks.push(
            new THREE.VectorKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              track.values.map((value, index) =>
                (vrm?.meta?.metaVersion === "0" && index % 3 !== 1 ? -value : value) * hipsPositionScale,
              ),
            ),
          );
        }
      });

      return {
        clip: new THREE.AnimationClip(`vrm-${sourceClip.name}`, sourceClip.duration, tracks),
        hasHeadMotion,
        hasFingerMotion,
      };
    })().catch((error) => {
      console.error("[avatar] failed to load motion clip", url, error);
      return null;
    });

    motionClipCache.set(url, pendingClip);
    return pendingClip;
  }

  function stopMotion() {
    motionTransition = null;
    pendingMotionName = null;
    motionAction?.fadeOut(0.16);
    motionAction?.stop();
    motionMixer?.stopAllAction();
    motionAction = null;
    currentMotionAsset = null;
  }

  async function playResolvedMotion(name: string): Promise<boolean> {
    const motionConfig = findMotionConfig(avatarConfig, name);
    const motionUrls = resolveMotionUrls(name, motionConfig);

    if (!vrm || !motionMixer || motionUrls.length === 0) {
      return false;
    }

    const selectedUrl = motionUrls[0];

    const motionNonce = ++currentMotionNonce;
    const motionAsset = await loadMotionClip(selectedUrl);
    if (!motionAsset || motionNonce !== currentMotionNonce) {
      return false;
    }

    const isIdleMotion = name === "idle";
    const loopMode =
      isIdleMotion || motionConfig?.loop !== true ? THREE.LoopOnce : THREE.LoopRepeat;
    const repetitions = loopMode === THREE.LoopOnce ? 1 : Infinity;

    if (!motionAction || !currentMotionAsset) {
      const nextAction = motionMixer.clipAction(motionAsset.clip);
      nextAction.reset();
      nextAction.setLoop(loopMode, repetitions);
      nextAction.clampWhenFinished = true;
      nextAction.enabled = true;
      nextAction.weight = 1;
      nextAction.play();
      motionAction = nextAction;
      currentMotionAsset = motionAsset;
      state.activeMotion = name;
      pendingMotionName = null;
      return true;
    }

    const fromPose = captureCurrentPose();
    const toPose = extractClipStartPose(motionAsset.clip);

    motionAction.stop();
    motionMixer.stopAllAction();
    motionAction = null;
    currentMotionAsset = null;
    motionTransition = {
      toMotionName: name,
      asset: motionAsset,
      fromPose,
      toPose,
      elapsed: 0,
      duration: isIdleMotion ? 0.48 : 0.68,
      loopMode,
      repetitions,
      startPlayback: true,
    };
    pendingMotionName = null;
    return true;
  }

  function resetExpressionState() {
    vrm?.expressionManager?.resetValues();
  }

  function applyExpressionState() {
    if (!vrm?.expressionManager) return;

    resetExpressionState();

    const neutralRelax = !state.speaking && desiredExpression === "neutral" ? 0.18 : 0;
    if (neutralRelax > 0) {
      vrm.expressionManager.setValue("relaxed", neutralRelax);
    }

    if (desiredExpression === "smile") {
      vrm.expressionManager.setValue("happy", 0.8);
    } else if (desiredExpression === "thinking") {
      vrm.expressionManager.setValue("relaxed", 0.6);
    } else if (desiredExpression === "surprised") {
      vrm.expressionManager.setValue("surprised", 0.9);
    } else if (desiredExpression === "speaking") {
      vrm.expressionManager.setValue("happy", 0.12);
    }

    const mouthWeight = state.speaking ? THREE.MathUtils.clamp(lipSync, 0, 1) : 0;
    if (mouthWeight > 0) {
      vrm.expressionManager.setValue("aa", mouthWeight);
      vrm.expressionManager.setValue("oh", mouthWeight * 0.35);
    }

    if (blinkWeight > 0.001) {
      vrm.expressionManager.setValue("blink", blinkWeight);
    }
  }

  syncFromConfig(avatarConfig);
  scheduleNextBlink();
  await loadVRMModel(avatarConfig);

  async function ensureAudioGraph() {
    if (!audioContext) {
      const AudioContextCtor =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) {
        throw new Error("Web Audio API is not available in the current browser.");
      }
      audioContext = new AudioContextCtor();
    }

    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    if (!sourceNode) {
      sourceNode = audioContext.createMediaElementSource(audioElement);
      analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.82;
      analyserData = new Uint8Array(analyserNode.frequencyBinCount);
      sourceNode.connect(analyserNode);
      analyserNode.connect(audioContext.destination);
    }
  }

  return {
    async loadAvatar(config) {
      currentMotionNonce += 1;
      syncFromConfig(config);
      await loadVRMModel(config);
      applyExpressionState();
    },
    resize(width, height) {
      const nextWidth = Math.max(width, 1);
      const nextHeight = Math.max(height, 1);
      renderer.setSize(nextWidth, nextHeight, false);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
    },
    updatePointer(clientX, clientY, rect) {
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = 1 - ((clientY - rect.top) / rect.height) * 2;
    },
    resetPointer() {
      pointer.set(0, 0);
    },
    tick(deltaTimeSeconds) {
      const delta = deltaTimeSeconds || clock.getDelta();

      if (analyserNode && analyserData && state.speaking && !audioElement.paused && !audioElement.ended) {
        analyserNode.getByteTimeDomainData(analyserData as Uint8Array<ArrayBuffer>);
        let total = 0;
        for (let index = 0; index < analyserData.length; index += 1) {
          total += Math.abs(analyserData[index] - 128);
        }
        lipSync = THREE.MathUtils.lerp(lipSync, Math.min(total / analyserData.length / 18, 1), 0.32);
      } else {
        lipSync = THREE.MathUtils.lerp(lipSync, 0, 0.18);
      }

      group.position.y = 0;
      updateBlink(delta);
      if (motionTransition) {
        motionTransition.elapsed += delta;
        const alpha = THREE.MathUtils.smootherstep(
          Math.min(motionTransition.elapsed / motionTransition.duration, 1),
          0,
          1,
        );
        applyTransitionPose(motionTransition, alpha);
        if (alpha >= 1) {
          const completedTransition = motionTransition;
          motionTransition = null;
          if (completedTransition.startPlayback) {
            beginMotionPlayback(completedTransition);
          } else if (completedTransition.nextMotionName) {
            state.activeMotion = completedTransition.nextMotionName;
            pendingMotionName = null;
            void playResolvedMotion(completedTransition.nextMotionName);
          }
        }
      } else {
        motionMixer?.update(delta);
        applyIdlePoseCorrections(delta);
        applyHandSecondaryMotion(delta);
      }
      const autonomousGaze = updateIdleGaze(delta);
      lookAtTarget.position.x = THREE.MathUtils.lerp(
        lookAtTarget.position.x,
        autonomousGaze.x * 0.42,
        0.08 * Math.max(delta * 60, 1),
      );
      lookAtTarget.position.y = THREE.MathUtils.lerp(
        lookAtTarget.position.y,
        eyeLevelY + autonomousGaze.y * 0.12,
        0.08 * Math.max(delta * 60, 1),
      );
      lookAtTarget.position.z = lookAtBaseZ;

      if (headBone && !motionTransition && !currentMotionHasHeadMotion()) {
        const headYaw = pointer.x * 10;
        const headPitch = -pointer.y * 7.5;
        const headRoll = pointer.x * -3.5 + pointer.y * 1.2;

        if (neckBone) {
          neckTargetEuler.set(
            THREE.MathUtils.degToRad(headPitch * 0.42),
            THREE.MathUtils.degToRad(headYaw * 0.38),
            THREE.MathUtils.degToRad(headRoll * 0.18),
          );
          neckTargetQuaternion.copy(neckRestQuaternion).multiply(new THREE.Quaternion().setFromEuler(neckTargetEuler));
          neckBone.quaternion.slerp(neckTargetQuaternion, 0.08 * Math.max(delta * 60, 1));
        }

        headTargetEuler.set(
          THREE.MathUtils.degToRad(headPitch),
          THREE.MathUtils.degToRad(headYaw),
          THREE.MathUtils.degToRad(headRoll),
        );
        headTargetQuaternion.copy(headRestQuaternion).multiply(new THREE.Quaternion().setFromEuler(headTargetEuler));
        headBone.quaternion.slerp(headTargetQuaternion, 0.11 * Math.max(delta * 60, 1));
      }

      applyExpressionState();
      vrm?.update(delta);

      renderer.render(scene, camera);
    },
    async playMotion(name) {
      state.activeMotion = name;
      if (motionAction || currentMotionAsset || motionTransition) {
        pendingMotionName = name;
        await queueRestTransition(name, name === "idle" ? 0.42 : 0.46);
        return true;
      }
      return playResolvedMotion(name);
    },
    setExpression(name) {
      state.activeExpression = name;
      desiredExpression = name;
      applyExpressionState();
    },
    async speak(audioUrl) {
      await ensureAudioGraph();
      state.speaking = true;
      state.activeExpression = "speaking";
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement.src = audioUrl;
      audioElement.load();

      try {
        await audioElement.play();
      } catch {
        state.speaking = false;
        state.activeExpression = "neutral";
        throw new Error(`Failed to play audio: ${audioUrl}`);
      }

      await new Promise<void>((resolve, reject) => {
        const onEnd = () => {
          cleanup();
          state.speaking = false;
          state.activeExpression = "neutral";
          resolve();
        };
        const onError = () => {
          cleanup();
          state.speaking = false;
          state.activeExpression = "neutral";
          reject(new Error(`Failed to play audio: ${audioUrl}`));
        };
        const cleanup = () => {
          audioElement.removeEventListener("ended", onEnd);
          audioElement.removeEventListener("error", onError);
        };
        audioElement.addEventListener("ended", onEnd, { once: true });
        audioElement.addEventListener("error", onError, { once: true });
      });
    },
    getState() {
      return { ...state };
    },
    dispose() {
      currentMotionNonce += 1;
      audioElement.pause();
      audioElement.src = "";
      sourceNode?.disconnect();
      analyserNode?.disconnect();
      void audioContext?.close();
      if (rootScene) {
        VRMUtils.deepDispose(rootScene);
      }
      stopMotion();
      normalizedBoneStates.clear();
      neckBone = null;
      headBone = null;
      scene.remove(lookAtTarget);
      shadowMaterial.dispose();
      renderer.dispose();
    },
  };
}
