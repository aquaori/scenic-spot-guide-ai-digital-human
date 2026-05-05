<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AvatarStage from "./components/avatar/AvatarStage.vue";
import StreamingMarkdown from "./components/chat/StreamingMarkdown.vue";
import UiBadge from "./components/ui/UiBadge.vue";
import UiCard from "./components/ui/UiCard.vue";
import {
  touristApi,
  type TouristDigitalHuman
} from "./api/tourist";
import {
  topFeaturesMock,
  type ConversationMessage
} from "./mocks/guide";
import { getInitialMockConversation, getMockQuickPrompts } from "./mocks/api";

type VoiceComposerMode = "text" | "press" | "recording";
type RecordingDisposition = "send" | "cancel";
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: {
    readonly transcript: string;
  };
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

const SESSION_STORAGE_KEY = "tourist-chat-session-id";

function getStoredSessionId() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(SESSION_STORAGE_KEY)?.trim() ?? "";
}

function persistSessionId(value: string) {
  if (typeof window === "undefined") return;
  if (!value) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(SESSION_STORAGE_KEY, value);
}

const messageScrollRef = ref<HTMLElement | null>(null);
const composerTextareaRef = ref<HTMLTextAreaElement | null>(null);
const draftMessage = ref("");
const voiceMode = ref<VoiceComposerMode>("text");
const conversation = ref<ConversationMessage[]>([]);
const isSending = ref(false);
const previousSessionId = getStoredSessionId();
const sessionId = ref("");
const visitorId = ref<number>(1);
const scenicId = ref<number>(1);
const digitalHuman = ref<TouristDigitalHuman | null>(null);
const bootstrapError = ref("");
const pendingAssistantMessageId = ref<string | null>(null);
const speechRecognition = ref<SpeechRecognitionLike | null>(null);
const recognizedTranscript = ref("");
const interimTranscript = ref("");
const voiceErrorMessage = ref("");
let speechRecognitionStopPromise: Promise<string> | null = null;
let resolveSpeechRecognitionStopPromise: ((transcript: string) => void) | null = null;
let pendingSpeechTranscriptPromise: Promise<string> | null = null;

const hasDraftMessage = computed(() => draftMessage.value.trim().length > 0);
const shouldHighlightPrimaryButton = computed(() => hasDraftMessage.value || isSending.value);
const composerView = computed<VoiceComposerMode>(() => (hasDraftMessage.value ? "text" : voiceMode.value));
const topFeatures = topFeaturesMock;
const quickPrompts = getMockQuickPrompts();
const pageTitle = computed(() => digitalHuman.value?.humanName ?? "景区导览 AI 数字人");
const hasUserMessages = computed(() => conversation.value.some((message) => message.role === "user"));
const visibleQuickPrompts = computed(() => [] as string[]);
const isAtBottom = ref(true);
const showScrollToBottom = computed(() => !isAtBottom.value);

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
const sendActionIconPath = ref("");
const iconMorphFrame = ref<number | null>(null);

const sendArrowPoints = [
  [12, 4.5],
  [19, 11.5],
  [15, 11.5],
  [15, 19],
  [9, 19],
  [9, 11.5],
  [5, 11.5],
  [12, 4.5]
] as const;

const stopSquarePoints = [
  [6.8, 6.8],
  [12, 6.8],
  [17.2, 6.8],
  [17.2, 12],
  [17.2, 17.2],
  [12, 17.2],
  [6.8, 17.2],
  [6.8, 12]
] as const;

function buildSendActionIconPath(progress: number) {
  const points = sendArrowPoints.map(([arrowX, arrowY], index) => {
    const [squareX, squareY] = stopSquarePoints[index];
    const x = arrowX + (squareX - arrowX) * progress;
    const y = arrowY + (squareY - arrowY) * progress;
    return `${x.toFixed(3)} ${y.toFixed(3)}`;
  });

  return `M${points[0]} L${points.slice(1).join(" L")} Z`;
}

function easeIconMorph(progress: number) {
  return 1 - Math.pow(1 - progress, 3);
}

function stopIconMorphAnimation() {
  if (iconMorphFrame.value !== null) {
    cancelAnimationFrame(iconMorphFrame.value);
    iconMorphFrame.value = null;
  }
}

function animateSendActionIcon(from: number, to: number) {
  stopIconMorphAnimation();

  const duration = 180;
  const startAt = performance.now();

  const tick = (now: number) => {
    const elapsed = Math.min((now - startAt) / duration, 1);
    const eased = easeIconMorph(elapsed);
    sendActionIconPath.value = buildSendActionIconPath(from + (to - from) * eased);

    if (elapsed < 1) {
      iconMorphFrame.value = requestAnimationFrame(tick);
      return;
    }

    iconMorphFrame.value = null;
  };

  sendActionIconPath.value = buildSendActionIconPath(from);
  iconMorphFrame.value = requestAnimationFrame(tick);
}

