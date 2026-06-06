<script setup lang="ts">
import { computed } from "vue";
import { renderMarkdownToHtml } from "../../lib/markdown";

const props = defineProps<{
  content: string;
  streaming?: boolean;
}>();

const renderedHtml = computed(() => renderMarkdownToHtml(props.content));
</script>

<template>
  <div class="markdown-body break-words [overflow-wrap:anywhere] text-[15px] leading-8 text-slate-700" v-html="renderedHtml"></div>
</template>

<style scoped>
.markdown-body :deep(p),
.markdown-body :deep(ul),
.markdown-body :deep(ol),
.markdown-body :deep(blockquote),
.markdown-body :deep(pre) {
  margin: 0 0 0.9rem;
}

.markdown-body :deep(p:last-child),
.markdown-body :deep(ul:last-child),
.markdown-body :deep(ol:last-child),
.markdown-body :deep(blockquote:last-child),
.markdown-body :deep(pre:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 0 0 0.75rem;
  color: rgb(15 23 42);
  font-weight: 600;
  line-height: 1.5;
}

.markdown-body :deep(h1) {
  font-size: 1.15rem;
}

.markdown-body :deep(h2) {
  font-size: 1.05rem;
}

.markdown-body :deep(h3) {
  font-size: 1rem;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 1.25rem;
}

.markdown-body :deep(li + li) {
  margin-top: 0.35rem;
}

.markdown-body :deep(strong) {
  color: rgb(15 23 42);
  font-weight: 600;
}

.markdown-body :deep(code) {
  border-radius: 0.4rem;
  background: rgb(241 245 249);
  padding: 0.1rem 0.35rem;
  font-size: 0.92em;
}

.markdown-body :deep(pre) {
  overflow-x: auto;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 1rem;
  background: rgb(248 250 252);
  padding: 0.9rem 1rem;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
}

.markdown-body :deep(blockquote) {
  border-left: 3px solid rgb(191 219 254);
  padding-left: 0.85rem;
  color: rgb(71 85 105);
}

.markdown-body :deep(a) {
  color: rgb(37 99 235);
  text-decoration: underline;
  text-underline-offset: 0.18em;
}
</style>
