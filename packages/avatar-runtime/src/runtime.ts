import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
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

const HUMAN_BONE_TO_JNT: Partial<Record<string, string>> = {
  hips: "hips_JNT",
  spine: "spine_JNT",
  chest: "spine1_JNT",
  upperChest: "spine2_JNT",
  neck: "neck_JNT",
  head: "head_JNT",
  leftShoulder: "l_shoulder_JNT",
  leftUpperArm: "l_arm_JNT",
  leftLowerArm: "l_forearm_JNT",
  leftHand: "l_hand_JNT",
  leftThumbMetacarpal: "l_handThumb1_JNT",
  leftThumbProximal: "l_handThumb2_JNT",
  leftThumbDistal: "l_handThumb3_JNT",
  leftIndexProximal: "l_handIndex1_JNT",
  leftIndexIntermediate: "l_handIndex2_JNT",
  leftIndexDistal: "l_handIndex3_JNT",
  leftMiddleProximal: "l_handMiddle1_JNT",
  leftMiddleIntermediate: "l_handMiddle2_JNT",
  leftMiddleDistal: "l_handMiddle3_JNT",
  leftRingProximal: "l_handRing1_JNT",
  leftRingIntermediate: "l_handRing2_JNT",
  leftRingDistal: "l_handRing3_JNT",
  leftLittleProximal: "l_handPinky1_JNT",
  leftLittleIntermediate: "l_handPinky2_JNT",
  leftLittleDistal: "l_handPinky3_JNT",
  rightShoulder: "r_shoulder_JNT",
  rightUpperArm: "r_arm_JNT",
  rightLowerArm: "r_forearm_JNT",
  rightHand: "r_hand_JNT",
  rightThumbMetacarpal: "r_handThumb1_JNT",
  rightThumbProximal: "r_handThumb2_JNT",
  rightThumbDistal: "r_handThumb3_JNT",
  rightIndexProximal: "r_handIndex1_JNT",
  rightIndexIntermediate: "r_handIndex2_JNT",
  rightIndexDistal: "r_handIndex3_JNT",
  rightMiddleProximal: "r_handMiddle1_JNT",
  rightMiddleIntermediate: "r_handMiddle2_JNT",
  rightMiddleDistal: "r_handMiddle3_JNT",
  rightRingProximal: "r_handRing1_JNT",
  rightRingIntermediate: "r_handRing2_JNT",
  rightRingDistal: "r_handRing3_JNT",
  rightLittleProximal: "r_handPinky1_JNT",
  rightLittleIntermediate: "r_handPinky2_JNT",
  rightLittleDistal: "r_handPinky3_JNT",
  leftUpperLeg: "l_upleg_JNT",
  leftLowerLeg: "l_leg_JNT",
  leftFoot: "l_foot_JNT",
  leftToes: "l_toebase_JNT",
  rightUpperLeg: "r_upleg_JNT",
  rightLowerLeg: "r_leg_JNT",
  rightFoot: "r_foot_JNT",
  rightToes: "r_toebase_JNT",
};

type MotionRigProfile = {
  name: string;
  hipsBoneName: string;
  sourceToHuman: Map<string, string>;
  headPrefixes: string[];
  fingerPrefixes: string[];
};

function createRigProfile(
  name: string,
  boneMap: Partial<Record<string, string>>,
  hipsBoneName: string,
  headPrefixes: string[],
  fingerPrefixes: string[],
): MotionRigProfile {
  return {
    name,
    hipsBoneName,
    sourceToHuman: new Map(
      Object.entries(boneMap)
        .filter((entry): entry is [string, string] => typeof entry[1] === "string")
        .map(([humanBoneName, sourceBoneName]) => [sourceBoneName, humanBoneName]),
    ),
    headPrefixes,
    fingerPrefixes,
  };
}

const MOTION_RIG_PROFILES: MotionRigProfile[] = [
  createRigProfile(
    "mixamo",
    HUMAN_BONE_TO_MIXAMO,
    "mixamorigHips",
    ["mixamorigHead.", "mixamorigNeck.", "mixamorigSpine2."],
    [
      "mixamorigLeftHandThumb",
      "mixamorigLeftHandIndex",
      "mixamorigLeftHandMiddle",
      "mixamorigLeftHandRing",
      "mixamorigLeftHandPinky",
      "mixamorigRightHandThumb",
      "mixamorigRightHandIndex",
      "mixamorigRightHandMiddle",
      "mixamorigRightHandRing",
      "mixamorigRightHandPinky",
    ],
  ),
  createRigProfile(
    "jnt",
    HUMAN_BONE_TO_JNT,
    "hips_JNT",
    ["head_JNT.", "neck_JNT.", "spine2_JNT."],
    [
      "l_handThumb",
      "l_handIndex",
      "l_handMiddle",
      "l_handRing",
      "l_handPinky",
      "r_handThumb",
      "r_handIndex",
      "r_handMiddle",
      "r_handRing",
      "r_handPinky",
    ].map((prefix) => `${prefix}`),
  ),
];

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
const NORMALIZED_BONE_NAMES = new Set<string>([...RETARGET_BONE_ORDER, ...IDLE_CORRECTION_BONES]);
const FINGER_BONE_NAMES = new Set<string>(IDLE_CORRECTION_BONES);
const HEAD_MOTION_BONE_NAMES = new Set<string>(["head", "neck", "upperChest"]);
const UPPER_BODY_BONE_NAMES = new Set<string>([
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
  ...IDLE_CORRECTION_BONES,
]);
const XIAOA_MODEL_OFFSET_X = 0;
const POINTER_IDLE_RESET_SECONDS = 5;
const POINTER_MOVE_EPSILON = 0.0001;
const VRMA_BONE_PARENT: Partial<Record<NormalizedBoneName, NormalizedBoneName>> = {
  spine: "hips",
  chest: "spine",
  upperChest: "chest",
  neck: "upperChest",
  head: "neck",
  leftShoulder: "upperChest",
  leftUpperArm: "leftShoulder",
  leftLowerArm: "leftUpperArm",
  leftHand: "leftLowerArm",
  leftThumbMetacarpal: "leftHand",
  leftThumbProximal: "leftThumbMetacarpal",
  leftThumbDistal: "leftThumbProximal",
  leftIndexProximal: "leftHand",
  leftIndexIntermediate: "leftIndexProximal",
  leftIndexDistal: "leftIndexIntermediate",
  leftMiddleProximal: "leftHand",
  leftMiddleIntermediate: "leftMiddleProximal",
  leftMiddleDistal: "leftMiddleIntermediate",
  leftRingProximal: "leftHand",
  leftRingIntermediate: "leftRingProximal",
  leftRingDistal: "leftRingIntermediate",
  leftLittleProximal: "leftHand",
  leftLittleIntermediate: "leftLittleProximal",
  leftLittleDistal: "leftLittleIntermediate",
  rightShoulder: "upperChest",
  rightUpperArm: "rightShoulder",
  rightLowerArm: "rightUpperArm",
  rightHand: "rightLowerArm",
  rightThumbMetacarpal: "rightHand",
  rightThumbProximal: "rightThumbMetacarpal",
  rightThumbDistal: "rightThumbProximal",
  rightIndexProximal: "rightHand",
  rightIndexIntermediate: "rightIndexProximal",
  rightIndexDistal: "rightIndexIntermediate",
  rightMiddleProximal: "rightHand",
  rightMiddleIntermediate: "rightMiddleProximal",
  rightMiddleDistal: "rightMiddleIntermediate",
  rightRingProximal: "rightHand",
  rightRingIntermediate: "rightRingProximal",
  rightRingDistal: "rightRingIntermediate",
  rightLittleProximal: "rightHand",
  rightLittleIntermediate: "rightLittleProximal",
  rightLittleDistal: "rightLittleIntermediate",
  leftUpperLeg: "hips",
  leftLowerLeg: "leftUpperLeg",
  leftFoot: "leftLowerLeg",
  leftToes: "leftFoot",
  rightUpperLeg: "hips",
  rightLowerLeg: "rightUpperLeg",
  rightFoot: "rightLowerLeg",
  rightToes: "rightFoot",
};

