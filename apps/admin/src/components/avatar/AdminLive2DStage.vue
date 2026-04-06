<script setup lang="ts">
import { loadLive2DModel, type Live2DModelHandle } from "@zrb/live2d-runtime";
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    modelJsonUrl?: string;
  }>(),
  {
    modelJsonUrl: "/haru/runtime/haru.model3.json",
  },
);

const hostRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const errorMessage = ref("");
const isReady = ref(false);

let live2dHandle: Live2DModelHandle | null = null;
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
    if (!live2dHandle) return;

    const delta = lastFrameTime === 0 ? 1 / 60 : Math.min((time - lastFrameTime) / 1000, 1 / 20);
    lastFrameTime = time;
    live2dHandle.tick(delta);
    rafId = requestAnimationFrame(tick);
  };

  rafId = requestAnimationFrame(tick);
}

function bindResize() {
  if (!hostRef.value || !live2dHandle) return;

  resizeObserver = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (!entry || !live2dHandle) return;
    live2dHandle.resize(entry.contentRect.width, entry.contentRect.height);
  });

  resizeObserver.observe(hostRef.value);
}

function handlePointerMove(event: PointerEvent) {
  if (!hostRef.value || !live2dHandle) return;
  live2dHandle.updatePointer(event.clientX, event.clientY, hostRef.value.getBoundingClientRect());
}

function handlePointerLeave() {
  live2dHandle?.resetPointer();
}

function handleStageTap() {
  if (!live2dHandle) return;
  void live2dHandle.playMotion("Tap");
}

async function initializeStage() {
  const hostElement = hostRef.value;
  const canvasElement = canvasRef.value;

  if (!hostElement || !canvasElement) return;

  try {
    live2dHandle = await loadLive2DModel({
      canvas: canvasElement,
      modelJsonUrl: props.modelJsonUrl,
      layout: {
        landscapeHeight:1.5,
        portraitHeight: 1.6,
        scaleX: 2,
        offsetX: 1.2,
        offsetY: 0.5,
      },
    });

    if (!live2dHandle) return;

    const rect = hostElement.getBoundingClientRect();
    live2dHandle.resize(rect.width, rect.height);
    isReady.value = true;
    bindResize();
    startLoop();
  } catch (error) {
    console.error("[live2d] Failed to initialize admin stage", error);
    errorMessage.value = error instanceof Error ? error.message : "Live2D preview failed to initialize.";
  }
}

onMounted(() => {
  void initializeStage();
});

onBeforeUnmount(() => {
  cancelLoop();
  resizeObserver?.disconnect();
  resizeObserver = null;
  live2dHandle?.dispose();
  live2dHandle = null;
});
</script>

<template>
  <div
    ref="hostRef"
    class="relative h-full w-full overflow-hidden rounded-[12px] bg-[linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)]"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
    @click="handleStageTap"
  >
    <canvas
      ref="canvasRef"
      class="absolute inset-0 h-full w-full"
    ></canvas>

    <div
      v-if="!isReady && !errorMessage"
      class="absolute inset-0 flex items-center justify-center"
    >
      <div class="rounded-[12px] bg-white/90 px-4 py-2 text-sm text-slate-500 shadow-[0_12px_30px_rgba(148,163,184,0.14)]">
        正在加载数字人预览...
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
