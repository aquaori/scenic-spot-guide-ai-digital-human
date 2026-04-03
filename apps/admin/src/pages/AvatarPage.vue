<script setup lang="ts">
import AdminLive2DStage from "@/components/avatar/AdminLive2DStage.vue";
import UiBadge from "@/components/ui/UiBadge.vue";
import UiButton from "@/components/ui/UiButton.vue";
import UiCard from "@/components/ui/UiCard.vue";
import { avatarProfiles } from "@/mocks/dashboard";
</script>

<template>
  <div class="grid gap-5 xl:grid-cols-[1.28fr_0.72fr]">
    <UiCard class="rounded-[28px] px-5 py-5">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Avatar Profiles</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">数字人形象管理</h2>
        </div>
        <UiButton>新建形象</UiButton>
      </div>

      <div class="mt-6 space-y-4">
        <article
          v-for="profile in avatarProfiles"
          :key="profile.name"
          class="rounded-[28px] border border-[color:var(--color-border)] bg-slate-50 p-4"
        >
          <div class="flex items-center justify-between gap-4">
            <div>
              <h3 class="text-base font-semibold text-slate-900">{{ profile.name }}</h3>
              <div class="mt-3 flex flex-wrap gap-2">
                <UiBadge
                  v-for="tag in profile.tags"
                  :key="tag"
                  variant="secondary"
                >
                  {{ tag }}
                </UiBadge>
              </div>
            </div>
            <UiButton variant="outline">编辑配置</UiButton>
          </div>
        </article>
      </div>
    </UiCard>

    <UiCard class="rounded-[28px] px-5 py-5 xl:px-6 xl:py-6">
      <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Preview Stage</p>
      <h3 class="mt-2 text-lg font-semibold text-slate-900">预览舞台</h3>
      <div class="mt-5 flex min-h-[620px] items-center justify-center">
        <div class="w-full max-w-[400px]">
          <div class="aspect-[9/16] overflow-hidden rounded-[32px] border border-[color:var(--color-border)] bg-slate-50 shadow-[0_24px_60px_rgba(135,135,135,0.07)]">
            <AdminLive2DStage />
          </div>
        </div>
      </div>
    </UiCard>
  </div>
</template>
