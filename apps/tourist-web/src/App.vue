<template>
  <div class="h-screen overflow-hidden bg-[#f7f7f8] text-slate-900">
    <div class="flex h-screen gap-2 p-2 md:gap-3 md:p-3 xl:gap-4">
      <aside class="hidden h-[calc(100vh-16px)] w-[400px] shrink-0 rounded-[20px] bg-[#f3f4f6] p-2.5 xl:flex xl:flex-col 2xl:h-[calc(100vh-24px)] 2xl:w-[480px] 2xl:rounded-[24px] 2xl:p-3">
        <div class="soft-float relative h-full overflow-hidden rounded-[26px] bg-[radial-gradient(circle_at_50%_8%,rgba(125,211,252,0.24),transparent_22%),radial-gradient(circle_at_50%_78%,rgba(186,230,253,0.22),transparent_28%),linear-gradient(180deg,#ffffff_0%,#eef6ff_100%)]">
          <div class="absolute inset-x-8 top-8 bottom-8 rounded-[34px] border border-sky-100/80"></div>
          <div class="absolute inset-x-[14%] top-[5%] bottom-[5%] rounded-[40px] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(239,246,255,0.48))] shadow-[inset_0_0_0_1px_rgba(186,230,253,0.35)]"></div>
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
        >
          <div class="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 pb-40 pt-3 sm:px-5 lg:max-w-[56rem] xl:max-w-[60rem] xl:gap-6 xl:pb-44 xl:pt-4 2xl:max-w-6xl 2xl:px-6">
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
                <div class="text-[15px] leading-8 text-slate-700">
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
          <div class="mx-auto w-full max-w-4xl lg:max-w-[56rem] xl:max-w-[60rem] 2xl:max-w-6xl">
            <div class="pointer-events-auto soft-float rounded-[26px] bg-white p-2 transition-[border-color,box-shadow,transform] duration-200 ease-out focus-within:border-[#0000001a] focus-within:[--tw-shadow:0_28px_72px_rgb(120_120_120_/_10%)] focus-within:shadow-[var(--tw-inset-shadow),var(--tw-inset-ring-shadow),var(--tw-ring-offset-shadow),0_0_0_2px_rgba(15,23,42,0.025),var(--tw-shadow)]">
              <div class="flex items-end gap-3">
                <textarea
                  ref="composerTextareaRef"
                  v-model="draftMessage"
                  rows="1"
                  class="min-h-[48px] max-h-56 flex-1 resize-none overflow-y-auto border-0 bg-transparent px-4 py-2 text-[16px] leading-7 text-slate-800 placeholder:text-slate-400 focus:outline-none"
                  placeholder="有问题，尽管问"
                ></textarea>

                <button
                  type="button"
                  class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-all duration-200 ease-out"
                  :class="hasDraftMessage
                    ? 'bg-black text-white shadow-[0_10px_24px_rgba(15,23,42,0.18)] hover:bg-slate-800'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'"
                  :aria-label="hasDraftMessage ? '发送消息' : '开始语音输入'"
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
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import UiBadge from "./components/ui/UiBadge.vue";
import UiCard from "./components/ui/UiCard.vue";
import { conversationMock, quickPromptsMock, topFeaturesMock } from "./mocks/guide";

const messageScrollRef = ref<HTMLElement | null>(null);
const composerTextareaRef = ref<HTMLTextAreaElement | null>(null);
const draftMessage = ref("");
const hasDraftMessage = computed(() => draftMessage.value.trim().length > 0);

const topFeatures = topFeaturesMock;
const quickPrompts = quickPromptsMock;
const conversation = conversationMock;

function syncComposerHeight() {
  if (!composerTextareaRef.value) {
    return;
  }

  const textarea = composerTextareaRef.value;
  textarea.style.height = "0px";
  const nextHeight = Math.min(textarea.scrollHeight, 224);
  textarea.style.height = `${Math.max(nextHeight, 48)}px`;
}

onMounted(async () => {
  await nextTick();

  if (messageScrollRef.value) {
    messageScrollRef.value.scrollTop = messageScrollRef.value.scrollHeight;
  }

  syncComposerHeight();
});

watch(draftMessage, async () => {
  await nextTick();
  syncComposerHeight();
});
</script>
