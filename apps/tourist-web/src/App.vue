<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AvatarStage from "./components/avatar/AvatarStage.vue";
import StreamingMarkdown from "./components/chat/StreamingMarkdown.vue";
import UiBadge from "./components/ui/UiBadge.vue";
import UiCard from "./components/ui/UiCard.vue";
import {
  getVisitorId,
  touristApi,
  type TouristStreamEvent,
  type TouristConversationSummary,
  type TouristDigitalHuman
} from "./api/tourist";
import {
  type ConversationMessage
} from "./mocks/guide";
import { getMockQuickPrompts } from "./mocks/api";

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
const DEFAULT_WELCOME_GREETING = "你好，今天想了解什么？";

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
const avatarStageRef = ref<InstanceType<typeof AvatarStage> | null>(null);
const draftMessage = ref("");
const voiceMode = ref<VoiceComposerMode>("text");
const conversation = ref<ConversationMessage[]>([]);
const isSending = ref(false);
const previousSessionId = getStoredSessionId();
const sessionId = ref("");
const visitorId = ref(getVisitorId());
const scenicId = ref<number>(1);
const digitalHuman = ref<TouristDigitalHuman | null>(null);
const onlineCount = ref(0);
const welcomeGreeting = ref(DEFAULT_WELCOME_GREETING);
const bootstrapError = ref("");
const isBootstrapLoading = ref(true);
const serverUnavailableDialogOpen = ref(false);
const pendingAssistantMessageId = ref<string | null>(null);
const isPreparingFirstMessage = ref(false);
const isComposerDocked = ref(false);
const historyPanelOpen = ref(false);
const conversationHistories = ref<TouristConversationSummary[]>([]);
const historyPage = ref(1);
const historySize = 10;
const historyTotal = ref(0);
const isHistoryLoading = ref(false);
const isHistorySwitching = ref(false);
const historyError = ref("");
const activeHistorySessionId = ref("");
const speechRecognition = ref<SpeechRecognitionLike | null>(null);
const recognizedTranscript = ref("");
const interimTranscript = ref("");
const voiceErrorMessage = ref("");
const voiceToastMessage = ref("");
let speechRecognitionStopPromise: Promise<string> | null = null;
let resolveSpeechRecognitionStopPromise: ((transcript: string) => void) | null = null;
let pendingSpeechTranscriptPromise: Promise<string> | null = null;
let voiceToastTimer: number | null = null;
let activeStreamSubscription: { close: () => void } | null = null;
let activeStreamConversationId: string | null = null;
let activeStreamStopResolver: (() => void) | null = null;
let streamAudioPlaybackQueue: Promise<void> = Promise.resolve();
let streamAudioPlaybackToken = 0;
let activeAssistantAudioMessageId: string | null = null;
let activeSpeechUtterance: SpeechSynthesisUtterance | null = null;
let activeSpeechResolve: (() => void) | null = null;
const activeAudioObjectUrls = new Set<string>();
const assistantTypingTargets = new Map<string, string>();
const assistantTypingTimers = new Map<string, number>();
const assistantTypingResolvers = new Map<string, () => void>();
const ASSISTANT_TYPEWRITER_INTERVAL_MS = 24;
const SPEECH_SYNTHESIS_STARTUP_DELAY_MS = 120;
const SPEECH_SYNTHESIS_RATE = 1.45;

const hasDraftMessage = computed(() => draftMessage.value.trim().length > 0);
const shouldHighlightPrimaryButton = computed(() => hasDraftMessage.value || isSending.value || isPreparingFirstMessage.value);
const composerView = computed<VoiceComposerMode>(() => (hasDraftMessage.value ? "text" : voiceMode.value));
const quickPrompts = getMockQuickPrompts();
const pageTitle = computed(() => digitalHuman.value?.humanName ?? "景区导览 AI 数字人");
const hasUserMessages = computed(() => conversation.value.some((message) => message.role === "user"));
const hasConversationStarted = computed(() => hasUserMessages.value || isSending.value);
const showEmptyIntro = computed(() => !isComposerDocked.value && !isPreparingFirstMessage.value);
const visibleQuickPrompts = computed(() => [] as string[]);
const hasHistoryNextPage = computed(() => historyPage.value * historySize < historyTotal.value);
const isAtBottom = ref(true);
const showScrollToBottom = computed(() => !isAtBottom.value);
const isSubmitBlocked = computed(() => isBootstrapLoading.value || Boolean(bootstrapError.value));

function resolveWelcomeGreeting(greeting?: string | null) {
  const nextGreeting = greeting?.trim();
  return nextGreeting && nextGreeting.length > 0 ? nextGreeting : DEFAULT_WELCOME_GREETING;
}

function showServerUnavailableDialog() {
  serverUnavailableDialogOpen.value = true;
}

function closeServerUnavailableDialog() {
  serverUnavailableDialogOpen.value = false;
}

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

