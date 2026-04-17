<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AvatarStage from "./components/avatar/AvatarStage.vue";
import UiBadge from "./components/ui/UiBadge.vue";
import UiCard from "./components/ui/UiCard.vue";
import {
  conversationMock,
  quickPromptsMock,
  topFeaturesMock,
  type ConversationMessage
} from "./mocks/guide";

type VoiceComposerMode = "text" | "press" | "recording";
type RecordingDisposition = "send" | "cancel";

const messageScrollRef = ref<HTMLElement | null>(null);
const composerTextareaRef = ref<HTMLTextAreaElement | null>(null);
const draftMessage = ref("");
const voiceMode = ref<VoiceComposerMode>("text");
const conversation = ref<ConversationMessage[]>([...conversationMock]);

const hasDraftMessage = computed(() => draftMessage.value.trim().length > 0);
const composerView = computed<VoiceComposerMode>(() => (hasDraftMessage.value ? "text" : voiceMode.value));
const topFeatures = topFeaturesMock;
const quickPrompts = quickPromptsMock;

const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const activePointerId = ref<number | null>(null);
const recordingStartY = ref(0);
const recordingDragOffset = ref(0);
const recordingWillCancel = ref(false);
const recordingDisposition = ref<RecordingDisposition>("send");

const mediaRecorder = ref<MediaRecorder | null>(null);
const mediaStream = ref<MediaStream | null>(null);
const audioContext = ref<AudioContext | null>(null);
const analyser = ref<AnalyserNode | null>(null);
const analyserData = ref<Uint8Array<ArrayBufferLike> | null>(null);
const recordedChunks = ref<BlobPart[]>([]);
const recordedUrl = ref<string | null>(null);
const waveFrame = ref<number | null>(null);
const waveformBars = ref(Array.from({ length: 40 }, () => 12));

const isRecordingActive = computed(() => composerView.value === "recording");
const voiceInstruction = computed(() =>
  recordingWillCancel.value ? "松手取消发送" : "松手发送，上滑取消"
);
const waveColorClass = computed(() =>
  recordingWillCancel.value ? "bg-rose-400" : "bg-[#3b82f6]"
);

function scrollMessagesToBottom() {
  if (!messageScrollRef.value) return;
  messageScrollRef.value.scrollTop = messageScrollRef.value.scrollHeight;
}

function syncComposerHeight() {
  if (!composerTextareaRef.value) {
    return;
  }

  const textarea = composerTextareaRef.value;
  textarea.style.height = "0px";
  const nextHeight = Math.min(textarea.scrollHeight, 224);
  textarea.style.height = `${Math.max(nextHeight, 48)}px`;
}

function resetWaveform() {
  waveformBars.value = Array.from({ length: 40 }, (_, index) => 10 + (index % 6));
}

function stopWaveAnimation() {
  if (waveFrame.value !== null) {
    cancelAnimationFrame(waveFrame.value);
    waveFrame.value = null;
  }
}

function startWaveAnimation() {
  stopWaveAnimation();

  const tick = () => {
    if (!analyser.value || !analyserData.value) {
      resetWaveform();
      return;
    }

    analyser.value.getByteTimeDomainData(analyserData.value as Uint8Array<ArrayBuffer>);

    const chunkSize = Math.floor(analyserData.value.length / waveformBars.value.length);
    waveformBars.value = waveformBars.value.map((currentHeight, index) => {
      const start = index * chunkSize;
      const end = Math.min(start + chunkSize, analyserData.value!.length);
      let total = 0;

      for (let pointer = start; pointer < end; pointer += 1) {
        total += Math.abs(analyserData.value![pointer] - 128);
      }

      const average = total / Math.max(end - start, 1);
      const normalized = Math.min(average / 54, 1);
      const targetHeight = 10 + normalized * 30;
      return Math.round(currentHeight + (targetHeight - currentHeight) * 0.18);
    });

    waveFrame.value = requestAnimationFrame(tick);
  };

  waveFrame.value = requestAnimationFrame(tick);
}

async function setupAudioStream() {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
    throw new Error("当前浏览器不支持录音");
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaStream.value = stream;

  const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (AudioContextCtor) {
    audioContext.value = new AudioContextCtor();
    const source = audioContext.value.createMediaStreamSource(stream);
    analyser.value = audioContext.value.createAnalyser();
    analyser.value.fftSize = 256;
    analyser.value.smoothingTimeConstant = 0.92;
    source.connect(analyser.value);
    analyserData.value = new Uint8Array(analyser.value.frequencyBinCount);
  }
}

