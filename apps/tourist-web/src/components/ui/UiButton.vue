<template>
  <button
    :class="[
      'inline-flex items-center justify-center rounded-full text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(199_89%_68%)]/40 disabled:pointer-events-none disabled:opacity-50',
      variantClasses
    ]"
    type="button"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "outline" | "ghost";
  }>(),
  {
    variant: "default"
  }
);

const variantClasses = computed(() => {
  if (props.variant === "outline") {
    return "border border-slate-200 bg-white px-4 py-2 text-slate-700 hover:border-sky-200 hover:bg-sky-50";
  }

  if (props.variant === "ghost") {
    return "px-4 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900";
  }

  return "bg-slate-900 px-5 py-2.5 text-white hover:bg-slate-800";
});
</script>
