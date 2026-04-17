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

function handlePointerMove(event: PointerEvent) {
  if (!hostRef.value || !avatarHandle) return;
  avatarHandle.updatePointer(event.clientX, event.clientY, hostRef.value.getBoundingClientRect());
}

function handlePointerLeave() {
  avatarHandle?.resetPointer();
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
});

onBeforeUnmount(() => {
  cancelLoop();
  resizeObserver?.disconnect();
  resizeObserver = null;
  avatarHandle?.dispose();
  avatarHandle = null;
});
</script>

<template>
  <div
    ref="hostRef"
    class="relative h-full w-full overflow-hidden"
    @pointermove="handlePointerMove"
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