async function cleanupAudioStream() {
  stopWaveAnimation();

  if (audioContext.value) {
    await audioContext.value.close();
    audioContext.value = null;
  }

  if (mediaStream.value) {
    mediaStream.value.getTracks().forEach((track) => track.stop());
    mediaStream.value = null;
  }

  analyser.value = null;
  analyserData.value = null;
  resetWaveform();
}

function removeRecordingListeners() {
  window.removeEventListener("pointermove", handleRecordingPointerMove);
  window.removeEventListener("pointerup", handleRecordingPointerUp);
  window.removeEventListener("pointercancel", handleRecordingPointerCancel);
}

function addRecordingListeners() {
  window.addEventListener("pointermove", handleRecordingPointerMove);
  window.addEventListener("pointerup", handleRecordingPointerUp);
  window.addEventListener("pointercancel", handleRecordingPointerCancel);
}

function clearLongPressTimer() {
  if (!longPressTimer.value) return;
  clearTimeout(longPressTimer.value);
  longPressTimer.value = null;
}

async function finishRecording(disposition: RecordingDisposition) {
  recordingDisposition.value = disposition;
  removeRecordingListeners();
  clearLongPressTimer();

  if (!mediaRecorder.value) {
    voiceMode.value = "text";
    recordingWillCancel.value = false;
    recordingDragOffset.value = 0;
    activePointerId.value = null;
    return;
  }

  if (mediaRecorder.value.state !== "inactive") {
    mediaRecorder.value.stop();
  } else {
    await cleanupAudioStream();
  }

  voiceMode.value = "text";
  recordingWillCancel.value = false;
  recordingDragOffset.value = 0;
  activePointerId.value = null;
}

async function startRecording(pointerId: number, clientY: number) {
  clearLongPressTimer();
  activePointerId.value = pointerId;
  recordingStartY.value = clientY;
  recordingDragOffset.value = 0;
  recordingWillCancel.value = false;
  recordingDisposition.value = "send";
  voiceMode.value = "recording";
  recordedChunks.value = [];

  try {
    await setupAudioStream();

    if (!mediaStream.value) {
      throw new Error("麦克风流获取失败");
    }

    const recorder = new MediaRecorder(mediaStream.value);
    mediaRecorder.value = recorder;
    addRecordingListeners();

    recorder.onstart = () => {
      console.log("[voice] 录音开始");
      startWaveAnimation();
    };

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.value.push(event.data);
      }
    };

    recorder.onstop = async () => {
      const blob = new Blob(recordedChunks.value, {
        type: recorder.mimeType || "audio/webm"
      });

      if (recordingDisposition.value === "send" && blob.size > 0) {
        if (recordedUrl.value) {
          URL.revokeObjectURL(recordedUrl.value);
        }

        recordedUrl.value = URL.createObjectURL(blob);
        console.log("[voice] 录音结束");
        console.log("[voice] 文件地址:", recordedUrl.value);
      } else {
        console.log("[voice] 录音取消");
      }

      mediaRecorder.value = null;
      recordedChunks.value = [];
      await cleanupAudioStream();
    };

    recorder.start(120);
  } catch (error) {
    console.error("[voice] 无法开始录音", error);
    voiceMode.value = "text";
    recordingWillCancel.value = false;
    activePointerId.value = null;
    removeRecordingListeners();
    await cleanupAudioStream();
  }
}

function handleRecordingPointerMove(event: PointerEvent) {
  if (event.pointerId !== activePointerId.value) {
    return;
  }

  const deltaY = event.clientY - recordingStartY.value;
  recordingDragOffset.value = Math.min(deltaY, 0);
  recordingWillCancel.value = deltaY < -78;
}

function handleRecordingPointerUp(event: PointerEvent) {
  if (event.pointerId !== activePointerId.value) {
    return;
  }

  void finishRecording(recordingWillCancel.value ? "cancel" : "send");
}

function handleRecordingPointerCancel(event: PointerEvent) {
  if (event.pointerId !== activePointerId.value) {
    return;
  }

  void finishRecording("cancel");
}

function appendMessage(message: ConversationMessage) {
  conversation.value.push(message);

  nextTick(() => {
    scrollMessagesToBottom();
  });
}

function sendDraftMessage() {
  const content = draftMessage.value.trim();
  if (!content) return;

  appendMessage({
    id: `user-${Date.now()}`,
    role: "user",
    content
  });

  draftMessage.value = "";
  voiceMode.value = "text";
}