function isNormalizedBoneName(name: string): name is NormalizedBoneName {
  return NORMALIZED_BONE_NAMES.has(name);
}

function isVrmaMotionUrl(url: string) {
  return url.split(/[?#]/)[0].toLowerCase().endsWith(".vrma");
}

type VRMAJson = {
  extensions?: {
    VRMC_vrm_animation?: {
      humanoid?: {
        humanBones?: Record<string, { node?: number }>;
      };
    };
  };
  nodes?: Array<{ name?: string }>;
};
type VRMABoneBinding = {
  boneName: NormalizedBoneName;
  sourceNode: THREE.Object3D;
  targetState: NormalizedBoneState;
};
type MotionBodyMask = NonNullable<AvatarMotionBinding["bodyMask"]>;
type MotionTrackMask = MotionBodyMask | "lowerBody";

type RotationOffset = {
  x?: number;
  y?: number;
  z?: number;
  order?: THREE.EulerOrder;
};

const JNT_ROTATION_OFFSETS: Partial<Record<NormalizedBoneName, RotationOffset>> = {
  leftShoulder: { x: 10, y: 19, z: 32, order: "YXZ" },
  leftUpperArm: { x: -4, y: -26, z: 1, order: "YXZ" },
  leftLowerArm: { x: 42, y: 2, z: -52, order: "YXZ" },
  rightShoulder: { x: 14, y: -24, z: -30, order: "YXZ" },
  rightUpperArm: { x: 6, y: -3, z: 17, order: "YXZ" },
  rightLowerArm: { x: 29, y: 32, z: -5, order: "YXZ" },
};

function createRotationOffsetQuaternion(offset: RotationOffset) {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(offset.x ?? 0),
      THREE.MathUtils.degToRad(offset.y ?? 0),
      THREE.MathUtils.degToRad(offset.z ?? 0),
      offset.order ?? "XYZ",
    ),
  );
}

const JNT_ROTATION_OFFSET_QUATERNIONS = new Map(
  Object.entries(JNT_ROTATION_OFFSETS).map(([boneName, offset]) => [
    boneName as NormalizedBoneName,
    createRotationOffsetQuaternion(offset),
  ]),
);

