<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Database,
  LayoutDashboard,
  MessageSquareText,
  Settings
} from "lucide-vue-next";
import UiButton from "@/components/ui/UiButton.vue";
import { cn } from "@/lib/utils";

type NavChild = {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
};

type NavGroup = {
  key: string;
  label: string;
  children: NavChild[];
};

const collapsed = ref(false);
const route = useRoute();

const navigationGroups: NavGroup[] = [
  {
    key: "ops",
    label: "运营模块",
    children: [
      { label: "运营总览", to: "/", icon: LayoutDashboard },
      { label: "会话记录", to: "/conversation", icon: MessageSquareText }
    ]
  },
  {
    key: "content",
    label: "内容模块",
    children: [
      { label: "数字人形象", to: "/avatar", icon: Bot },
      { label: "知识库管理", to: "/knowledge", icon: Database }
    ]
  },
  {
    key: "system",
    label: "系统模块",
    children: [{ label: "系统设置", to: "/settings", icon: Settings }]
  }
];

const groupState = reactive<Record<string, boolean>>({
  ops: true,
  content: true,
  system: true
});

const pageTitleMap: Record<string, string> = {
  dashboard: "运营总览",
  avatar: "数字人形象",
  knowledge: "知识库管理",
  conversation: "会话记录",
  settings: "系统设置"
};

const currentTitle = computed(() => pageTitleMap[String(route.name ?? "dashboard")] ?? "运营总览");

function toggleGroup(key: string) {
  if (collapsed.value) {
    return;
  }

  groupState[key] = !groupState[key];
}
</script>

<template>
  <div class="flex min-h-screen bg-[color:var(--color-background)]">
    <aside
      :class="cn(
        'relative hidden shrink-0 border-r border-slate-200/80 bg-[linear-gradient(180deg,#fbfcff_0%,#f4f7fb_100%)] transition-[width] duration-300 ease-out xl:flex xl:flex-col',
        collapsed ? 'w-[96px]' : 'w-[308px]'
      )"
    >
      <div :class="cn('flex h-screen flex-col py-4 transition-[padding] duration-300 ease-out', collapsed ? 'px-2.5' : 'px-3')">
        <div
          :class="cn(
            'flex-1 border border-white/70 bg-white/78 shadow-[0_16px_32px_rgba(15,23,42,0.04)] backdrop-blur transition-all duration-300 ease-out',
            collapsed ? 'rounded-[26px] px-2 py-3' : 'rounded-[30px] px-3 py-4'
          )"
        >
          <div class="flex h-9 items-center px-2 pb-2">
            <p
              :class="cn(
                'overflow-hidden text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400 transition-[opacity,width] duration-200 ease-out whitespace-nowrap',
                collapsed ? 'w-0 opacity-0' : 'w-[110px] opacity-100'
              )"
            >
              Navigation
            </p>
          </div>

          <nav :class="cn(collapsed ? 'space-y-2' : 'space-y-3')">
            <section
              v-for="group in navigationGroups"
              :key="group.key"
              :class="cn(
                'border border-slate-100 bg-white/80 shadow-[0_8px_20px_rgba(15,23,42,0.03)] transition-all duration-300 ease-out',
                collapsed ? 'rounded-[22px] px-1.5 py-1.5' : 'rounded-[24px] px-2 py-2'
              )"
            >
              <button
                v-if="!collapsed"
                type="button"
                class="flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-2 text-left"
                @click="toggleGroup(group.key)"
              >
                <span
                  v-if="!collapsed"
                  class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400"
                >
                  {{ group.label }}
                </span>
                <span v-else class="sr-only">{{ group.label }}</span>
                <ChevronDown
                  :class="cn('h-4 w-4 text-slate-400 transition-transform duration-300 ease-out', groupState[group.key] && 'rotate-180')"
                />
              </button>

              <Transition
                enter-active-class="transition-all duration-250 ease-out"
                enter-from-class="max-h-0 opacity-0 -translate-y-1"
                enter-to-class="max-h-96 opacity-100 translate-y-0"
                leave-active-class="transition-all duration-200 ease-in"
                leave-from-class="max-h-96 opacity-100 translate-y-0"
                leave-to-class="max-h-0 opacity-0 -translate-y-1"
              >
                <div
                  v-if="collapsed || groupState[group.key]"
                  :class="cn('overflow-hidden space-y-1.5', !collapsed && 'mt-1')"
                >
                <RouterLink
                  v-for="item in group.children"
                  :key="item.to"
                  :to="item.to"
                  custom
                  v-slot="{ href, navigate, isActive, isExactActive }"
                >
                  <a
                    :href="href"
                    @click="navigate"
                    :class="cn(
                      'group flex w-full cursor-pointer flex-nowrap items-center overflow-hidden font-medium transition-all duration-200',
                      collapsed
                        ? 'min-h-12 justify-center rounded-[18px] px-0 py-0'
                        : 'min-h-11 gap-3 rounded-2xl px-3 py-2.5 text-sm',
                      (item.to === '/' ? isExactActive : isActive)
                        ? collapsed
                          ? 'bg-slate-950 text-white shadow-[0_6px_14px_rgba(15,23,42,0.08)]'
                          : 'bg-slate-950 text-white shadow-[0_16px_28px_rgba(15,23,42,0.12)]'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    )"
                  >
                    <span class="flex h-5 w-5 shrink-0 items-center justify-center">
                      <component :is="item.icon" class="h-4.5 w-4.5 shrink-0" />
                    </span>
                    <span
                      :class="cn(
                        'block min-w-0 overflow-hidden whitespace-nowrap leading-5 transition-[width,opacity,margin] duration-200 ease-out',
                        collapsed ? 'ml-0 w-0 opacity-0' : 'ml-0 flex-1 opacity-100'
                      )"
                    >
                        {{ item.label }}
                    </span>
                  </a>
                </RouterLink>
                </div>
              </Transition>
            </section>
          </nav>
        </div>

        <div class="mt-4 flex items-center gap-3 rounded-[24px] border border-white/70 bg-white/82 p-3 shadow-[0_14px_28px_rgba(15,23,42,0.04)]">
          <button
            type="button"
            class="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-900 hover:text-white"
            @click="collapsed = !collapsed"
          >
            <ChevronLeft v-if="!collapsed" class="h-4.5 w-4.5" />
            <ChevronRight v-else class="h-4.5 w-4.5" />
          </button>

          <div
            :class="cn(
              'min-w-0 overflow-hidden whitespace-nowrap transition-[width,opacity,margin] duration-200 ease-out',
              collapsed ? 'w-0 opacity-0' : 'w-[120px] opacity-100'
            )"
          >
            <div v-if="!collapsed" class="min-w-0">
              <p class="text-xs text-slate-500">收起侧边栏</p>
              <p class="text-sm font-medium text-slate-900">聚焦主工作区</p>
            </div>
          </div>
        </div>
      </div>
    </aside>

    <main class="min-w-0 flex-1">
      <div class="flex h-screen flex-col">
        <header class="flex h-18 items-center justify-between border-b border-[color:var(--color-border)] bg-white/90 px-5 backdrop-blur">
          <div>
            <p class="text-xs font-medium uppercase tracking-[0.24em] text-slate-400">Management</p>
            <h1 class="mt-1 text-lg font-semibold text-slate-900">{{ currentTitle }}</h1>
          </div>

          <div class="flex items-center gap-3">
            <UiButton variant="outline">导出日报</UiButton>
            <UiButton>发布更新</UiButton>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <div class="mx-auto w-full max-w-[1600px] px-5 py-5">
            <RouterView />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
