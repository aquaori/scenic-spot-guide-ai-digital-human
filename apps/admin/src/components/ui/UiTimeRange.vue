<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { Clock3 } from "lucide-vue-next";
import { cn } from "@/lib/utils";

interface Props {
  modelValue?: string;
  disabled?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  disabled: false
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  change: [value: string];
}>();

const startTime = ref("");
const endTime = ref("");

function parseRange(value: string) {
  const matched = value.match(/^(\d{2}:\d{2})-(\d{2}:\d{2})$/);
  return {
    start: matched?.[1] ?? "",
    end: matched?.[2] ?? ""
  };
}

watch(
  () => props.modelValue,
  (value) => {
    const parsed = parseRange(value);
    startTime.value = parsed.start;
    endTime.value = parsed.end;
  },
  { immediate: true }
);

const wrapperClasses = computed(() =>
  cn(
    "flex h-12 w-full items-center gap-3 rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 transition",
    "focus-within:border-[#2563eb] focus-within:ring-4 focus-within:ring-[#2563eb]/10",
    props.disabled && "cursor-not-allowed bg-slate-50 text-slate-400",
    props.class
  )
);

function syncValue() {
  const nextValue = startTime.value && endTime.value ? `${startTime.value}-${endTime.value}` : "";
  emit("update:modelValue", nextValue);
  emit("change", nextValue);
}
</script>

<template>
  <div :class="wrapperClasses">
    <Clock3 class="h-4 w-4 shrink-0 text-slate-400" />
    <input
      v-model="startTime"
      :disabled="disabled"
      type="time"
      step="60"
      class="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
      @change="syncValue"
    />
    <span class="text-sm text-slate-400">至</span>
    <input
      v-model="endTime"
      :disabled="disabled"
      type="time"
      step="60"
      class="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none"
      @change="syncValue"
    />
  </div>
</template>
