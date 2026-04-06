<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { storeToRefs } from "pinia";
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
import { useAdminStore } from "@/stores/admin";
import { useAuthStore } from "@/stores/auth";

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
const adminStore = useAdminStore();
const authStore = useAuthStore();
const { scenicList, selectedScenic, selectedScenicId, isScenicLoading } = storeToRefs(adminStore);

const navigationGroups: NavGroup[] = [
  {
    key: "ops",
    label: "运营总览",
    children: [
      { label: "数据看板", to: "/", icon: LayoutDashboard },
      { label: "问答审计", to: "/conversation", icon: MessageSquareText }
    ]
  },
  {
    key: "content",
    label: "内容资产",
    children: [
      { label: "数字人配置", to: "/avatar", icon: Bot },
      { label: "知识库文档", to: "/knowledge", icon: Database }
    ]
  },
  {
    key: "system",
    label: "系统配置",
    children: [{ label: "接入状态", to: "/settings", icon: Settings }]
  }
];

const groupState = reactive<Record<string, boolean>>({
  ops: true,
  content: true,
  system: true
});

const pageTitleMap: Record<string, string> = {
  dashboard: "数据看板",
  avatar: "数字人配置",
  knowledge: "知识库文档",
  conversation: "问答审计",
  settings: "接入状态"
};

const currentTitle = computed(() => pageTitleMap[String(route.name ?? "dashboard")] ?? "数据看板");

onMounted(async () => {
  await adminStore.ensureScenicList();
});

function toggleGroup(key: string) {
  if (collapsed.value) return;
  groupState[key] = !groupState[key];
}

const handleLogout = async () => {
  await authStore.logout();
  window.location.href = "/login";
};
</script>

<template>
  <div class="flex min-h-screen bg-[color:var(--color-background)]">
    <aside
      :class="cn(
        'relative hidden shrink-0 border-r border-[#d9e4f5] bg-[linear-gradient(180deg,#f8fbff_0%,#f1f6fd_100%)] transition-[width] duration-300 ease-out xl:flex xl:flex-col',
        collapsed ? 'w-[96px]' : 'w-[308px]'
      )"
    >
      <div :class="cn('flex h-screen flex-col py-3 transition-[padding] duration-300 ease-out', collapsed ? 'px-2' : 'px-2.5')">
        <div
          :class="cn(
            'flex-1 border border-white/80 bg-white/82 shadow-[0_18px_36px_rgba(148,163,184,0.08)] backdrop-blur transition-all duration-300 ease-out',
            collapsed ? 'rounded-[8px] px-2 py-2.5' : 'rounded-[8px] px-2.5 py-3'
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

          <nav :class="cn(collapsed ? 'space-y-1.5' : 'space-y-2')">
            <section
              v-for="group in navigationGroups"
              :key="group.key"
              :class="cn(
                'border border-[#edf2fb] bg-[linear-gradient(180deg,#ffffff_0%,#fbfdff_100%)] shadow-[0_10px_24px_rgba(148,163,184,0.06)] transition-all duration-300 ease-out',
                collapsed ? 'rounded-[8px] px-1.5 py-1.5' : 'rounded-[8px] px-2 py-2'
              )"
            >
              <button
                v-if="!collapsed"
                type="button"
                class="flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-left"
                @click="toggleGroup(group.key)"
              >
                <span class="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  {{ group.label }}
                </span>
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
                <div v-if="collapsed || groupState[group.key]" :class="cn('overflow-hidden space-y-1.5', !collapsed && 'mt-1')">
                  <RouterLink
                    v-for="item in group.children"
                    :key="item.to"
                    :to="item.to"
                    custom
                    v-slot="{ href, navigate, isActive, isExactActive }"
                  >
                    <a
                      :href="href"
                      :class="cn(
                        'group flex w-full cursor-pointer flex-nowrap items-center overflow-hidden font-medium transition-all duration-200',
                        collapsed ? 'min-h-11 justify-center rounded-[8px]' : 'min-h-10 gap-3 rounded-[8px] px-3 py-2 text-sm',
                        (item.to === '/' ? isExactActive : isActive)
                          ? collapsed
                            ? 'bg-[#2563eb] text-white'
                            : 'bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] text-white'
                          : 'text-slate-600 hover:bg-[#edf4ff] hover:text-[#1d4ed8]'
                      )"
                      @click="navigate"
                    >
                      <span class="flex h-5 w-5 shrink-0 items-center justify-center">
                        <component :is="item.icon" class="h-4.5 w-4.5 shrink-0" />
                      </span>
                      <span
                        :class="cn(
                          'block min-w-0 overflow-hidden whitespace-nowrap leading-5 transition-[width,opacity,margin] duration-200 ease-out',
                          collapsed ? 'w-0 opacity-0' : 'flex-1 opacity-100'
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

        <div class="mt-3 flex items-center gap-3 rounded-[8px] border border-white/80 bg-white/84 p-2.5 shadow-[0_12px_24px_rgba(148,163,184,0.08)]">
          <button
            type="button"
            class="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-[8px] bg-[#eef4ff] text-[#3b5b8a] transition hover:bg-[#2563eb] hover:text-white"
            @click="collapsed = !collapsed"
          >
            <ChevronLeft v-if="!collapsed" class="h-4.5 w-4.5" />
            <ChevronRight v-else class="h-4.5 w-4.5" />
          </button>

          <div :class="cn('min-w-0 overflow-hidden whitespace-nowrap transition-[width,opacity,margin] duration-200 ease-out', collapsed ? 'w-0 opacity-0' : 'w-[150px] opacity-100')">
            <div v-if="!collapsed" class="min-w-0">
              <p class="text-xs text-slate-500">当前景区</p>
              <p class="text-sm font-medium text-slate-900">{{ selectedScenic?.scenicName ?? "加载中" }}</p>
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
            <label class="flex items-center gap-3 rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm text-slate-600">
              <span>景区</span>
              <select
                :value="selectedScenicId ?? ''"
                class="min-w-[180px] bg-transparent text-sm text-slate-900 outline-none"
                :disabled="isScenicLoading"
                @change="adminStore.setSelectedScenic(Number(($event.target as HTMLSelectElement).value))"
              >
                <option v-for="item in scenicList" :key="item.id" :value="item.id">
                  {{ item.scenicName }}
                </option>
              </select>
            </label>
            <UiButton variant="outline">{{ selectedScenic?.starLevel ?? "--" }}</UiButton>
            <UiButton @click="handleLogout">退出登录</UiButton>
          </div>
        </header>

        <div class="min-h-0 flex-1 overflow-y-auto">
          <div class="mx-auto w-full max-w-[1540px] px-4 py-4 min-[1800px]:max-w-[1760px] min-[2200px]:max-w-[2080px] min-[2400px]:max-w-[2280px] min-[1800px]:px-3">
            <RouterView />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
