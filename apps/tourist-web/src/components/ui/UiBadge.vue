<template>
  <span
    :class="[
      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
      variantClasses
    ]"
  >
    <slot />
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "default" | "secondary";
  }>(),
  {
    variant: "default"
  }
);

const variantClasses = computed(() =>
  props.variant === "secondary"
    ? "border-slate-200 bg-slate-100 text-slate-600"
    : "border-sky-200 bg-sky-50 text-sky-700"
);
</script>