function showVoiceToast(message: string) {
  voiceToastMessage.value = message;

  if (voiceToastTimer !== null) {
    window.clearTimeout(voiceToastTimer);
  }

  voiceToastTimer = window.setTimeout(() => {
    voiceToastMessage.value = "";
    voiceToastTimer = null;
  }, 2200);
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

      if (recordingDisposition.value === "send") {
        console.log("[voice] 录音结束");

        if (blob.size > 0) {
          if (recordedUrl.value) {
            URL.revokeObjectURL(recordedUrl.value);
          }

          recordedUrl.value = URL.createObjectURL(blob);
          console.log("[voice] 文件地址:", recordedUrl.value);
        }

        if (transcript) {
          void sendMessage(transcript);
        } else {
          voiceErrorMessage.value = "未识别到语音内容，请重试";
          showVoiceToast("没有识别到语音内容");
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

async function copyAssistantMessage(content: string) {
  const text = content.trim();
  if (!text) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    showVoiceToast("已复制回复");
  } catch (error) {
    console.warn("[tourist] 复制回复失败", error);
    showVoiceToast("复制失败，请手动选择文本");
  }
}

async function replayAssistantMessageSpeech(message: ConversationMessage) {
  const text = message.content.trim();
  if (!text || message.role !== "assistant") return;

  if (message.audioPlaying && activeAssistantAudioMessageId === message.id) {
    cancelStreamAudioPlayback();
    return;
  }

  cancelStreamAudioPlayback();

  const token = streamAudioPlaybackToken;
  setAssistantAudioPlaying(message.id, true);
  try {
    await speakTextWithBrowserSpeech(text, token);
  } catch (error) {
    console.warn("[tourist] 语音复播失败", error);
    showVoiceToast("当前无法播放语音");
  } finally {
    if (token === streamAudioPlaybackToken) {
      setAssistantAudioPlaying(message.id, false);
    }
  }
}

const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

function clearAssistantTyping(id: string) {
  const timer = assistantTypingTimers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    assistantTypingTimers.delete(id);
  }
  assistantTypingTargets.delete(id);
  const resolve = assistantTypingResolvers.get(id);
  if (resolve) {
    resolve();
    assistantTypingResolvers.delete(id);
  }
}

function clearAllAssistantTyping() {
  Array.from(assistantTypingTimers.keys()).forEach(clearAssistantTyping);
}

function playAvatarMotion(name: string) {
  void avatarStageRef.value?.playMotion(name);
}

function revokeStreamAudioUrls() {
  activeAudioObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  activeAudioObjectUrls.clear();
}

function cancelStreamAudioPlayback() {
  streamAudioPlaybackToken += 1;
  activeSpeechResolve?.();
  activeSpeechResolve = null;
  activeSpeechUtterance = null;
  if (activeAssistantAudioMessageId) {
    setAssistantAudioPlaying(activeAssistantAudioMessageId, false);
  }
  avatarStageRef.value?.setSpeaking(false);
  window.speechSynthesis?.cancel();
  revokeStreamAudioUrls();
  streamAudioPlaybackQueue = Promise.resolve();
}

function setAssistantAudioPlaying(messageId: string, playing: boolean) {
  if (playing) {
    if (activeAssistantAudioMessageId && activeAssistantAudioMessageId !== messageId) {
      updateAssistantMessage(activeAssistantAudioMessageId, {
        audioPlaying: false
      });
    }
    activeAssistantAudioMessageId = messageId;
  } else if (activeAssistantAudioMessageId === messageId) {
    activeAssistantAudioMessageId = null;
  }

  updateAssistantMessage(messageId, {
    audioPlaying: playing
  });
}

function decodeBase64AudioChunk(chunk: string, mimeType?: string) {
  const rawChunk = chunk.startsWith("data:")
    ? chunk.slice(chunk.indexOf(",") + 1)
    : chunk;
  const binary = window.atob(rawChunk);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], {
    type: mimeType || "audio/mpeg"
  });
  const url = URL.createObjectURL(blob);
  activeAudioObjectUrls.add(url);
  return url;
}

