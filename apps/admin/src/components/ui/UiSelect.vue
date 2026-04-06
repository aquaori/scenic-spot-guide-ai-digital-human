<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Check, ChevronDown } from "lucide-vue-next";
import { cn } from "@/lib/utils";

type SelectValue = string | number;

export type UiSelectOption = {
  label: string;
  value: SelectValue;
};

interface Props {
  modelValue: SelectValue | null | undefined;
  options: readonly UiSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "请选择",
  disabled: false
});

const emit = defineEmits<{
  "update:modelValue": [value: SelectValue];
  change: [value: SelectValue];
}>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

const selectedOption = computed(() => props.options.find((item) => item.value === props.modelValue) ?? null);

const triggerClasses = computed(() =>
  cn(
    "flex h-12 w-full items-center justify-between rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 text-sm text-slate-900 transition outline-none",
    "hover:border-[#bfd4f6] focus-visible:border-[#2563eb] focus-visible:ring-4 focus-visible:ring-[#2563eb]/10",
    props.disabled && "cursor-not-allowed bg-slate-50 text-slate-400",
    props.class
  )
);

const panelClasses =
  "absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-[8px] border border-[#d7e3f4] bg-white shadow-[0_14px_32px_rgba(15,23,42,0.10)]";

function selectOption(option: UiSelectOption) {
  emit("update:modelValue", option.value);
  emit("change", option.value);
  open.value = false;
}

function toggleOpen() {
  if (props.disabled) return;
  open.value = !open.value;
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!open.value || !rootRef.value) return;
  if (event.target instanceof Node && !rootRef.value.contains(event.target)) {
    open.value = false;
  }
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") {
    open.value = false;
  }
}

onMounted(() => {
  document.addEventListener("pointerdown", handleDocumentPointerDown);
  document.addEventListener("keydown", handleDocumentKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("pointerdown", handleDocumentPointerDown);
  document.removeEventListener("keydown", handleDocumentKeydown);
});
</script>

<template>
  <div ref="rootRef" class="relative">
    <button type="button" :class="triggerClasses" :disabled="disabled" @click="toggleOpen">
      <span class="truncate text-left">{{ selectedOption?.label ?? placeholder }}</span>
      <ChevronDown :class="cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', open && 'rotate-180')" />
    </button>

    <div v-if="open" :class="panelClasses">
      <button
        v-for="option in options"
        :key="`${option.value}`"
        type="button"
        class="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-slate-700 transition hover:bg-[#f5f9ff] hover:text-slate-950"
        @click="selectOption(option)"
      >
        <span>{{ option.label }}</span>
        <Check v-if="option.value === modelValue" class="h-4 w-4 text-[#2563eb]" />
      </button>
    </div>
  </div>
</template>