function scrollMessagesToBottom() {
  if (!messageScrollRef.value) return;
  messageScrollRef.value.scrollTop = messageScrollRef.value.scrollHeight;
}

function isMessageScrollAtBottom() {
  if (!messageScrollRef.value) return true;

  const { scrollTop, clientHeight, scrollHeight } = messageScrollRef.value;
  return scrollHeight - (scrollTop + clientHeight) <= 24;
}

function syncBottomState() {
  isAtBottom.value = isMessageScrollAtBottom();
}

function scrollMessagesToBottomSmooth() {
  if (!messageScrollRef.value) return;
  messageScrollRef.value.scrollTo({
    top: messageScrollRef.value.scrollHeight,
    behavior: "smooth"
  });
  isAtBottom.value = true;
}

function maybeKeepMessagesPinnedToBottom() {
  nextTick(() => {
    if (!isAtBottom.value) {
      return;
    }

    scrollMessagesToBottom();
    syncBottomState();
  });
}

function handleMessageScroll() {
  syncBottomState();
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

function getSpeechRecognitionCtor() {
  const SpeechRecognitionApi = (
    window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    }
  ).SpeechRecognition ?? (
    window as typeof window & {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    }
  ).webkitSpeechRecognition;

  return SpeechRecognitionApi ?? null;
}

function resetSpeechRecognitionState() {
  recognizedTranscript.value = "";
  interimTranscript.value = "";
}

function finalizeSpeechRecognition() {
  const transcript = `${recognizedTranscript.value}${interimTranscript.value}`.trim();

  if (resolveSpeechRecognitionStopPromise) {
    resolveSpeechRecognitionStopPromise(transcript);
  }

  resolveSpeechRecognitionStopPromise = null;
  speechRecognitionStopPromise = null;
}

function stopSpeechRecognition() {
  if (!speechRecognition.value) {
    return Promise.resolve(`${recognizedTranscript.value}${interimTranscript.value}`.trim());
  }

  const instance = speechRecognition.value;
  speechRecognitionStopPromise =
    speechRecognitionStopPromise ??
    new Promise<string>((resolve) => {
      resolveSpeechRecognitionStopPromise = resolve;
    });
  speechRecognition.value = null;
  instance.stop();
  return speechRecognitionStopPromise;
}

function startSpeechRecognition() {
  resetSpeechRecognitionState();
  voiceErrorMessage.value = "";

  const SpeechRecognitionApi = getSpeechRecognitionCtor();
  if (!SpeechRecognitionApi) {
    voiceErrorMessage.value = "当前浏览器不支持语音转文字";
    return;
  }

  const recognition = new SpeechRecognitionApi();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "zh-CN";

  recognition.onresult = (event) => {
    let finals = "";
    let interim = "";

    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      const result = event.results[index];
      const transcript = result[0]?.transcript?.trim() ?? "";

      if (!transcript) {
        continue;
      }

      if (result.isFinal) {
        finals += transcript;
      } else {
        interim += transcript;
      }
    }

    if (finals) {
      recognizedTranscript.value = `${recognizedTranscript.value}${finals}`.trim();
    }

    interimTranscript.value = interim.trim();
  };

  recognition.onerror = (event) => {
    console.warn("[voice] 语音识别失败", event);
    voiceErrorMessage.value = "语音识别失败，请重试";
  };

  recognition.onend = () => {
    if (speechRecognition.value === recognition) {
      speechRecognition.value = null;
    }
    finalizeSpeechRecognition();
  };

  speechRecognition.value = recognition;
  recognition.start();
}

async function finishRecording(disposition: RecordingDisposition) {
  recordingDisposition.value = disposition;
  removeRecordingListeners();
  clearLongPressTimer();
  pendingSpeechTranscriptPromise = stopSpeechRecognition();

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
    startSpeechRecognition();

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
      const transcript = (await (pendingSpeechTranscriptPromise ?? Promise.resolve(""))).trim();
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

        if (transcript) {
          void sendMessage(transcript);
        } else {
          voiceErrorMessage.value = voiceErrorMessage.value || "未识别到语音内容，请重试";
        }
      } else {
        console.log("[voice] 录音取消");
      }

      mediaRecorder.value = null;
      recordedChunks.value = [];
      pendingSpeechTranscriptPromise = null;
      resetSpeechRecognitionState();
      await cleanupAudioStream();
    };

    recorder.start(120);
  } catch (error) {
    console.error("[voice] 无法开始录音", error);
    voiceMode.value = "text";
    recordingWillCancel.value = false;
    activePointerId.value = null;
    removeRecordingListeners();
    stopSpeechRecognition();
    pendingSpeechTranscriptPromise = null;
    resetSpeechRecognitionState();
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
  maybeKeepMessagesPinnedToBottom();
}