async function insertComposerNewline() {
  if (!composerTextareaRef.value) return;

  const textarea = composerTextareaRef.value;
  const start = textarea.selectionStart ?? draftMessage.value.length;
  const end = textarea.selectionEnd ?? draftMessage.value.length;

  draftMessage.value = `${draftMessage.value.slice(0, start)}\n${draftMessage.value.slice(end)}`;

  await nextTick();
  const nextCursor = start + 1;
  textarea.setSelectionRange(nextCursor, nextCursor);
  syncComposerHeight();
}

function handlePrimaryButtonPointerDown(event: PointerEvent) {
  if (hasDraftMessage.value) {
    return;
  }

  clearLongPressTimer();

  const pointerId = event.pointerId;
  const clientY = event.clientY;

  longPressTimer.value = setTimeout(() => {
    void startRecording(pointerId, clientY);
  }, 240);
}

function handlePrimaryButtonPointerUp() {
  if (hasDraftMessage.value) {
    sendDraftMessage();
    return;
  }

  if (voiceMode.value === "recording") {
    return;
  }

  if (longPressTimer.value) {
    clearLongPressTimer();
    voiceMode.value = "press";
  }
}

function handlePrimaryButtonPointerLeave() {
  if (voiceMode.value !== "recording") {
    clearLongPressTimer();
  }
}

function handleHoldToTalkPointerDown(event: PointerEvent) {
  void startRecording(event.pointerId, event.clientY);
}

function restoreTextComposer() {
  if (voiceMode.value === "recording") return;
  voiceMode.value = "text";
}

onMounted(async () => {
  await nextTick();
  scrollMessagesToBottom();
  syncComposerHeight();
  resetWaveform();
});

watch(draftMessage, async () => {
  await nextTick();
  syncComposerHeight();

  if (draftMessage.value.trim().length > 0 && voiceMode.value !== "recording") {
    voiceMode.value = "text";
  }
});

onBeforeUnmount(() => {
  clearLongPressTimer();
  removeRecordingListeners();

  if (recordedUrl.value) {
    URL.revokeObjectURL(recordedUrl.value);
    recordedUrl.value = null;
  }

  void cleanupAudioStream();
});
</script>

