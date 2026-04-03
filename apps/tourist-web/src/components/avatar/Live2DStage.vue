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
const isPlayingTestVoice = ref(false);

const TEST_AUDIO_URLS = Array.from({ length: 10 }, (_, index) => {
  const fileIndex = String(index + 1).padStart(2, "0");
  return `/haru/runtime/sounds/haru_normal_${fileIndex}.wav`;
});

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
    if (!live2dHandle) {
      return;
    }

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
  if (!live2dHandle) return;
  live2dHandle.resetPointer();
}

function handleStageTap() {
  if (!live2dHandle) return;
  void live2dHandle.playMotion("Tap");
}

async function playRandomTestVoice(event: MouseEvent) {
  event.stopPropagation();

  if (!live2dHandle || isPlayingTestVoice.value) {
    return;
  }

  const randomIndex = Math.floor(Math.random() * TEST_AUDIO_URLS.length);
  const audioUrl = TEST_AUDIO_URLS[randomIndex];

  try {
    isPlayingTestVoice.value = true;
    await live2dHandle.playMotion("Tap");
    await live2dHandle.speak(audioUrl);
  } catch (error) {
    console.error("[live2d] Failed to play test voice", error);
  } finally {
    isPlayingTestVoice.value = false;
  }
}

async function initializeStage() {
  const hostElement = hostRef.value;
  const canvasElement = canvasRef.value;

  if (!hostElement || !canvasElement) {
    return;
  }

  try {
    live2dHandle = await loadLive2DModel({
      canvas: canvasElement,
      modelJsonUrl: props.modelJsonUrl,
    });

    if (!hostRef.value || !live2dHandle) {
      return;
    }

    const rect = hostElement.getBoundingClientRect();
    live2dHandle.resize(rect.width, rect.height);
    isReady.value = true;
    bindResize();
    startLoop();
  } catch (error) {
    console.error("[live2d] Failed to initialize stage", error);
    errorMessage.value = error instanceof Error ? error.message : "Live2D 初始化失败";
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
    class="relative h-full w-full overflow-hidden"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
    @click="handleStageTap"
  >
    <button
      type="button"
      class="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full border border-slate-200/80 bg-white/86 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-[0_10px_22px_rgba(148,163,184,0.14)] transition hover:border-slate-300 hover:bg-white disabled:cursor-default disabled:opacity-60"
      :disabled="isPlayingTestVoice"
      @click="playRandomTestVoice"
    >
      {{ isPlayingTestVoice ? "播放中..." : "随机语音测试" }}
    </button>

    <canvas
      ref="canvasRef"
      class="absolute inset-0 h-full w-full"
    ></canvas>

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