function updateAssistantMessage(id: string, patch: Partial<ConversationMessage>) {
  const target = conversation.value.find((message) => message.id === id);
  if (!target) return;
  Object.assign(target, patch);
  maybeKeepMessagesPinnedToBottom();
}

async function sendMessage(rawMessage: string) {
  const content = rawMessage.trim();
  if (!content) return;
  if (isSending.value) return;

  const assistantMessageId = `assistant-${Date.now()}`;
  appendMessage({
    id: `user-${Date.now()}`,
    role: "user",
    content
  });
  appendMessage({
    id: assistantMessageId,
    role: "assistant",
    content: "",
    isStreaming: true
  });
  pendingAssistantMessageId.value = assistantMessageId;

  draftMessage.value = "";
  voiceMode.value = "text";
  isSending.value = true;

  let nextContent = "";
  let streamFailed = false;

  try {
    await touristApi.openStream(
      {
        message: content,
        visitorId: visitorId.value,
        ...(sessionId.value ? { sessionId: sessionId.value } : {}),
        scenicId: scenicId.value
      },
      {
        onEvent(event) {
          if (event.event === "metadata") {
            if (event.sessionId) {
              sessionId.value = event.sessionId;
            }
            updateAssistantMessage(assistantMessageId, {
              attachments: event.attachments
            });
            return;
          }

          if (event.event === "answer" || event.event === "answer_fragment") {
            nextContent += event.content;
            pendingAssistantMessageId.value = null;
            updateAssistantMessage(assistantMessageId, {
              content: nextContent,
              isStreaming: true
            });
            return;
          }

          if (event.event === "done") {
            updateAssistantMessage(assistantMessageId, {
              isStreaming: false
            });
            return;
          }

          if (event.event === "error") {
            streamFailed = true;
            pendingAssistantMessageId.value = null;
            updateAssistantMessage(assistantMessageId, {
              content: event.message || "当前暂时无法完成回答，请稍后重试。",
              isStreaming: false
            });
          }
        }
      }
    );
  } catch (error) {
    streamFailed = true;
    console.error("[tourist] 发送消息失败", error);
    pendingAssistantMessageId.value = null;
    updateAssistantMessage(assistantMessageId, {
      content: error instanceof Error ? error.message : "当前暂时无法完成回答，请稍后重试。",
      isStreaming: false
    });
  } finally {
    if (!nextContent && !streamFailed) {
      updateAssistantMessage(assistantMessageId, {
        content: "当前没有收到有效回复，请稍后再试。",
        isStreaming: false
      });
    }
    if (pendingAssistantMessageId.value === assistantMessageId) {
      pendingAssistantMessageId.value = null;
    }
    updateAssistantMessage(assistantMessageId, {
      isStreaming: false
    });
    isSending.value = false;
  }
}

