<script setup lang="ts">
import {
  createAvatarRuntime,
  createDefaultAvatarConfig,
  type AvatarConfig,
  type AvatarRuntimeHandle,
} from "@zrb/avatar-runtime";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  config?: AvatarConfig;
}>();

const hostRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const errorMessage = ref("");
const isReady = ref(false);

const avatarConfig = computed(() => createDefaultAvatarConfig(props.config));

let avatarHandle: AvatarRuntimeHandle | null = null;
let resizeObserver: ResizeObserver | null = null;
let rafId: number | null = null;
let lastFrameTime = 0;
let followPointerActive = false;
let pendingPointerEvent: PointerEvent | null = null;
let pointerUpdateFrameId: number | null = null;
let pointerResetTimer: number | null = null;

const FOLLOW_EXIT_DELAY_MS = 120;
const FOLLOW_BOUNDARY_HYSTERESIS_PX = 32;

function cancelLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function startLoop() {
  cancelLoop();

  const tick = (time: number) => {
    if (!avatarHandle) return;
    const delta = lastFrameTime === 0 ? 1 / 60 : Math.min((time - lastFrameTime) / 1000, 1 / 20);
    lastFrameTime = time;
    avatarHandle.tick(delta);
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}

function bindResize() {
  if (!hostRef.value || !avatarHandle) return;

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry || !avatarHandle) return;
    avatarHandle.resize(entry.contentRect.width, entry.contentRect.height);
  });

  resizeObserver.observe(hostRef.value);
}

function clearPointerResetTimer() {
  if (pointerResetTimer === null) return;
  window.clearTimeout(pointerResetTimer);
  pointerResetTimer = null;
}

function resetFollowPointer() {
  followPointerActive = false;
  pendingPointerEvent = null;
  if (pointerUpdateFrameId !== null) {
    cancelAnimationFrame(pointerUpdateFrameId);
    pointerUpdateFrameId = null;
  }
  avatarHandle?.resetPointer();
}

function handlePointerLeave() {
  clearPointerResetTimer();
  resetFollowPointer();
}

function applyWindowPointerMove(event: PointerEvent) {
  if (!avatarHandle || !hostRef.value || typeof window === "undefined") return;

  const followWidth = window.innerWidth * 0.5;
  const enterBoundaryX = followWidth;
  const exitBoundaryX = followWidth + FOLLOW_BOUNDARY_HYSTERESIS_PX;
  const isInFollowArea =
    event.clientX >= 0 &&
    event.clientX <= (followPointerActive ? exitBoundaryX : enterBoundaryX) &&
    event.clientY >= 0 &&
    event.clientY <= window.innerHeight;

  if (!isInFollowArea) {
    if (pointerResetTimer === null) {
      pointerResetTimer = window.setTimeout(() => {
        pointerResetTimer = null;
        resetFollowPointer();
      }, FOLLOW_EXIT_DELAY_MS);
    }
    return;
  }

  clearPointerResetTimer();
  followPointerActive = true;

  const hostRect = hostRef.value.getBoundingClientRect();
  const gazeCenterX = hostRect.left + hostRect.width * 0.5;
  const gazeCenterY = hostRect.top + hostRect.height * 0.34;
  const gazeRect = new DOMRect(
    gazeCenterX - followWidth / 2,
    gazeCenterY - window.innerHeight / 2,
    followWidth,
    window.innerHeight,
  );

  avatarHandle.updatePointer(
    event.clientX,
    event.clientY,
    gazeRect,
  );
}

function handleWindowPointerMove(event: PointerEvent) {
  pendingPointerEvent = event;
  if (pointerUpdateFrameId !== null) return;

  pointerUpdateFrameId = requestAnimationFrame(() => {
    pointerUpdateFrameId = null;
    const nextEvent = pendingPointerEvent;
    pendingPointerEvent = null;
    if (nextEvent) {
      applyWindowPointerMove(nextEvent);
    }
  });
}

function handleWindowPointerOut(event: PointerEvent) {
  if (event.relatedTarget !== null) return;
  clearPointerResetTimer();
  resetFollowPointer();
}

function handleWindowBlur() {
  clearPointerResetTimer();
  resetFollowPointer();
}

async function playMotion(name: string) {
  return avatarHandle?.playMotion(name) ?? false;
}

async function speak(audioUrl: string) {
  return avatarHandle?.speak(audioUrl) ?? Promise.resolve();
}

function setSpeaking(speaking: boolean) {
  avatarHandle?.setSpeaking(speaking);
}

async function initializeStage() {
  const hostElement = hostRef.value;
  const canvasElement = canvasRef.value;

  if (!hostElement || !canvasElement) return;

  try {
    avatarHandle = await createAvatarRuntime({
      canvas: canvasElement,
      config: avatarConfig.value,
    });

    const rect = hostElement.getBoundingClientRect();
    avatarHandle.resize(rect.width, rect.height);
    await avatarHandle.playMotion("idle");
    avatarHandle.setExpression("neutral");
    isReady.value = true;
    bindResize();
    startLoop();
  } catch (error) {
    console.error("[avatar] Failed to initialize stage", error);
    errorMessage.value = error instanceof Error ? error.message : "Avatar failed to initialize.";
  }
}

watch(avatarConfig, (nextConfig) => {
  if (!avatarHandle) return;
  void avatarHandle.loadAvatar(nextConfig);
});

onMounted(() => {
  void initializeStage();
  window.addEventListener("pointermove", handleWindowPointerMove);
  window.addEventListener("pointerout", handleWindowPointerOut);
  window.addEventListener("blur", handleWindowBlur);
});

onBeforeUnmount(() => {
  window.removeEventListener("pointermove", handleWindowPointerMove);
  window.removeEventListener("pointerout", handleWindowPointerOut);
  window.removeEventListener("blur", handleWindowBlur);
  clearPointerResetTimer();
  resetFollowPointer();
  cancelLoop();
  resizeObserver?.disconnect();
  resizeObserver = null;
  avatarHandle?.dispose();
  avatarHandle = null;
});

defineExpose({
  playMotion,
  speak,
  setSpeaking,
});
</script>

<template>
  <div
    ref="hostRef"
    class="relative h-full w-full overflow-hidden"
    @pointerleave="handlePointerLeave"
  >
    <canvas ref="canvasRef" class="absolute inset-0 h-full w-full"></canvas>

    <div
      v-if="!isReady && !errorMessage"
      class="absolute inset-0 flex items-center justify-center"
    >
      <div class="rounded-full bg-white/88 px-4 py-2 text-sm text-slate-500 shadow-[0_12px_30px_rgba(148,163,184,0.14)]">
        正在加载数字人...
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="absolute inset-0 flex items-center justify-center p-6"
    >
      <div class="max-w-xs rounded-3xl bg-white/92 px-5 py-4 text-center text-sm leading-6 text-rose-500 shadow-[0_12px_30px_rgba(148,163,184,0.14)]">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>