async function speakTextWithBrowserSpeech(text: string, token: number) {
  const speechSynthesis = window.speechSynthesis;
  const content = text.trim();
  if (!speechSynthesis || !content || token !== streamAudioPlaybackToken) {
    return;
  }

  speechSynthesis.cancel();
  avatarStageRef.value?.setSpeaking(true);
  await wait(SPEECH_SYNTHESIS_STARTUP_DELAY_MS);

  if (token !== streamAudioPlaybackToken) {
    return;
  }

  return new Promise<void>((resolve) => {
    const speechSynthesis = window.speechSynthesis;
    if (!speechSynthesis || token !== streamAudioPlaybackToken) {
      resolve();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(`，${content}`);
    utterance.lang = "zh-CN";
    utterance.rate = SPEECH_SYNTHESIS_RATE;
    utterance.pitch = 1;

    const finish = () => {
      const isCurrentUtterance = activeSpeechUtterance === utterance;
      const isCurrentPlayback = isCurrentUtterance && token === streamAudioPlaybackToken;

      if (activeSpeechUtterance === utterance) {
        activeSpeechUtterance = null;
        activeSpeechResolve = null;
      }
      if (isCurrentPlayback) {
        avatarStageRef.value?.setSpeaking(false);
      }
      resolve();
    };

    utterance.onend = finish;
    utterance.onerror = finish;
    activeSpeechUtterance = utterance;
    activeSpeechResolve = finish;
    speechSynthesis.speak(utterance);
  });
}

async function playStreamAudioEvent(event: Extract<TouristStreamEvent, { event: "audio" }>, token: number, messageId: string) {
  if (token !== streamAudioPlaybackToken) {
    return;
  }

  setAssistantAudioPlaying(messageId, true);
  try {
    if (event.filename) {
      await avatarStageRef.value?.speak(touristApi.getTtsUrl(event.filename));
      return;
    }

    if (event.chunk) {
      const audioUrl = event.chunk.startsWith("data:")
        ? event.chunk
        : decodeBase64AudioChunk(event.chunk, event.mimeType);
      await avatarStageRef.value?.speak(audioUrl);
      if (activeAudioObjectUrls.has(audioUrl)) {
        URL.revokeObjectURL(audioUrl);
        activeAudioObjectUrls.delete(audioUrl);
      }
      return;
    }

    if (event.text) {
      await speakTextWithBrowserSpeech(event.text, token);
    }
  } finally {
    setAssistantAudioPlaying(messageId, false);
  }
}

function enqueueStreamAudio(event: Extract<TouristStreamEvent, { event: "audio" }>, messageId: string) {
  const token = streamAudioPlaybackToken;
  streamAudioPlaybackQueue = streamAudioPlaybackQueue
    .then(() => playStreamAudioEvent(event, token, messageId))
    .catch((error) => {
      console.warn("[tourist] 音频播放失败", error);
      setAssistantAudioPlaying(messageId, false);
    });
}

async function stopActiveResponse() {
  if (!isSending.value && !isPreparingFirstMessage.value) {
    return;
  }

  const conversationId = activeStreamConversationId;
  activeStreamSubscription?.close();
  activeStreamSubscription = null;
  activeStreamStopResolver?.();

  if (conversationId) {
    try {
      await touristApi.stopChat({ conversationId });
    } catch (error) {
      console.warn("[tourist] 停止输出失败，已关闭本地流", error);
    }
  }
}

function resolveAssistantTyping(id: string) {
  const resolve = assistantTypingResolvers.get(id);
  if (!resolve) return;
  resolve();
  assistantTypingResolvers.delete(id);
}

function getMessageContent(id: string) {
  return conversation.value.find((message) => message.id === id)?.content ?? "";
}

function pumpAssistantTyping(id: string) {
  const targetContent = assistantTypingTargets.get(id) ?? "";
  const currentContent = getMessageContent(id);

  if (currentContent.length >= targetContent.length) {
    assistantTypingTimers.delete(id);
    if (currentContent === targetContent) {
      resolveAssistantTyping(id);
    }
    return;
  }

  const nextContent = targetContent.slice(0, currentContent.length + 1);
  updateAssistantMessage(id, {
    content: nextContent,
    isStreaming: true
  });

  const timer = window.setTimeout(() => {
    pumpAssistantTyping(id);
  }, ASSISTANT_TYPEWRITER_INTERVAL_MS);
  assistantTypingTimers.set(id, timer);
}

function queueAssistantTyping(id: string, targetContent: string) {
  assistantTypingTargets.set(id, targetContent);

  if (assistantTypingTimers.has(id)) {
    return;
  }

  pumpAssistantTyping(id);
}

function waitForAssistantTyping(id: string) {
  const targetContent = assistantTypingTargets.get(id) ?? "";
  if (getMessageContent(id) === targetContent) {
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    assistantTypingResolvers.set(id, resolve);
  });
}

async function loadConversationHistories(page = 1) {
  if (isHistoryLoading.value) return;

  isHistoryLoading.value = true;
  historyError.value = "";

  try {
    const response = await touristApi.getConversationList({
      visitorId: visitorId.value,
      scenicId: scenicId.value,
      page,
      size: historySize
    });

    conversationHistories.value = page === 1
      ? response.data.list
      : [...conversationHistories.value, ...response.data.list];
    historyPage.value = response.data.page;
    historyTotal.value = response.data.total;
  } catch (error) {
    console.error("[tourist] Failed to load conversation histories", error);
    historyError.value = error instanceof Error ? error.message : "会话历史加载失败";
  } finally {
    isHistoryLoading.value = false;
  }
}

async function toggleHistoryPanel() {
  historyPanelOpen.value = !historyPanelOpen.value;

  if (historyPanelOpen.value && conversationHistories.value.length === 0) {
    await loadConversationHistories(1);
  }
}

async function openConversationHistory(targetSessionId: string) {
  if (!targetSessionId || isSending.value || isPreparingFirstMessage.value || isHistorySwitching.value) return;

  activeHistorySessionId.value = targetSessionId;
  historyError.value = "";
  isHistorySwitching.value = true;
  const loadingStartedAt = performance.now();

  try {
    const response = await touristApi.getConversationDetail(targetSessionId, visitorId.value);
    const elapsed = performance.now() - loadingStartedAt;
    if (elapsed < 260) {
      await wait(260 - elapsed);
    }
    clearAllAssistantTyping();
    sessionId.value = response.data.sessionId;
    conversation.value = response.data.turns.map((turn, index) => ({
      id: `${response.data.sessionId}-${index}`,
      role: turn.role,
      content: turn.content
    }));
    isComposerDocked.value = conversation.value.length > 0;

    await nextTick();
    scrollMessagesToBottom();
    syncBottomState();
  } catch (error) {
    console.error("[tourist] Failed to load conversation detail", error);
    historyError.value = error instanceof Error ? error.message : "会话详情加载失败";
  } finally {
    isHistorySwitching.value = false;
  }
}

