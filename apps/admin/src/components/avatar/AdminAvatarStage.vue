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
const activeMotion = ref("idle");
const activeExpression = ref("neutral");

const avatarConfig = computed(() => createDefaultAvatarConfig(props.config));
const motionOptions = computed(() => avatarConfig.value.motions.slice(0, 4));
const expressionOptions = computed(() => avatarConfig.value.expressions.slice(0, 5));

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
    await avatarHandle.playMotion(activeMotion.value);
    avatarHandle.setExpression(activeExpression.value);
    isReady.value = true;
    bindResize();
    startLoop();
  } catch (error) {
    console.error("[avatar] Failed to initialize admin stage", error);
    errorMessage.value = error instanceof Error ? error.message : "Avatar preview failed to initialize.";
  }
}

async function updateRuntimeConfig(nextConfig: AvatarConfig) {
  if (!avatarHandle) return;
  await avatarHandle.loadAvatar(nextConfig);
  await avatarHandle.playMotion(activeMotion.value);
  avatarHandle.setExpression(activeExpression.value);
}

async function handleMotionSelect(name: string) {
  activeMotion.value = name;
  await avatarHandle?.playMotion(name);
}

function handleExpressionSelect(name: string) {
  activeExpression.value = name;
  avatarHandle?.setExpression(name);
}

watch(avatarConfig, (nextConfig) => {
  void updateRuntimeConfig(nextConfig);
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
    class="relative h-full w-full overflow-hidden rounded-[12px] bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)]"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <canvas ref="canvasRef" class="absolute inset-0 h-full w-full"></canvas>

    <div class="absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
      <button
        v-for="motion in motionOptions"
        :key="motion.name"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-medium transition"
        :class="activeMotion === motion.name ? 'border-[#2563eb] bg-[#2563eb] text-white' : 'border-white/80 bg-white/88 text-slate-600'"
        @click="handleMotionSelect(motion.name)"
      >
        {{ motion.label }}
      </button>
    </div>

    <div class="absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-24px)] flex-wrap gap-2">
      <button
        v-for="expression in expressionOptions"
        :key="expression.name"
        type="button"
        class="rounded-full border px-3 py-1 text-xs font-medium transition"
        :class="activeExpression === expression.name ? 'border-slate-900 bg-slate-900 text-white' : 'border-white/80 bg-white/88 text-slate-600'"
        @click="handleExpressionSelect(expression.name)"
      >
        {{ expression.label }}
      </button>
    </div>

    <div
      v-if="!isReady && !errorMessage"
      class="absolute inset-0 flex items-center justify-center"
    >
      <div class="rounded-[12px] bg-white/90 px-4 py-2 text-sm text-slate-500 shadow-[0_12px_30px_rgba(148,163,184,0.14)]">
        正在加载数字人舞台...
      </div>
    </div>

    <div
      v-if="errorMessage"
      class="absolute inset-0 flex items-center justify-center p-6"
    >
      <div class="max-w-xs rounded-[12px] bg-white/92 px-5 py-4 text-center text-sm leading-6 text-rose-500 shadow-[0_12px_30px_rgba(148,163,184,0.14)]">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>
