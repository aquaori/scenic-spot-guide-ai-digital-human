<script setup lang="ts">
import UiButton from "@/components/ui/UiButton.vue";
import UiCard from "@/components/ui/UiCard.vue";
import { knowledgeStats } from "@/mocks/dashboard";
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-4 md:grid-cols-3">
      <UiCard
        v-for="item in knowledgeStats"
        :key="item.label"
        class="rounded-[28px] px-5 py-5"
      >
        <p class="text-sm text-slate-500">{{ item.label }}</p>
        <strong class="mt-4 block text-3xl font-semibold text-slate-900">{{ item.value }}</strong>
      </UiCard>
    </div>

    <UiCard class="rounded-[28px] px-5 py-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Documents</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">知识库文档管理</h2>
        </div>
        <UiButton>上传文档</UiButton>
      </div>

      <div class="mt-6 rounded-[28px] border border-[color:var(--color-border)]">
        <div class="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr] px-4 py-3 text-sm font-medium text-slate-500">
          <span>文档名称</span>
          <span>来源</span>
          <span>更新时间</span>
          <span>状态</span>
        </div>
        <div class="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr] items-center border-t border-[color:var(--color-border)] px-4 py-4 text-sm">
          <span class="font-medium text-slate-900">景区讲解词总表.xlsx</span>
          <span class="text-slate-500">人工上传</span>
          <span class="text-slate-500">今天 09:32</span>
          <span class="text-emerald-600">已生效</span>
        </div>
        <div class="grid grid-cols-[1.6fr_0.8fr_0.8fr_0.8fr] items-center border-t border-[color:var(--color-border)] px-4 py-4 text-sm">
          <span class="font-medium text-slate-900">热门问题 FAQ.md</span>
          <span class="text-slate-500">同步导入</span>
          <span class="text-slate-500">昨天 18:10</span>
          <span class="text-amber-600">待复核</span>
        </div>
      </div>
    </UiCard>
  </div>
</template>