type NormalizedBoneState = {
  bone: THREE.Object3D;
  restQuaternion: THREE.Quaternion;
  restPosition: THREE.Vector3;
};
type MotionAsset = {
  clip: THREE.AnimationClip;
  hasHeadMotion: boolean;
  hasFingerMotion: boolean;
  rigProfileName: string;
  bodyMask: MotionTrackMask;
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
type TalkingMotionPhase = "start" | "cycle" | "stop";
type TalkingMotionState = {
  phase: TalkingMotionPhase | null;
  nonce: number;
  stopRequested: boolean;
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
  const pointerTarget = new THREE.Vector2(0, 0);
  const pointerRestTarget = new THREE.Vector2(0, 0);
  const lastPointerTarget = new THREE.Vector2(0, 0);
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
  const motionGltfLoader = new GLTFLoader();
  let audioContext: AudioContext | null = null;
  let sourceNode: MediaElementAudioSourceNode | null = null;
  let analyserNode: AnalyserNode | null = null;
  let analyserData: Uint8Array | null = null;
  let lipSync = 0;
  let motionMixer: THREE.AnimationMixer | null = null;
  let motionAction: THREE.AnimationAction | null = null;
  let currentMotionAsset: MotionAsset | null = null;
  let idleBaseAction: THREE.AnimationAction | null = null;
  let idleBaseAsset: MotionAsset | null = null;
  let currentMotionNonce = 0;
  let idleTransitionQueued = false;
  let motionTransition: TransitionState | null = null;
  let pendingMotionName: string | null = null;
  const talkingMotion: TalkingMotionState = {
    phase: null,
    nonce: 0,
    stopRequested: false,
  };
  const motionClipCache = new Map<string, Promise<MotionAsset | null>>();
  const normalizedBoneStates = new Map<NormalizedBoneName, NormalizedBoneState>();
  let vrm: VRM | null = null;
  let rootScene: THREE.Object3D | null = null;
  let desiredExpression = "neutral";
  let syntheticLipSyncTime = 0;
  let modelHeight = 1.7;
  let modelFocusY = 0.95;
  let lookAtBaseZ = 1.2;
  let eyeLevelY = 1.08;
  let idleGazeTarget = new THREE.Vector2(0, 0);
  let idleGazeFrom = new THREE.Vector2(0, 0);
  let idleGazeProgress = 1;
  let idleGazeDuration = 1.4;
  let idleGazeHold = 0.8;
  let pointerFollowWeight = 0;
  let pointerIdleElapsed = 0;
  let pointerIdleResetActive = false;
  let hasPointerInput = false;
  let blinkWeight = 0;
  let blinkCycleTime = 0;
  let nextBlinkAt = 2.6;
  let neckBone: THREE.Object3D | null = null;
  let headBone: THREE.Object3D | null = null;
  const neckRestQuaternion = new THREE.Quaternion();
  let headRestQuaternion = new THREE.Quaternion();
  const neckTargetEuler = new THREE.Euler(0, 0, 0, "YXZ");
  const headTargetEuler = new THREE.Euler(0, 0, 0, "YXZ");

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

  function updateIdleGaze(delta: number, forceForward = false) {
    if (forceForward) {
      idleGazeProgress = 1;
      idleGazeHold = 0.45;
      idleGazeTarget.set(0, 0);
      idleGazeFrom.lerp(idleGazeTarget, 0.08 * Math.max(delta * 60, 1));
      return idleGazeFrom;
    }

    if (state.activeMotion !== "idle") {
      idleGazeProgress = 1;
      idleGazeHold = 0.45;
      idleGazeTarget.set(0, 0);
      idleGazeFrom.lerp(idleGazeTarget, 0.04 * Math.max(delta * 60, 1));
      return idleGazeFrom;
    }

    if (state.activeMotion === "idle" && pointer.lengthSq() > 0.0006) {
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

  type ClipStartPoseFallback = "current" | "restFingers";

  function extractClipStartPose(clip: THREE.AnimationClip, fallback: ClipStartPoseFallback = "current") {
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
      const useRestFallback = fallback === "restFingers" && FINGER_BONE_NAMES.has(boneName);
      normalizedPose.set(boneName, {
        quaternion: partial?.quaternion?.clone() ?? (useRestFallback ? state.restQuaternion.clone() : state.bone.quaternion.clone()),
        position: partial?.position?.clone() ?? (useRestFallback ? state.restPosition.clone() : state.bone.position.clone()),
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

    const idleReferenceAsset = await loadMotionClip(idleReferenceUrl, "fullBody");
    if (!idleReferenceAsset) {
      return createRestPose();
    }

    return extractClipStartPose(idleReferenceAsset.clip, "restFingers");
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

  function clearTalkingMotionState() {
    talkingMotion.phase = null;
    talkingMotion.stopRequested = false;
  }

  function resolveTalkingMotionUrl(phase: TalkingMotionPhase) {
    const answerConfig = findMotionConfig(avatarConfig, "answer");
    const answerUrl = resolveMotionUrls("answer", answerConfig)[0] ?? answerConfig?.clipUrl;
    if (!answerUrl) {
      return null;
    }

    const phaseName = phase === "start" ? "Start" : phase === "cycle" ? "Cycle" : "Stop";
    const matched = answerUrl.match(/^(.*\/)Talking(?:_(?:Start|Cycle|Stop))?\.(?:vrma|fbx)([?#].*)?$/i);
    if (!matched) {
      return null;
    }

    return `${matched[1]}Talking_${phaseName}.vrma${matched[2] ?? ""}`;
  }

  async function playTalkingMotionPhase(phase: TalkingMotionPhase, nonce = talkingMotion.nonce) {
    if (!vrm || !motionMixer || nonce !== talkingMotion.nonce) {
      return false;
    }

    const motionUrl = resolveTalkingMotionUrl(phase);
    if (!motionUrl) {
      return false;
    }

    const asset = await loadMotionClip(motionUrl, "upperBody");
    if (!asset || nonce !== talkingMotion.nonce) {
      return false;
    }

    await ensureIdleBaseLayer(motionAction?.time ?? 0);
    if (nonce !== talkingMotion.nonce) {
      return false;
    }

    motionTransition = null;
    motionAction?.stop();

    const nextAction = motionMixer.clipAction(asset.clip);
    nextAction.reset();
    nextAction.setLoop(THREE.LoopOnce, 1);
    nextAction.clampWhenFinished = true;
    nextAction.enabled = true;
    nextAction.weight = 1;
    nextAction.play();

    motionAction = nextAction;
    currentMotionAsset = asset;
    talkingMotion.phase = phase;
    state.activeMotion = phase === "cycle" ? "answer" : `answer-${phase}`;
    pendingMotionName = null;
    return true;
  }

  function requestTalkingMotionStop() {
    talkingMotion.stopRequested = true;
  }

  function handleTalkingMotionFinished(action: THREE.AnimationAction) {
    if (!talkingMotion.phase || action !== motionAction) {
      return false;
    }

    const completedPhase = talkingMotion.phase;
    queueMicrotask(() => {
      if (action !== motionAction && completedPhase !== "stop") {
        return;
      }

      if (completedPhase === "start") {
        if (talkingMotion.stopRequested || !state.speaking) {
          void playTalkingMotionPhase("stop");
        } else {
          void playTalkingMotionPhase("cycle");
        }
        return;
      }

      if (completedPhase === "cycle") {
        if (talkingMotion.stopRequested || !state.speaking) {
          void playTalkingMotionPhase("stop");
        } else {
          void playTalkingMotionPhase("cycle");
        }
        return;
      }

      clearTalkingMotionState();
      if (!state.speaking) {
        pendingMotionName = "idle";
        void queueRestTransition("idle", 0.32);
      }
    });

    return true;
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
    idleBaseAction = null;
    idleBaseAsset = null;
    motionTransition = {
      toMotionName: state.activeMotion ?? "idle",
      asset: {
        clip: new THREE.AnimationClip("__rest__", 0, []),
        hasFingerMotion: false,
        hasHeadMotion: false,
        rigProfileName: "mixamo",
        bodyMask: "fullBody",
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

  function applyIdlePoseCorrections(delta: number, immediate = false) {
    if (state.activeMotion !== "idle") {
      return;
    }

    if (currentMotionAsset ? currentMotionAsset.rigProfileName !== "mixamo" : usesAuthoredIdleMotion()) {
      return;
    }

    const step = immediate ? 1 : Math.min(delta * 60, 1.6);
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
      state.bone.quaternion.slerp(target, Math.min(weight * step, 1));
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
        Math.min(weight * step, 1),
      );
    };

    const bodyWeight = immediate ? 1 : 0.08;
    const armWeight = immediate ? 1 : 0.18;
    const handWeight = immediate ? 1 : 0.14;
    const fingerWeight = immediate ? 1 : 0.1;

    applyPositionBlend("hips", { x: 0.006, y: 0.004, z: 0.01 }, bodyWeight);
    applyRotationOffset("hips", { x: 0.8, y: 0, z: -0.6 }, bodyWeight);
    applyRotationOffset("spine", { x: -0.8, y: 0.4, z: 0.5 }, bodyWeight);
    applyRotationOffset("chest", { x: -1.2, y: 0.6, z: 0.4 }, bodyWeight);
    applyRotationOffset("upperChest", { x: -1, y: 0.5, z: 0.2 }, bodyWeight);

    applyRotationOffset("leftShoulder", { x: 2, y: 5, z: 12 }, armWeight, "YXZ");
    applyRotationOffset("rightShoulder", { x: 2, y: -5, z: -12 }, armWeight, "YXZ");
    applyRotationOffset("leftUpperArm", { x: 8, y: 12, z: 72 }, armWeight, "YXZ");
    applyRotationOffset("rightUpperArm", { x: 8, y: -12, z: -72 }, armWeight, "YXZ");
    applyRotationOffset("leftLowerArm", { x: -16, y: 6, z: 14 }, armWeight, "YXZ");
    applyRotationOffset("rightLowerArm", { x: -16, y: -6, z: -14 }, armWeight, "YXZ");
    applyRotationOffset("leftHand", { x: -10, y: 10, z: 8 }, handWeight, "YXZ");
    applyRotationOffset("rightHand", { x: -10, y: -10, z: -8 }, handWeight, "YXZ");

    applyRotationOffset("leftThumbMetacarpal", { x: 2, y: -4, z: 4 }, 0.08, "YXZ");
    applyRotationOffset("leftThumbProximal", { x: 3, y: -3, z: 5 }, 0.08, "YXZ");
    applyRotationOffset("leftThumbDistal", { x: 4, y: -2, z: 4 }, 0.08, "YXZ");
    applyRotationOffset("rightThumbMetacarpal", { x: 2, y: 4, z: -4 }, 0.08, "YXZ");
    applyRotationOffset("rightThumbProximal", { x: 3, y: 3, z: -5 }, 0.08, "YXZ");
    applyRotationOffset("rightThumbDistal", { x: 4, y: 2, z: -4 }, 0.08, "YXZ");

    applyRotationOffset("leftIndexProximal", { x: 14 }, fingerWeight);
    applyRotationOffset("leftIndexIntermediate", { x: 16 }, fingerWeight);
    applyRotationOffset("leftIndexDistal", { x: 10 }, fingerWeight);
    applyRotationOffset("leftMiddleProximal", { x: 18 }, fingerWeight);
    applyRotationOffset("leftMiddleIntermediate", { x: 20 }, fingerWeight);
    applyRotationOffset("leftMiddleDistal", { x: 12 }, fingerWeight);
    applyRotationOffset("leftRingProximal", { x: 20 }, fingerWeight);
    applyRotationOffset("leftRingIntermediate", { x: 22 }, fingerWeight);
    applyRotationOffset("leftRingDistal", { x: 14 }, fingerWeight);
    applyRotationOffset("leftLittleProximal", { x: 24, z: -3 }, fingerWeight, "XZY");
    applyRotationOffset("leftLittleIntermediate", { x: 24 }, fingerWeight);
    applyRotationOffset("leftLittleDistal", { x: 15 }, fingerWeight);

    applyRotationOffset("rightIndexProximal", { x: 14 }, fingerWeight);
    applyRotationOffset("rightIndexIntermediate", { x: 16 }, fingerWeight);
    applyRotationOffset("rightIndexDistal", { x: 10 }, fingerWeight);
    applyRotationOffset("rightMiddleProximal", { x: 18 }, fingerWeight);
    applyRotationOffset("rightMiddleIntermediate", { x: 20 }, fingerWeight);
    applyRotationOffset("rightMiddleDistal", { x: 12 }, fingerWeight);
    applyRotationOffset("rightRingProximal", { x: 20 }, fingerWeight);
    applyRotationOffset("rightRingIntermediate", { x: 22 }, fingerWeight);
    applyRotationOffset("rightRingDistal", { x: 14 }, fingerWeight);
    applyRotationOffset("rightLittleProximal", { x: 24, z: 3 }, fingerWeight, "XZY");
    applyRotationOffset("rightLittleIntermediate", { x: 24 }, fingerWeight);
    applyRotationOffset("rightLittleDistal", { x: 15 }, fingerWeight);

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

    if (currentMotionAsset && currentMotionAsset.rigProfileName !== "mixamo") {
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
    const modelOffsetX = config.modelUrl.includes("/avatar/xiaoA/") ? XIAOA_MODEL_OFFSET_X : 0;
    nextVrm.scene.position.set(-center.x + modelOffsetX, -bounds.min.y, -center.z);
    nextVrm.scene.rotation.set(0, 0, 0);
    nextVrm.scene.traverse((object) => {
      object.frustumCulled = false;
    });

    if (rootScene) {
      group.remove(rootScene);
      VRMUtils.deepDispose(rootScene);
    }

    talkingMotion.nonce += 1;
    clearTalkingMotionState();
    state.speaking = false;
    syntheticLipSyncTime = 0;
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
    motionMixer.addEventListener("finished", (event) => {
      if (handleTalkingMotionFinished((event as THREE.Event & { action: THREE.AnimationAction }).action)) {
        return;
      }

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
    idleBaseAction = null;
    idleBaseAsset = null;
    neckBone = vrm.humanoid.getRawBoneNode("neck") ?? vrm.humanoid.getNormalizedBoneNode("neck");
    if (neckBone) {
      neckRestQuaternion.copy(neckBone.quaternion);
    }
    headBone = vrm.humanoid.getRawBoneNode("head") ?? vrm.humanoid.getNormalizedBoneNode("head");
    if (headBone) {
      headRestQuaternion.copy(headBone.quaternion);
    }
    if (!usesAuthoredIdleMotion()) {
      applyIdlePoseCorrections(0, true);
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
      return [motionConfig.clipUrl.replace("/Idle_1.fbx", "/Idle.vrma")];
    }

    if (motionConfig.clipUrl.endsWith("/Idle_3.fbx")) {
      return [motionConfig.clipUrl.replace("/Idle_3.fbx", "/Idle.vrma")];
    }

    if (motionConfig.clipUrl.endsWith("/Idle.fbx")) {
      return [motionConfig.clipUrl.replace("/Idle.fbx", "/Idle.vrma")];
    }

    return [motionConfig.clipUrl];
  }

  function resolveIdleReferenceUrl() {
    const idleConfig = findMotionConfig(avatarConfig, "idle");
    if (!idleConfig?.clipUrl) {
      return null;
    }

    if (idleConfig.clipUrl.endsWith("/Idle_1.fbx")) {
      return idleConfig.clipUrl.replace("/Idle_1.fbx", "/Idle.vrma");
    }

    if (idleConfig.clipUrl.endsWith("/Idle_3.fbx")) {
      return idleConfig.clipUrl.replace("/Idle_3.fbx", "/Idle.vrma");
    }

    if (idleConfig.clipUrl.endsWith("/Idle.fbx")) {
      return idleConfig.clipUrl.replace("/Idle.fbx", "/Idle.vrma");
    }

    return idleConfig.clipUrl;
  }

  function usesAuthoredIdleMotion() {
    const idleConfig = findMotionConfig(avatarConfig, "idle");
    const idleUrl = resolveMotionUrls("idle", idleConfig)[0] ?? idleConfig?.clipUrl ?? "";
    return idleUrl.endsWith("/Idle_3.fbx") || isVrmaMotionUrl(idleUrl);
  }

  function resolveMotionBodyMask(name: string, motionConfig?: AvatarMotionBinding): MotionBodyMask {
    return motionConfig?.bodyMask ?? (name === "idle" ? "fullBody" : "upperBody");
  }

  function getTrackBoneName(track: THREE.KeyframeTrack) {
    return track.name.split(".")[0];
  }

  function filterMotionTracks(tracks: THREE.KeyframeTrack[], bodyMask: MotionTrackMask) {
    if (bodyMask === "fullBody") {
      return tracks;
    }

    return tracks.filter((track) => {
      const boneName = getTrackBoneName(track);
      const isUpperBodyTrack = UPPER_BODY_BONE_NAMES.has(boneName);
      return bodyMask === "upperBody" ? isUpperBodyTrack : !isUpperBodyTrack;
    });
  }

  function hasAnyBoneTrack(tracks: THREE.KeyframeTrack[], boneNames: Set<string>) {
    return tracks.some((track) => boneNames.has(getTrackBoneName(track)));
  }

  function resolveMotionRigProfile(fbx: THREE.Group, sourceClip: THREE.AnimationClip) {
    const sourceTrackNames = sourceClip.tracks.map((track) => track.name);
    return (
      MOTION_RIG_PROFILES.find(
        (profile) =>
          !!fbx.getObjectByName(profile.hipsBoneName) ||
          sourceTrackNames.some((trackName) => trackName.startsWith(`${profile.hipsBoneName}.`)),
      ) ?? MOTION_RIG_PROFILES[0]
    );
  }

  function createVRMAMotionAsset(gltf: GLTF, url: string, bodyMask: MotionTrackMask): MotionAsset | null {
    const sourceClip = gltf.animations[0];
    const vrmaJson = gltf.parser.json as VRMAJson;
    const humanBones = vrmaJson.extensions?.VRMC_vrm_animation?.humanoid?.humanBones;

    if (!sourceClip || !humanBones) {
      console.warn("[avatar] VRMA motion is missing clip or humanoid mapping", url);
      return null;
    }

    gltf.scene.updateWorldMatrix(false, true);

    const sourceNodeNameToBone = new Map<string, VRMABoneBinding>();
    const sourceBoneWorldMatrices = new Map<NormalizedBoneName | "hipsParent", THREE.Matrix4>();
    const sourceHipsRestPosition = new THREE.Vector3();

    Object.entries(humanBones).forEach(([boneName, binding]) => {
      if (!isNormalizedBoneName(boneName) || typeof binding.node !== "number") {
        return;
      }

      const sourceNodeName = vrmaJson.nodes?.[binding.node]?.name;
      if (!sourceNodeName) {
        return;
      }

      const sanitizedSourceNodeName = THREE.PropertyBinding.sanitizeNodeName(sourceNodeName);
      const sourceNode = gltf.scene.getObjectByName(sanitizedSourceNodeName);
      const targetState = normalizedBoneStates.get(boneName);
      if (!sourceNode || !targetState) {
        return;
      }

      sourceNodeNameToBone.set(sanitizedSourceNodeName, {
        boneName,
        sourceNode,
        targetState,
      });

      sourceBoneWorldMatrices.set(boneName, sourceNode.matrixWorld.clone());
      if (boneName === "hips") {
        sourceNode.getWorldPosition(sourceHipsRestPosition);
        sourceBoneWorldMatrices.set("hipsParent", sourceNode.parent?.matrixWorld.clone() ?? new THREE.Matrix4());
      }
    });

    const tracks: THREE.KeyframeTrack[] = [];
    const parentRestPosition = new THREE.Vector3();
    const parentRestScale = new THREE.Vector3();
    const restPosition = new THREE.Vector3();
    const restScale = new THREE.Vector3();
    const parentRestWorldRotation = new THREE.Quaternion();
    const restWorldRotationInverse = new THREE.Quaternion();
    const sourceMotionQuaternion = new THREE.Quaternion();
    const sourceMotionPosition = new THREE.Vector3();
    const sourceHipsParentWorldMatrix = sourceBoneWorldMatrices.get("hipsParent") ?? new THREE.Matrix4();
    const vrmHipsHeight = vrm?.humanoid.normalizedRestPose.hips?.position?.[1];
    const hipsPositionScale =
      vrmHipsHeight != null && sourceHipsRestPosition.y !== 0 ? vrmHipsHeight / sourceHipsRestPosition.y : 1;

    const resolveParentWorldMatrix = (boneName: NormalizedBoneName) => {
      let parentBoneName = VRMA_BONE_PARENT[boneName];
      while (parentBoneName && !sourceBoneWorldMatrices.has(parentBoneName)) {
        parentBoneName = VRMA_BONE_PARENT[parentBoneName];
      }

      return parentBoneName
        ? sourceBoneWorldMatrices.get(parentBoneName)
        : sourceBoneWorldMatrices.get("hipsParent");
    };

    sourceClip.tracks.forEach((track) => {
      const [sourceNodeName, propertyName] = track.name.split(".");
      const binding = sourceNodeNameToBone.get(sourceNodeName);
      if (!binding) {
        return;
      }

      if (track instanceof THREE.QuaternionKeyframeTrack && propertyName === "quaternion") {
        const values = track.values.slice();
        const restWorldMatrix = sourceBoneWorldMatrices.get(binding.boneName);
        const parentWorldMatrix = resolveParentWorldMatrix(binding.boneName);
        if (!restWorldMatrix || !parentWorldMatrix) {
          return;
        }

        restWorldMatrix.decompose(restPosition, restWorldRotationInverse, restScale);
        restWorldRotationInverse.invert();
        parentWorldMatrix.decompose(parentRestPosition, parentRestWorldRotation, parentRestScale);

        for (let index = 0; index < values.length; index += 4) {
          sourceMotionQuaternion.fromArray(values, index);
          sourceMotionQuaternion.premultiply(parentRestWorldRotation).multiply(restWorldRotationInverse);
          sourceMotionQuaternion.toArray(values, index);
          if (vrm?.meta.metaVersion === "0") {
            values[index] = -values[index];
            values[index + 2] = -values[index + 2];
          }
        }

        tracks.push(
          new THREE.QuaternionKeyframeTrack(`${binding.targetState.bone.name}.${propertyName}`, track.times, values),
        );
      } else if (
        track instanceof THREE.VectorKeyframeTrack &&
        propertyName === "position" &&
        binding.boneName === "hips"
      ) {
        const values = track.values.slice();

        for (let index = 0; index < values.length; index += 3) {
          sourceMotionPosition.fromArray(values, index);
          sourceMotionPosition.applyMatrix4(sourceHipsParentWorldMatrix);
          sourceMotionPosition.toArray(values, index);
          values[index] = (vrm?.meta.metaVersion === "0" ? -values[index] : values[index]) * hipsPositionScale;
          values[index + 1] *= hipsPositionScale;
          values[index + 2] = (vrm?.meta.metaVersion === "0" ? -values[index + 2] : values[index + 2]) * hipsPositionScale;
        }

        tracks.push(
          new THREE.VectorKeyframeTrack(`${binding.targetState.bone.name}.${propertyName}`, track.times, values),
        );
      }
    });

    const maskedTracks = filterMotionTracks(tracks, bodyMask);

    if (maskedTracks.length === 0) {
      console.warn("[avatar] VRMA motion has no usable humanoid tracks", url);
      return null;
    }

    return {
      clip: new THREE.AnimationClip(`vrma-${sourceClip.name || "animation"}`, sourceClip.duration, maskedTracks),
      hasHeadMotion: hasAnyBoneTrack(maskedTracks, HEAD_MOTION_BONE_NAMES),
      hasFingerMotion: hasAnyBoneTrack(maskedTracks, FINGER_BONE_NAMES),
      rigProfileName: "vrma",
      bodyMask,
    };
  }

  async function loadMotionClip(url: string, bodyMask: MotionTrackMask) {
    if (!vrm) {
      return null;
    }

    const cacheKey = `${url}#${bodyMask}`;
    if (motionClipCache.has(cacheKey)) {
      return motionClipCache.get(cacheKey)!;
    }

    const pendingClip = (async () => {
      if (isVrmaMotionUrl(url)) {
        const gltf = await motionGltfLoader.loadAsync(url);
        return createVRMAMotionAsset(gltf, url, bodyMask);
      }

      const fbx = await fbxLoader.loadAsync(url);
      const sourceClip = THREE.AnimationClip.findByName(fbx.animations, "mixamo.com") ?? fbx.animations[0];
      if (!sourceClip) {
        console.warn("[avatar] motion source is missing clip", url);
        return null;
      }

      const rigProfile = resolveMotionRigProfile(fbx, sourceClip);
      const motionHips = fbx.getObjectByName(rigProfile.hipsBoneName);
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
      sourceClip.tracks.forEach((track) => {
        const [sourceRigName, propertyName] = track.name.split(".");
        const vrmBoneName = rigProfile.sourceToHuman.get(sourceRigName);
        if (!vrmBoneName) {
          return;
        }

        const vrmNodeName = vrm?.humanoid.getNormalizedBoneNode(vrmBoneName as NormalizedBoneName)?.name;
        const sourceRigNode = fbx.getObjectByName(sourceRigName);
        if (!vrmNodeName || !sourceRigNode) {
          return;
        }

        sourceRigNode.getWorldQuaternion(restRotationInverse).invert();
        sourceRigNode.parent?.getWorldQuaternion(parentRestWorldRotation);

        if (track instanceof THREE.QuaternionKeyframeTrack) {
          const values = track.values.slice();
          if (rigProfile.name !== "jnt") {
            for (let index = 0; index < values.length; index += 4) {
              flatQuaternion.fromArray(values, index);
              flatQuaternion.premultiply(parentRestWorldRotation).multiply(restRotationInverse);
              flatQuaternion.toArray(values, index);
            }
          } else {
            const offset = JNT_ROTATION_OFFSET_QUATERNIONS.get(vrmBoneName as NormalizedBoneName);
            if (offset) {
              for (let index = 0; index < values.length; index += 4) {
                flatQuaternion.fromArray(values, index);
                flatQuaternion.multiply(offset);
                flatQuaternion.toArray(values, index);
              }
            }
          }

          tracks.push(
            new THREE.QuaternionKeyframeTrack(
              `${vrmNodeName}.${propertyName}`,
              track.times,
              values.map((value, index) => (vrm?.meta?.metaVersion === "0" && index % 2 === 0 ? -value : value)),
            ),
          );
        } else if (
          track instanceof THREE.VectorKeyframeTrack &&
          propertyName === "position" &&
          sourceRigName === rigProfile.hipsBoneName
        ) {
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

      const maskedTracks = filterMotionTracks(tracks, bodyMask);
      if (maskedTracks.length === 0) {
        console.warn("[avatar] motion has no usable humanoid tracks", url);
        return null;
      }

      return {
        clip: new THREE.AnimationClip(`vrm-${sourceClip.name}`, sourceClip.duration, maskedTracks),
        hasHeadMotion: hasAnyBoneTrack(maskedTracks, HEAD_MOTION_BONE_NAMES),
        hasFingerMotion: hasAnyBoneTrack(maskedTracks, FINGER_BONE_NAMES),
        rigProfileName: rigProfile.name,
        bodyMask,
      };
    })().catch((error) => {
      console.error("[avatar] failed to load motion clip", url, error);
      return null;
    });

    motionClipCache.set(cacheKey, pendingClip);
    return pendingClip;
  }

  function stopMotion() {
    talkingMotion.nonce += 1;
    clearTalkingMotionState();
    motionTransition = null;
    pendingMotionName = null;
    motionAction?.fadeOut(0.16);
    motionAction?.stop();
    idleBaseAction?.fadeOut(0.16);
    idleBaseAction?.stop();
    motionMixer?.stopAllAction();
    motionAction = null;
    currentMotionAsset = null;
    idleBaseAction = null;
    idleBaseAsset = null;
  }

  function setRuntimeSpeaking(speaking: boolean) {
    state.speaking = speaking;
    state.activeExpression = speaking ? "speaking" : "neutral";
    desiredExpression = speaking ? "speaking" : "neutral";

    if (speaking) {
      talkingMotion.nonce += 1;
      talkingMotion.stopRequested = false;
      void playTalkingMotionPhase("start", talkingMotion.nonce);
    } else {
      syntheticLipSyncTime = 0;
      requestTalkingMotionStop();
    }

    applyExpressionState();
  }

  async function ensureIdleBaseLayer(referenceTime = 0) {
    if (!vrm || !motionMixer || idleBaseAction) {
      return;
    }

    const idleConfig = findMotionConfig(avatarConfig, "idle");
    const idleUrl = resolveMotionUrls("idle", idleConfig)[0];
    if (!idleUrl) {
      return;
    }

    const idleAsset = await loadMotionClip(idleUrl, "lowerBody");
    if (!idleAsset) {
      return;
    }

    const action = motionMixer.clipAction(idleAsset.clip);
    action.reset();
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.enabled = true;
    action.weight = 1;
    action.time = idleAsset.clip.duration > 0 ? referenceTime % idleAsset.clip.duration : 0;
    action.play();
    idleBaseAction = action;
    idleBaseAsset = idleAsset;
  }

  async function playResolvedMotion(name: string): Promise<boolean> {
    const motionConfig = findMotionConfig(avatarConfig, name);
    const motionUrls = resolveMotionUrls(name, motionConfig);

    if (!vrm || !motionMixer || motionUrls.length === 0) {
      return false;
    }

    const selectedUrl = motionUrls[0];
    const bodyMask = resolveMotionBodyMask(name, motionConfig);

    const motionNonce = ++currentMotionNonce;
    const motionAsset = await loadMotionClip(selectedUrl, bodyMask);
    if (!motionAsset || motionNonce !== currentMotionNonce) {
      return false;
    }

    const isIdleMotion = name === "idle";
    const loopMode = motionConfig?.loop === true ? THREE.LoopRepeat : THREE.LoopOnce;
    const repetitions = loopMode === THREE.LoopOnce ? 1 : Infinity;
    const previousActionTime = motionAction?.time ?? 0;
    const transitionDuration = motionAsset.bodyMask === "upperBody" ? 0.32 : isIdleMotion ? 0.48 : 0.68;

    if (!motionAction || !currentMotionAsset) {
      if (motionAsset.bodyMask === "upperBody") {
        await ensureIdleBaseLayer(previousActionTime);
      } else {
        idleBaseAction?.stop();
        idleBaseAction = null;
        idleBaseAsset = null;
      }

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
    if (motionAsset.bodyMask === "upperBody") {
      await ensureIdleBaseLayer(previousActionTime);
    } else {
      idleBaseAction?.stop();
      idleBaseAction = null;
      idleBaseAsset = null;
      motionMixer.stopAllAction();
    }
    motionAction = null;
    currentMotionAsset = null;
    motionTransition = {
      toMotionName: name,
      asset: motionAsset,
      fromPose,
      toPose,
      elapsed: 0,
      duration: transitionDuration,
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
      const nextX = THREE.MathUtils.clamp(((clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
      const nextY = THREE.MathUtils.clamp(1 - ((clientY - rect.top) / rect.height) * 2, -1, 1);
      const didPointerMove =
        !hasPointerInput ||
        Math.abs(nextX - lastPointerTarget.x) > POINTER_MOVE_EPSILON ||
        Math.abs(nextY - lastPointerTarget.y) > POINTER_MOVE_EPSILON;

      pointerTarget.set(nextX, nextY);
      lastPointerTarget.copy(pointerTarget);

      if (didPointerMove) {
        hasPointerInput = true;
        pointerIdleElapsed = 0;
        pointerIdleResetActive = false;
      }
    },
    resetPointer() {
      pointerTarget.set(0, 0);
      lastPointerTarget.copy(pointerTarget);
      hasPointerInput = false;
      pointerIdleElapsed = 0;
      pointerIdleResetActive = false;
    },
    tick(deltaTimeSeconds) {
      const delta = deltaTimeSeconds || clock.getDelta();
      const frameScale = Math.max(delta * 60, 1);
      const canFollowPointer = state.activeMotion === "idle" && !motionTransition;
      const hasPointerTarget = hasPointerInput && pointerTarget.lengthSq() > 0.0006;

      if (canFollowPointer && hasPointerTarget && !pointerIdleResetActive) {
        pointerIdleElapsed += delta;
        if (pointerIdleElapsed >= POINTER_IDLE_RESET_SECONDS) {
          pointerIdleResetActive = true;
        }
      } else if (!canFollowPointer || !hasPointerTarget) {
        pointerIdleElapsed = 0;
        pointerIdleResetActive = false;
      }

      const shouldFollowPointer = canFollowPointer && hasPointerTarget && !pointerIdleResetActive;
      const nextPointerTarget = shouldFollowPointer ? pointerTarget : pointerRestTarget;
      pointer.lerp(nextPointerTarget, (canFollowPointer ? 0.045 : 0.008) * frameScale);
      const nextPointerFollowWeight = shouldFollowPointer ? 1 : 0;
      pointerFollowWeight = THREE.MathUtils.lerp(
        pointerFollowWeight,
        nextPointerFollowWeight,
        (nextPointerFollowWeight > pointerFollowWeight ? 0.0045 : 0.001) * frameScale,
      );

      if (analyserNode && analyserData && state.speaking && !audioElement.paused && !audioElement.ended) {
        analyserNode.getByteTimeDomainData(analyserData as Uint8Array<ArrayBuffer>);
        let total = 0;
        for (let index = 0; index < analyserData.length; index += 1) {
          total += Math.abs(analyserData[index] - 128);
        }
        lipSync = THREE.MathUtils.lerp(lipSync, Math.min(total / analyserData.length / 18, 1), 0.32);
      } else if (state.speaking) {
        syntheticLipSyncTime += delta;
        const mouthPulse =
          0.34 +
          Math.sin(syntheticLipSyncTime * 24) * 0.18 +
          Math.sin(syntheticLipSyncTime * 43) * 0.12;
        lipSync = THREE.MathUtils.lerp(lipSync, THREE.MathUtils.clamp(mouthPulse, 0.12, 0.72), 0.36);
      } else {
        syntheticLipSyncTime = 0;
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
      const autonomousGaze = updateIdleGaze(delta, pointerIdleResetActive);
      lookAtTarget.position.x = THREE.MathUtils.lerp(
        lookAtTarget.position.x,
        autonomousGaze.x * 0.42 + pointer.x * pointerFollowWeight * 0.34,
        0.08 * Math.max(delta * 60, 1),
      );
      lookAtTarget.position.y = THREE.MathUtils.lerp(
        lookAtTarget.position.y,
        eyeLevelY + autonomousGaze.y * 0.12 + pointer.y * pointerFollowWeight * 0.14,
        0.08 * Math.max(delta * 60, 1),
      );
      lookAtTarget.position.z = lookAtBaseZ;

      applyExpressionState();
      vrm?.update(delta);

      if (headBone && pointerFollowWeight > 0.001) {
        const headYaw = pointer.x * pointerFollowWeight * 12;
        const headPitch = -pointer.y * pointerFollowWeight * 8;
        const headRoll = (pointer.x * -2.4 + pointer.y * 0.9) * pointerFollowWeight;

        if (neckBone) {
          neckTargetEuler.set(
            THREE.MathUtils.degToRad(headPitch * 0.42),
            THREE.MathUtils.degToRad(headYaw * 0.38),
            THREE.MathUtils.degToRad(headRoll * 0.18),
          );
          neckBone.quaternion.multiply(new THREE.Quaternion().setFromEuler(neckTargetEuler));
        }

        headTargetEuler.set(
          THREE.MathUtils.degToRad(headPitch),
          THREE.MathUtils.degToRad(headYaw),
          THREE.MathUtils.degToRad(headRoll),
        );
        headBone.quaternion.multiply(new THREE.Quaternion().setFromEuler(headTargetEuler));
      }

      renderer.render(scene, camera);
    },
    async playMotion(name) {
      state.activeMotion = name;
      if (motionAction || currentMotionAsset || motionTransition) {
        const motionConfig = findMotionConfig(avatarConfig, name);
        const bodyMask = resolveMotionBodyMask(name, motionConfig);
        if (bodyMask === "upperBody" && !motionTransition) {
          pendingMotionName = name;
          return playResolvedMotion(name);
        }

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
    setSpeaking(speaking) {
      setRuntimeSpeaking(speaking);
    },
    async speak(audioUrl) {
      await ensureAudioGraph();
      setRuntimeSpeaking(true);
      audioElement.pause();
      audioElement.currentTime = 0;
      audioElement.src = audioUrl;
      audioElement.load();

      await new Promise<void>((resolve, reject) => {
        const onEnd = () => {
          cleanup();
          setRuntimeSpeaking(false);
          resolve();
        };
        const onError = () => {
          cleanup();
          setRuntimeSpeaking(false);
          reject(new Error(`Failed to play audio: ${audioUrl}`));
        };
        const cleanup = () => {
          audioElement.removeEventListener("ended", onEnd);
          audioElement.removeEventListener("error", onError);
        };
        audioElement.addEventListener("ended", onEnd, { once: true });
        audioElement.addEventListener("error", onError, { once: true });
        audioElement.play().catch(() => {
          cleanup();
          setRuntimeSpeaking(false);
          reject(new Error(`Failed to play audio: ${audioUrl}`));
        });
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