function sendDraftMessage() {
  void sendMessage(draftMessage.value);
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
  sendActionIconPath.value = buildSendActionIconPath(isSending.value ? 1 : 0);

  if (previousSessionId) {
    try {
      await touristApi.endChat({
        sessionId: previousSessionId,
        visitorId: visitorId.value,
        scenicId: scenicId.value
      });
    } catch (error) {
      console.error("[tourist] Failed to end previous session", error);
    } finally {
      persistSessionId("");
    }
  }

  try {
    const bootstrap = await touristApi.getBootstrap({ id: scenicId.value });
    scenicId.value = bootstrap.data.scenicId;
    digitalHuman.value = bootstrap.data.digitalHuman;
    conversation.value = getInitialMockConversation(
      bootstrap.data.digitalHuman?.defaultGreeting ?? "欢迎来到景区，我可以为你提供路线、景点和讲解建议。"
    );
    bootstrapError.value = "";
  } catch (error) {
    console.error("[tourist] Bootstrap failed", error);
    bootstrapError.value = error instanceof Error ? error.message : "初始化失败";
    conversation.value = [];
  }
  await nextTick();
  scrollMessagesToBottom();
  syncBottomState();
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

watch(isSending, (nextValue, previousValue) => {
  animateSendActionIcon(previousValue ? 1 : 0, nextValue ? 1 : 0);
});

watch(sessionId, (nextValue) => {
  persistSessionId(nextValue);
});

onBeforeUnmount(() => {
  stopIconMorphAnimation();
  clearLongPressTimer();
  removeRecordingListeners();
  stopSpeechRecognition();
  pendingSpeechTranscriptPromise = null;
  resetSpeechRecognitionState();

  if (recordedUrl.value) {
    URL.revokeObjectURL(recordedUrl.value);
    recordedUrl.value = null;
  }

  if (hasUserMessages.value && sessionId.value) {
    void touristApi.endChat({
      sessionId: sessionId.value,
      visitorId: visitorId.value,
      scenicId: scenicId.value
    });
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
                <h2 class="mt-1 text-sm font-semibold text-slate-900 sm:text-base">{{ pageTitle }}</h2>
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
          @scroll="handleMessageScroll"
        >
          <div class="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-56 pt-3 sm:px-5 lg:max-w-[56rem] xl:max-w-[60rem] xl:gap-6 xl:pb-60 xl:pt-4 2xl:max-w-6xl 2xl:px-6">
            <div
              v-if="bootstrapError"
              class="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-7 text-rose-600"
            >
              接口初始化失败：{{ bootstrapError }}
            </div>

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
                <div
                  v-if="message.role === 'assistant' && pendingAssistantMessageId === message.id && !message.content"
                  class="text-[15px] text-slate-500"
                >
                  <span class="thinking-shimmer inline-block font-medium">
                    正在思考
                  </span>
                </div>

                <StreamingMarkdown
                  v-else-if="message.role === 'assistant'"
                  :content="message.content"
                  :streaming="message.isStreaming"
                />

                <div v-else class="whitespace-pre-line break-words [overflow-wrap:anywhere] text-[15px] leading-8 text-slate-700">
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

            <div v-if="visibleQuickPrompts.length" class="w-full max-w-[94%] pb-2 xl:max-w-[88%] 2xl:max-w-[84%]">
              <div class="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                继续追问
              </div>
              <div class="flex flex-col gap-2">
                <button
                  v-for="prompt in visibleQuickPrompts"
                  :key="prompt"
                  type="button"
                  class="w-fit max-w-full cursor-pointer rounded-[18px] bg-[#f1f3f5] px-4 py-3 text-left text-[15px] font-medium leading-6 text-slate-700 transition duration-200 hover:-translate-y-0.5 hover:bg-[#eceff2]"
                  :disabled="isSending"
                  @click="sendMessage(prompt)"
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
            <Transition
              enter-active-class="transition duration-220 ease-[cubic-bezier(0.22,1,0.36,1)]"
              enter-from-class="translate-y-2 scale-95 opacity-0"
              enter-to-class="translate-y-0 scale-100 opacity-100"
              leave-active-class="transition duration-180 ease-in-out"
              leave-from-class="translate-y-0 scale-100 opacity-100"
              leave-to-class="translate-y-1 scale-95 opacity-0"
            >
              <div v-if="showScrollToBottom" class="mb-3 flex justify-center">
                <button
                  type="button"
                  class="pointer-events-auto inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#00000012] bg-white text-slate-500 shadow-[0_14px_34px_rgba(15,23,42,0.10)] transition hover:-translate-y-0.5 hover:text-slate-700"
                  aria-label="跳到底部"
                  @click="scrollMessagesToBottomSmooth"
                >
                  <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="m6 9 6 6 6-6" />
                    <path d="M6 5h12" opacity="0" />
                  </svg>
                </button>
              </div>
            </Transition>

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
                    :class="shouldHighlightPrimaryButton
                      ? 'bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'"
                    :disabled="isSending"
                    :aria-label="isSending ? '停止输出' : hasDraftMessage ? '发送消息' : '语音输入'"
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
                        :class="shouldHighlightPrimaryButton
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
                        aria-hidden="true"
                        class="absolute inset-0 h-5 w-5 transition-all duration-250 ease-out"
                        :class="isSending
                          ? 'translate-y-0 opacity-100 scale-200'
                          : hasDraftMessage
                            ? 'translate-y-0 opacity-100 scale-100'
                            : 'translate-y-[140%] opacity-0 scale-90'"
                      >
                        <path
                          v-if="isSending"
                          d="M8 8h8v8H8Z"
                          fill="currentColor"
                        />
                        <template v-else>
                          <path d="M12 5v14" fill="none" stroke="currentColor" stroke-width="1.8" />
                          <path d="m19 12-7-7-7 7" fill="none" stroke="currentColor" stroke-width="1.8" />
                        </template>
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
                    <p
                      v-else-if="voiceErrorMessage"
                      class="text-xs font-medium text-amber-500"
                    >
                      {{ voiceErrorMessage }}
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

<style scoped>
@keyframes thinking-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

.thinking-shimmer {
  color: transparent;
  background-image: linear-gradient(90deg, #94a3b8 0%, #cbd5e1 24%, #ffffff 42%, #cbd5e1 60%, #94a3b8 100%);
  background-size: 200% 100%;
  background-clip: text;
  -webkit-background-clip: text;
  animation: thinking-shimmer 2.2s linear infinite;
}
</style>