<template>
  <div class="h-screen overflow-hidden bg-[#f7f7f8] text-slate-900">
    <div class="flex h-screen gap-2 p-2 md:gap-3 md:p-3 xl:gap-4">
      <aside class="hidden h-[calc(100vh-16px)] w-[500px] shrink-0 rounded-[20px] bg-[#f3f4f6] p-2.5 xl:flex xl:flex-col 2xl:h-[calc(100vh-24px)] 2xl:w-[580px] 2xl:rounded-[24px] 2xl:p-3">
        <div class="soft-float relative h-full overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_50%_8%,rgba(125,211,252,0.24),transparent_22%),radial-gradient(circle_at_50%_78%,rgba(186,230,253,0.22),transparent_28%),linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)]">
          <div class="absolute inset-x-8 top-8 bottom-8 rounded-[34px] border border-sky-100/80"></div>
          <div class="absolute inset-x-[14%] top-[5%] bottom-[5%] rounded-[40px] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(239,246,255,0.48))] shadow-[inset_0_0_0_1px_rgba(186,230,253,0.35)]"></div>
          <div class="absolute inset-0 z-10">
            <AvatarStage />
          </div>
        </div>
      </aside>

      <section class="relative flex h-[calc(100vh-16px)] min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] md:h-[calc(100vh-24px)] md:rounded-[24px]">
        <header class="relative z-10 shrink-0 px-4 py-3 sm:px-5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-cyan-400 to-emerald-300 text-white xl:hidden">
                <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M12 3c4.97 0 9 3.58 9 8s-4.03 8-9 8-9-3.58-9-8 4.03-8 9-8Z" />
                  <path d="M12 8.5v3.5l2.25 1.75" />
                </svg>
              </div>
              <div>
                <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Conversation</p>
                <h2 class="mt-1 text-sm font-semibold text-slate-900 sm:text-base">景区导览 AI 数字人</h2>
              </div>
            </div>

            <div class="hidden items-center gap-2 sm:flex">
              <UiBadge
                v-for="feature in topFeatures"
                :key="feature"
                variant="secondary"
              >
                {{ feature }}
              </UiBadge>
            </div>
          </div>
        </header>

        <div
          ref="messageScrollRef"
          class="min-h-0 flex-1 overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0px,rgba(255,255,255,0)_120px),linear-gradient(180deg,#ffffff_0%,#ffffff_100%)]"
          @pointerdown="restoreTextComposer"
        >
          <div class="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-56 pt-3 sm:px-5 lg:max-w-[56rem] xl:max-w-[60rem] xl:gap-6 xl:pb-60 xl:pt-4 2xl:max-w-6xl 2xl:px-6">
            <div
              v-for="message in conversation"
              :key="message.id"
              :class="message.role === 'user' ? 'ml-auto w-fit max-w-[84%] xl:max-w-[78%] 2xl:max-w-[72%]' : 'w-fit max-w-[94%] xl:max-w-[88%] 2xl:max-w-[84%]'"
            >
              <div
                :class="message.role === 'user'
                  ? 'rounded-2xl bg-[#f3f4f6] px-5 py-4'
                  : 'rounded-2xl bg-white px-5 py-4'"
              >
                <div class="whitespace-pre-line break-words [overflow-wrap:anywhere] text-[15px] leading-8 text-slate-700">
                  {{ message.content }}
                </div>
              </div>

              <div
                v-if="message.attachments?.length"
                class="mt-3 grid gap-3 2xl:grid-cols-[1.05fr_0.95fr]"
              >
                <template v-for="attachment in message.attachments" :key="attachment.id">
                  <UiCard
                    v-if="attachment.type === 'routes'"
                    class="border border-[#0000000d] bg-slate-50 shadow-none"
                  >
                    <div class="px-4 py-6">
                      <div class="mb-3 flex items-center justify-between">
                        <div>
                          <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            {{ attachment.eyebrow }}
                          </p>
                          <h3 class="mt-1 text-sm font-semibold text-slate-900">{{ attachment.title }}</h3>
                        </div>
                        <UiBadge variant="secondary">{{ attachment.meta }}</UiBadge>
                      </div>

                      <div class="space-y-3">
                        <article
                          v-for="route in attachment.items"
                          :key="route.id"
                          class="rounded-2xl border border-[#0000000d] bg-white p-4"
                        >
                          <div class="flex items-start justify-between gap-3">
                            <div>
                              <h4 class="text-sm font-semibold text-slate-900">{{ route.title }}</h4>
                              <p class="mt-1 text-xs leading-6 text-slate-500">{{ route.summary }}</p>
                            </div>
                            <span class="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-500">
                              {{ route.duration }}
                            </span>
                          </div>
                          <div class="mt-3 flex flex-wrap gap-2">
                            <UiBadge v-for="tag in route.tags" :key="tag" variant="secondary">
                              {{ tag }}
                            </UiBadge>
                          </div>
                        </article>
                      </div>
                    </div>
                  </UiCard>

                  <UiCard
                    v-else-if="attachment.type === 'spot'"
                    class="border border-[#0000000d] bg-slate-50 shadow-none"
                  >
                    <div class="px-4 py-6">
                      <p class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                        {{ attachment.eyebrow }}
                      </p>
                      <h3 class="mt-1 text-sm font-semibold text-slate-900">{{ attachment.title }}</h3>
                      <p class="mt-3 text-sm leading-7 text-slate-600">{{ attachment.description }}</p>

                      <div class="mt-4 grid gap-3 sm:grid-cols-2">
                        <div
                          v-for="metric in attachment.metrics"
                          :key="metric.label"
                          class="rounded-2xl border border-[#0000000d] bg-white p-4"
                        >
                          <p class="text-xs text-slate-500">{{ metric.label }}</p>
                          <strong class="mt-2 block text-sm font-semibold text-slate-900">{{ metric.value }}</strong>
                        </div>
                      </div>
                    </div>
                  </UiCard>
                </template>
              </div>
            </div>

            <div class="w-full max-w-[94%] pb-2 xl:max-w-[88%] 2xl:max-w-[84%]">
              <div class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                继续追问
              </div>
              <div class="flex flex-col gap-2">
                <button
                  v-for="prompt in quickPrompts"
                  :key="prompt"
                  type="button"
                  class="w-fit max-w-full cursor-pointer rounded-[18px] bg-[#f1f3f5] px-4 py-3 text-left text-[15px] font-medium leading-6 text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-[#eceff2]"
                >
                  {{ prompt }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4 pt-8 sm:px-5">
          <div
            class="mx-auto w-full max-w-4xl transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] lg:max-w-[56rem] xl:max-w-[60rem] 2xl:max-w-6xl"
          >
            <div
              class="pointer-events-auto soft-float overflow-hidden rounded-[28px] bg-white transition-[border-color,box-shadow,transform,max-width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              :class="composerView === 'text'
                ? 'p-2 focus-within:border-[#0000001a] focus-within:[--tw-shadow:0_28px_72px_rgb(120_120_120_/_10%)] focus-within:shadow-[var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),0_0_0_2px_rgba(15,23,42,0.025),var(--tw-shadow)]'
                : 'border-transparent bg-white p-2.5 shadow-[0_24px_60px_rgba(135,135,135,0.07)]'"
            >
              <Transition
                mode="out-in"
                enter-active-class="transition duration-360 ease-[cubic-bezier(0.22,1,0.36,1)]"
                enter-from-class="translate-y-1.5 scale-[0.992] opacity-0"
                enter-to-class="translate-y-0 scale-100 opacity-100"
                leave-active-class="transition duration-220 ease-in-out"
                leave-from-class="translate-y-0 scale-100 opacity-100"
                leave-to-class="translate-y-[-4px] scale-[0.992] opacity-0"
              >
                <div v-if="composerView === 'text'" key="text" class="flex items-end gap-3">
                  <textarea
                    ref="composerTextareaRef"
                    v-model="draftMessage"
                    rows="1"
                    class="min-h-[48px] max-h-56 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-4 py-2 text-[16px] leading-7 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    placeholder="有问题，尽管问"
                    @keydown.ctrl.enter.prevent="insertComposerNewline"
                    @keydown.enter.exact.prevent="sendDraftMessage"
                  ></textarea>

                  <button
                    type="button"
                    class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out"
                    :class="hasDraftMessage
                      ? 'bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'"
                    :aria-label="hasDraftMessage ? '发送消息' : '语音输入'"
                    @pointerdown="handlePrimaryButtonPointerDown"
                    @pointerup="handlePrimaryButtonPointerUp"
                    @pointerleave="handlePrimaryButtonPointerLeave"
                  >
                    <span class="relative block h-5 w-5 overflow-hidden">
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        aria-hidden="true"
                        class="absolute inset-0 h-5 w-5 transition-all duration-250 ease-out"
                        :class="hasDraftMessage
                          ? 'translate-y-[-140%] opacity-0 scale-90'
                          : 'translate-y-0 opacity-100 scale-100'"
                      >
                        <path d="M12 4a3 3 0 0 1 3 3v5a3 3 0 1 1-6 0V7a3 3 0 0 1 3-3Z" />
                        <path d="M19 11a7 7 0 0 1-14 0" />
                        <path d="M12 18v3" />
                      </svg>
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        aria-hidden="true"
                        class="absolute inset-0 h-5 w-5 transition-all duration-250 ease-out"
                        :class="hasDraftMessage
                          ? 'translate-y-0 opacity-100 scale-100'
                          : 'translate-y-[140%] opacity-0 scale-90'"
                      >
                        <path d="M12 5v14" />
                        <path d="m19 12-7-7-7 7" />
                      </svg>
                    </span>
                  </button>
                </div>

                <div v-else-if="composerView === 'press'" key="press" class="py-0.5">
                  <button
                    type="button"
                    class="flex h-[58px] w-full cursor-pointer items-center justify-center rounded-[22px] border border-[#00000014] bg-white text-[17px] font-medium tracking-[0.02em] text-slate-700 shadow-[0_16px_38px_rgba(148,163,184,0.10)] transition duration-200 hover:border-[#0000001d] hover:bg-white"
                    @pointerdown.prevent="handleHoldToTalkPointerDown"
                    @click.prevent
                  >
                    长按说话 短按返回
                  </button>
                </div>

                <div
                  v-else
                  key="recording"
                  class="relative flex flex-col items-center justify-center gap-5 overflow-hidden px-4 py-5 text-center transition-transform duration-150"
                  :style="{ transform: `translateY(${Math.max(recordingDragOffset / 6, -18)}px)` }"
                >
                  <div class="space-y-1.5">
                    <p class="text-[15px] font-medium tracking-[0.04em] text-slate-500">
                      {{ voiceInstruction }}
                    </p>
                    <p
                      v-if="recordingWillCancel"
                      class="text-xs font-medium text-rose-500"
                    >
                      继续上滑可取消本次录音
                    </p>
                  </div>

                  <div class="relative flex h-14 w-full items-center justify-center gap-[6px]">
                    <span
                      v-for="(height, index) in waveformBars"
                      :key="index"
                      class="block w-[4px] rounded-full transition-[height,background-color,transform] duration-150 ease-out"
                      :class="waveColorClass"
                      :style="{ height: `${height}px` }"
                    ></span>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