async function startNewConversation() {
  if (isSending.value || isPreparingFirstMessage.value) return;

  const endingSessionId = sessionId.value;
  const shouldEndSession = hasUserMessages.value && endingSessionId;

  sessionId.value = "";
  activeHistorySessionId.value = "";
  conversation.value = [];
  isComposerDocked.value = false;
  pendingAssistantMessageId.value = null;
  draftMessage.value = "";
  voiceMode.value = "text";

  activeStreamSubscription?.close();
  activeStreamSubscription = null;
  activeStreamConversationId = null;
  activeStreamStopResolver = null;
  cancelStreamAudioPlayback();
  clearAllAssistantTyping();

  if (shouldEndSession) {
    try {
      await touristApi.endChat({
        sessionId: endingSessionId,
        visitorId: visitorId.value,
        scenicId: scenicId.value
      });
      void loadConversationHistories(1);
    } catch (error) {
      console.error("[tourist] Failed to end current session", error);
    }
  }
}

async function sendMessage(rawMessage: string) {
  if (isSubmitBlocked.value) {
    showServerUnavailableDialog();
    return;
  }

  const content = rawMessage.trim();
  if (!content) return;
  if (isSending.value || isPreparingFirstMessage.value) return;

  const isFirstMessage = !isComposerDocked.value && !hasConversationStarted.value;
  if (isFirstMessage) {
    isPreparingFirstMessage.value = true;
    await new Promise((resolve) => window.setTimeout(resolve, 220));
    isComposerDocked.value = true;
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }

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
  isPreparingFirstMessage.value = false;
  cancelStreamAudioPlayback();

  let nextContent = "";
  let streamFailed = false;
  let streamStopped = false;

  try {
    const response = await touristApi.submitChat({
      message: content,
      visitorId: visitorId.value,
      ...(sessionId.value ? { sessionId: sessionId.value } : {}),
      scenicId: scenicId.value
    });

    sessionId.value = response.data.sessionId;
    activeHistorySessionId.value = response.data.sessionId;
    activeStreamConversationId = response.data.conversationId;

    await new Promise<void>((resolve, reject) => {
      let settled = false;

      const settle = () => {
        if (settled) {
          return;
        }

        settled = true;
        activeStreamSubscription?.close();
        activeStreamSubscription = null;
        if (activeStreamConversationId === response.data.conversationId) {
          activeStreamConversationId = null;
        }
        activeStreamStopResolver = null;
        resolve();
      };

      try {
        activeStreamStopResolver = () => {
          streamStopped = true;
          cancelStreamAudioPlayback();
          pendingAssistantMessageId.value = null;
          clearAssistantTyping(assistantMessageId);
          updateAssistantMessage(assistantMessageId, {
            content: nextContent || "已停止输出",
            isStreaming: false
          });
          settle();
        };

        activeStreamSubscription = touristApi.subscribeStream(response.data.conversationId, {
          onEvent(event) {
            if (event.event === "metadata") {
              if (event.sessionId) {
                sessionId.value = event.sessionId;
                activeHistorySessionId.value = event.sessionId;
              }
              updateAssistantMessage(assistantMessageId, {
                attachments: event.attachments
              });
              return;
            }

            if (event.event === "answer" || event.event === "answer_fragment") {
              nextContent += event.content;
              pendingAssistantMessageId.value = null;
              queueAssistantTyping(assistantMessageId, nextContent);
              return;
            }

            if (event.event === "audio") {
              enqueueStreamAudio(event, assistantMessageId);
              return;
            }

            if (event.event === "done") {
              settle();
              return;
            }

            if (event.event === "error") {
              streamFailed = true;
              pendingAssistantMessageId.value = null;
              clearAssistantTyping(assistantMessageId);
              updateAssistantMessage(assistantMessageId, {
                content: event.message || "当前暂时无法完成回答，请稍后重试。",
                isStreaming: false
              });
              settle();
            }
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  } catch (error) {
    streamFailed = true;
    console.error("[tourist] 发送消息失败", error);
    pendingAssistantMessageId.value = null;
    clearAssistantTyping(assistantMessageId);
    updateAssistantMessage(assistantMessageId, {
      content: error instanceof Error ? error.message : "当前暂时无法完成回答，请稍后重试。",
      isStreaming: false
    });
  } finally {
    if (nextContent && !streamFailed && !streamStopped) {
      await waitForAssistantTyping(assistantMessageId);
    }
    if (pendingAssistantMessageId.value === assistantMessageId) {
      pendingAssistantMessageId.value = null;
    }
    updateAssistantMessage(assistantMessageId, {
      isStreaming: false
    });
    clearAssistantTyping(assistantMessageId);
    if (!streamFailed && !streamStopped) {
      await streamAudioPlaybackQueue;
    }
    if (!nextContent && !streamFailed && !streamStopped) {
      updateAssistantMessage(assistantMessageId, {
        content: "当前没有收到有效回复，请稍后再试。",
        isStreaming: false
      });
    }
    isSending.value = false;
    if (activeStreamConversationId) {
      activeStreamConversationId = null;
    }
    activeStreamStopResolver = null;
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
  if (isSubmitBlocked.value) {
    showServerUnavailableDialog();
    return;
  }

  if (isSending.value) {
    event.preventDefault();
    void stopActiveResponse();
    return;
  }

  if (isPreparingFirstMessage.value) {
    return;
  }

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
  if (isSubmitBlocked.value) {
    return;
  }

  if (isSending.value || isPreparingFirstMessage.value) {
    return;
  }

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
  if (!isSending.value && voiceMode.value !== "recording") {
    clearLongPressTimer();
  }
}

function handleHoldToTalkPointerDown(event: PointerEvent) {
  if (isSubmitBlocked.value) {
    showServerUnavailableDialog();
    return;
  }

  clearLongPressTimer();

  const pointerId = event.pointerId;
  const clientY = event.clientY;

  longPressTimer.value = setTimeout(() => {
    void startRecording(pointerId, clientY);
  }, 240);
}

function handleHoldToTalkPointerUp() {
  if (voiceMode.value === "recording") {
    return;
  }

  if (longPressTimer.value) {
    clearLongPressTimer();
    restoreTextComposer();
  }
}

function handleHoldToTalkPointerCancel() {
  if (voiceMode.value !== "recording") {
    clearLongPressTimer();
  }
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
    onlineCount.value = bootstrap.data.onlineCount;
    welcomeGreeting.value = resolveWelcomeGreeting(bootstrap.data.digitalHuman?.defaultGreeting);
    conversation.value = [];
    bootstrapError.value = "";
    void loadConversationHistories(1);
  } catch (error) {
    console.error("[tourist] Bootstrap failed", error);
    bootstrapError.value = error instanceof Error ? error.message : "初始化失败";
    welcomeGreeting.value = DEFAULT_WELCOME_GREETING;
    conversation.value = [];
  } finally {
    isBootstrapLoading.value = false;
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
  if (voiceToastTimer !== null) {
    window.clearTimeout(voiceToastTimer);
    voiceToastTimer = null;
  }
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

  activeStreamSubscription?.close();
  activeStreamSubscription = null;
  activeStreamConversationId = null;
  activeStreamStopResolver = null;
  cancelStreamAudioPlayback();
  clearAllAssistantTyping();
  void cleanupAudioStream();
});
</script>

<template>
  <div class="h-screen overflow-hidden bg-[#f7f7f8] text-slate-900">
    <div class="flex h-screen p-[6px] md:p-[10px] xl:p-[14px]">
      <aside class="mr-0 hidden h-full w-[500px] shrink-0 rounded-[20px] bg-[#f3f4f6] xl:mr-4 xl:flex xl:flex-col 2xl:w-[580px] 2xl:rounded-[24px]">
        <div class="soft-float relative h-full overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_50%_8%,rgba(125,211,252,0.24),transparent_22%),radial-gradient(circle_at_50%_78%,rgba(186,230,253,0.22),transparent_28%),linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)]">
          <div class="absolute inset-x-8 top-8 bottom-8 rounded-[34px] border border-sky-100/80"></div>
          <div class="absolute inset-x-[14%] top-[5%] bottom-[5%] rounded-[40px] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(239,246,255,0.48))] shadow-[inset_0_0_0_1px_rgba(186,230,253,0.35)]"></div>
          <div class="absolute inset-0 z-10">
            <AvatarStage ref="avatarStageRef" />
          </div>
        </div>
      </aside>

      <section class="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[20px] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] md:rounded-[24px]">
        <Transition
          mode="out-in"
          enter-active-class="transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
          enter-from-class="translate-y-3 opacity-0"
          enter-to-class="translate-y-0 opacity-100"
          leave-active-class="transition duration-300 ease-in-out"
          leave-from-class="translate-y-0 opacity-100"
          leave-to-class="-translate-y-2 opacity-0"
        >
          <div
            v-if="isBootstrapLoading"
            key="bootstrap-loading"
            class="flex h-full min-h-0 items-center justify-center"
          >
            <p class="text-base font-medium text-slate-400">加载中...</p>
          </div>

          <div v-else key="bootstrap-ready" class="flex h-full min-h-0 flex-col">
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
                <div class="mt-1 flex flex-wrap items-center gap-2">
                  <h2 class="text-sm font-semibold text-slate-900 sm:text-base">{{ pageTitle }}</h2>
                  <UiBadge v-if="onlineCount > 0" variant="secondary">在线 {{ onlineCount }}</UiBadge>
                </div>
              </div>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                class="group inline-flex h-9 w-9 cursor-pointer items-center overflow-hidden rounded-full bg-white pl-2.5 pr-2 text-slate-600 transition-[width,background-color,color] duration-220 hover:w-[108px] hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="isSending || isPreparingFirstMessage"
                aria-label="开启新对话"
                @click="startNewConversation"
              >
                <svg viewBox="0 0 24 24" class="h-4.5 w-4.5 shrink-0" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                <span class="ml-2 whitespace-nowrap text-xs font-medium opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  开启新对话
                </span>
              </button>
              <button
                type="button"
                class="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                :class="historyPanelOpen ? 'bg-slate-100 text-slate-900' : 'bg-white'"
                aria-label="会话历史"
                @click="toggleHistoryPanel"
              >
                <svg viewBox="0 0 24 24" class="h-4.5 w-4.5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                  <path d="M8 6h12" />
                  <path d="M8 12h12" />
                  <path d="M8 18h12" />
                  <path d="M4 6h.01" />
                  <path d="M4 12h.01" />
                  <path d="M4 18h.01" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <div class="relative min-h-0 flex-1">
          <div
            ref="messageScrollRef"
            class="min-h-0 h-full overflow-y-auto bg-[linear-gradient(180deg,#ffffff_0px,rgba(255,255,255,0)_120px),linear-gradient(180deg,#ffffff_0%,#ffffff_100%)]"
            @pointerdown="restoreTextComposer"
            @scroll="handleMessageScroll"
          >
            <div
              class="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pt-3 transition-opacity duration-300 sm:px-5 lg:max-w-[56rem] xl:max-w-[60rem] xl:gap-6 xl:pt-4 2xl:max-w-6xl 2xl:px-6"
              :class="hasConversationStarted || bootstrapError ? 'pb-56 xl:pb-60' : 'pb-8 opacity-0'"
            >
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
                v-if="message.role === 'assistant' && message.content && !message.isStreaming"
                class="mt-2 flex items-center gap-1.5 pl-5"
              >
                <button
                  type="button"
                  class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10"
                  aria-label="复制回复"
                  title="复制"
                  @click="copyAssistantMessage(message.content)"
                >
                  <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <rect x="8" y="8" width="10" height="10" rx="2" />
                    <path d="M6 14H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>

                <button
                  type="button"
                  class="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full transition-[background-color,color,box-shadow] duration-300 ease-out hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/20"
                  :class="message.audioPlaying ? 'audio-action-playing bg-sky-50 text-sky-500' : 'text-slate-400 hover:text-sky-500'"
                  aria-label="重新播放语音"
                  title="语音"
                  @click="replayAssistantMessageSpeech(message)"
                >
                  <svg viewBox="0 0 24 24" class="h-[18px] w-[18px]" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                    <path d="M4 9.5v5h3.5L12 18V6L7.5 9.5H4Z" />
                    <path d="M16 9a4 4 0 0 1 0 6" />
                    <path d="M18.5 6.5a7.5 7.5 0 0 1 0 11" />
                  </svg>
                </button>
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
                  :disabled="isSending || isSubmitBlocked"
                  @click="sendMessage(prompt)"
                >
                  {{ prompt }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Transition
            enter-active-class="transition duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            enter-from-class="opacity-0"
            enter-to-class="opacity-100"
            leave-active-class="transition duration-240 ease-[cubic-bezier(0.22,1,0.36,1)]"
            leave-from-class="opacity-100"
            leave-to-class="opacity-0"
          >
            <div
              v-if="isHistorySwitching"
              class="pointer-events-auto absolute inset-0 z-20 flex items-center justify-center bg-white/84 backdrop-blur-[3px]"
            >
              <div class="flex flex-col items-center gap-3 rounded-[24px] border border-[#0000000d] bg-white/92 px-6 py-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <div class="flex items-center gap-2">
                  <span class="history-loading-dot h-2.5 w-2.5 rounded-full bg-sky-400"></span>
                  <span class="history-loading-dot h-2.5 w-2.5 rounded-full bg-cyan-400 [animation-delay:120ms]"></span>
                  <span class="history-loading-dot h-2.5 w-2.5 rounded-full bg-emerald-400 [animation-delay:240ms]"></span>
                </div>
                <p class="text-sm font-medium tracking-[0.08em] text-slate-500">加载中...</p>
              </div>
            </div>
          </Transition>
        </div>

        <div
          class="pointer-events-none absolute inset-x-0 px-4 transition-[bottom,transform,padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-5"
          :class="isComposerDocked
            ? 'bottom-0 translate-y-0 pb-4 pt-8'
            : 'bottom-1/2 translate-y-1/2 pb-0 pt-0'"
        >
          <div
            class="relative mx-auto w-full transition-[max-width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            :class="isComposerDocked
              ? 'max-w-4xl lg:max-w-[56rem] xl:max-w-[60rem] 2xl:max-w-6xl'
              : 'max-w-[760px]'"
          >
            <Transition
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="translate-y-2 opacity-0"
              enter-to-class="translate-y-0 opacity-100"
              leave-active-class="transition duration-180 ease-in"
              leave-from-class="translate-y-0 opacity-100"
              leave-to-class="-translate-y-2 opacity-0"
            >
              <div
                v-if="showEmptyIntro"
                class="pointer-events-auto absolute inset-x-0 bottom-full mb-5 text-center"
              >
                <h1 class="text-[22px] font-semibold leading-8 text-slate-950 sm:text-[26px]">
                  {{ welcomeGreeting }}
                </h1>
              </div>
            </Transition>

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

            <Transition
              mode="out-in"
              enter-active-class="transition duration-220 ease-out"
              enter-from-class="translate-y-2 opacity-0"
              enter-to-class="translate-y-0 opacity-100"
              leave-active-class="transition duration-160 ease-in"
              leave-from-class="translate-y-0 opacity-100"
              leave-to-class="translate-y-1 opacity-0"
            >
            <div
              v-if="composerView !== 'recording'"
              key="composer-card"
              class="pointer-events-auto soft-float overflow-hidden rounded-[28px] bg-white transition-[border-color,box-shadow] duration-200 ease-out"
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
                    :disabled="isSubmitBlocked"
                    @keydown.ctrl.enter.prevent="insertComposerNewline"
                    @keydown.enter.exact.prevent="sendDraftMessage"
                  ></textarea>

                  <button
                    type="button"
                    class="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-200 ease-out disabled:cursor-not-allowed disabled:opacity-60"
                    :class="shouldHighlightPrimaryButton
                      ? 'bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:bg-slate-800'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'"
                    :disabled="isPreparingFirstMessage || isSubmitBlocked"
                    :aria-label="isSending || isPreparingFirstMessage ? '停止输出' : hasDraftMessage ? '发送消息' : '语音输入'"
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
                    class="group flex h-[58px] w-full cursor-pointer items-center justify-between rounded-[22px] border border-slate-200 bg-[#f8fafc] px-3 text-[15px] font-medium text-slate-800 shadow-[0_16px_38px_rgba(148,163,184,0.10)] transition duration-200 hover:border-slate-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10"
                    @pointerdown.prevent="handleHoldToTalkPointerDown"
                    @pointerup.prevent="handleHoldToTalkPointerUp"
                    @pointercancel.prevent="handleHoldToTalkPointerCancel"
                    @click.prevent
                  >
                    <span class="inline-flex min-w-0 items-center gap-2.5">
                      <span class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)] transition duration-200 group-hover:text-slate-950">
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="1.8"
                          aria-hidden="true"
                          class="h-5 w-5"
                        >
                          <path d="M12 4a3 3 0 0 1 3 3v5a3 3 0 1 1-6 0V7a3 3 0 0 1 3-3Z" />
                          <path d="M19 11a7 7 0 0 1-14 0" />
                          <path d="M12 18v3" />
                        </svg>
                      </span>
                      <span class="truncate">长按说话</span>
                    </span>
                    <span class="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] text-slate-500 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.06)] transition duration-200 group-hover:text-slate-700">
                      短按返回
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.8"
                        aria-hidden="true"
                        class="h-4 w-4"
                      >
                        <path d="m15 18-6-6 6-6" />
                      </svg>
                    </span>
                  </button>
                </div>

              </Transition>
            </div>

            <div
              v-else
              key="recording-surface"
              class="pointer-events-auto relative flex min-h-[118px] flex-col items-center justify-center gap-4 overflow-hidden px-4 py-4 text-center"
              :style="{ transform: `translateY(${Math.max(recordingDragOffset / 6, -18)}px)` }"
            >
              <p
                class="inline-flex min-h-6 items-center gap-2 text-[15px] font-medium leading-6 transition-colors duration-200"
                :class="recordingWillCancel ? 'text-rose-500' : 'text-slate-600'"
              >
                <span
                  class="h-1.5 w-1.5 rounded-full transition-colors duration-200"
                  :class="recordingWillCancel ? 'bg-rose-400' : 'bg-blue-500'"
                ></span>
                <span>{{ recordingWillCancel ? "松手取消" : "松手发送，上滑取消" }}</span>
              </p>

              <div
                class="relative flex h-12 w-full max-w-[480px] items-center justify-center gap-[5px] overflow-hidden px-6 [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
              >
                <span
                  class="pointer-events-none absolute inset-x-10 top-1/2 h-px -translate-y-1/2 opacity-70 transition duration-200"
                  :class="recordingWillCancel ? 'bg-rose-100' : 'bg-blue-100/90'"
                ></span>
                <span
                  v-for="(height, index) in waveformBars"
                  :key="index"
                  class="relative z-10 block w-[4px] rounded-full transition-[height,background-color,transform,opacity] duration-150 ease-out will-change-transform"
                  :class="waveColorClass"
                  :style="{
                    height: `${height}px`,
                    opacity: `${0.5 + Math.min(height / 44, 1) * 0.5}`,
                    transform: `scaleY(${recordingWillCancel ? 0.88 : 1})`
                  }"
                ></span>
              </div>

              <p
                class="min-h-4 text-xs font-medium transition-colors duration-200"
                :class="recordingWillCancel ? 'text-rose-400' : voiceErrorMessage ? 'text-amber-500' : 'text-transparent'"
              >
                {{ recordingWillCancel ? "继续上滑可取消本次录音" : voiceErrorMessage || "录音中" }}
              </p>
            </div>
            </Transition>

            <Transition
              enter-active-class="transition duration-300 ease-out"
              enter-from-class="translate-y-2 opacity-0"
              enter-to-class="translate-y-0 opacity-100"
              leave-active-class="transition duration-160 ease-in"
              leave-from-class="translate-y-0 opacity-100"
              leave-to-class="translate-y-1 opacity-0"
            >
              <div
                v-if="showEmptyIntro"
                class="pointer-events-auto absolute inset-x-0 top-full mt-4 flex flex-wrap justify-center gap-2.5"
              >
                <button
                  v-for="prompt in quickPrompts"
                  :key="prompt"
                  type="button"
                  class="max-w-full cursor-pointer rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium leading-5 text-slate-600 shadow-[0_10px_28px_rgba(15,23,42,0.05)] transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 hover:shadow-[0_16px_34px_rgba(15,23,42,0.08)] disabled:cursor-not-allowed disabled:opacity-60"
                  :disabled="isSending || isPreparingFirstMessage || isSubmitBlocked"
                  @click="sendMessage(prompt)"
                >
                  {{ prompt }}
                </button>
              </div>
            </Transition>
          </div>
        </div>
          </div>
        </Transition>
      </section>

      <aside
        class="hidden h-full shrink-0 overflow-hidden rounded-[20px] bg-white shadow-[0_12px_36px_rgba(15,23,42,0.05)] transition-[width,opacity,margin] duration-260 ease-[cubic-bezier(0.22,1,0.36,1)] md:rounded-[24px] lg:block"
        :class="historyPanelOpen ? 'ml-3 w-[312px] opacity-100 xl:ml-4 2xl:w-[336px]' : 'ml-0 w-0 opacity-0'"
      >
        <div class="flex h-full w-[312px] flex-col 2xl:w-[336px]">
          <div class="shrink-0 border-b border-slate-100 px-4 py-4">
            <h3 class="text-sm font-semibold text-slate-900">会话历史</h3>
            <p class="mt-1 text-xs leading-5 text-slate-500">选择一条记录查看完整对话，并继续追问。</p>
          </div>

          <div class="min-h-0 flex-1 overflow-y-auto p-2">
            <div
              v-if="historyError"
              class="rounded-2xl bg-rose-50 px-3 py-2 text-sm leading-6 text-rose-600"
            >
              {{ historyError }}
            </div>

            <div
              v-else-if="isHistoryLoading && conversationHistories.length === 0"
              class="px-3 py-8 text-center text-sm text-slate-500"
            >
              正在加载历史会话
            </div>

            <div
              v-else-if="conversationHistories.length === 0"
              class="px-3 py-8 text-center text-sm text-slate-500"
            >
              暂无历史会话
            </div>

            <div v-else class="space-y-2">
              <button
                v-for="history in conversationHistories"
                :key="history.sessionId"
                type="button"
                class="block w-full cursor-pointer rounded-2xl px-3 py-3 text-left transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                :class="activeHistorySessionId === history.sessionId || sessionId === history.sessionId ? 'bg-slate-50' : ''"
                :disabled="isSending || isPreparingFirstMessage"
                @click="openConversationHistory(history.sessionId)"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="line-clamp-1 text-sm font-semibold text-slate-900">{{ history.title }}</p>
                  <span v-if="history.updatedAt" class="shrink-0 text-[11px] text-slate-400">{{ history.updatedAt }}</span>
                </div>
                <p v-if="history.preview" class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {{ history.preview }}
                </p>
              </button>
            </div>
          </div>

          <div v-if="hasHistoryNextPage" class="shrink-0 border-t border-slate-100 p-2">
            <button
              type="button"
              class="h-10 w-full cursor-pointer rounded-xl text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              :disabled="isHistoryLoading"
              @click="loadConversationHistories(historyPage + 1)"
            >
              {{ isHistoryLoading ? "加载中" : "加载更多" }}
            </button>
          </div>
        </div>
      </aside>
    </div>

    <Transition
      enter-active-class="transition duration-220 ease-out"
      enter-from-class="-translate-y-2 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-180 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="-translate-y-1 opacity-0"
    >
      <div
        v-if="voiceToastMessage"
        class="pointer-events-none absolute inset-x-0 top-6 z-50 flex justify-center px-4 md:top-8"
        role="status"
        aria-live="polite"
      >
        <div class="rounded-full bg-slate-900/92 px-4 py-2 text-sm font-medium text-white shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
          {{ voiceToastMessage }}
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition duration-220 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-180 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="serverUnavailableDialogOpen"
        class="absolute inset-0 z-50 flex items-center justify-center bg-slate-950/18 px-4 backdrop-blur-[2px]"
        @click.self="closeServerUnavailableDialog"
      >
        <div class="w-full max-w-sm rounded-[24px] border border-[#0000000d] bg-white px-6 py-5 shadow-[0_28px_70px_rgba(15,23,42,0.16)]">
          <p class="text-base font-semibold text-slate-900">无法连接到服务器，请检查网络连接</p>
          <div class="mt-5 flex justify-end">
            <button
              type="button"
              class="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-medium text-white transition hover:bg-slate-800"
              @click="closeServerUnavailableDialog"
            >
              知道了
            </button>
          </div>
        </div>
      </div>
    </Transition>
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

@keyframes audio-action-pulse {
  0%, 100% {
    background-color: rgb(240 249 255);
    box-shadow: 0 0 0 0 rgb(56 189 248 / 0.12);
  }

  50% {
    background-color: rgb(224 242 254);
    box-shadow: 0 0 0 5px rgb(56 189 248 / 0.08);
  }
}

.audio-action-playing {
  animation: audio-action-pulse 1.45s ease-in-out infinite;
}

@media (prefers-reduced-motion: reduce) {
  .audio-action-playing {
    animation: none;
    box-shadow: 0 0 0 3px rgb(56 189 248 / 0.08);
  }
}

@keyframes history-loading-bounce {
  0%, 80%, 100% {
    transform: translateY(0) scale(0.92);
    opacity: 0.45;
  }

  40% {
    transform: translateY(-4px) scale(1);
    opacity: 1;
  }
}

.history-loading-dot {
  animation: history-loading-bounce 1s ease-in-out infinite;
}
</style>
