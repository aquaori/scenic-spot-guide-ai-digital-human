<script setup lang="ts">
import { computed } from "vue";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    class?: string;
    width?: string;
    height?: string;
    radius?: string;
  }>(),
  {
    width: "100%",
    height: "1rem",
    radius: "12px"
  }
);

const style = computed(() => ({
  width: props.width,
  height: props.height,
  borderRadius: props.radius
}));
</script>

<template>
  <div :class="cn('ui-skeleton', $props.class)" :style="style" aria-hidden="true" />
</template>

<style scoped>
.ui-skeleton {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, #f5f8fe 0%, #ebf1fa 100%);
}

.ui-skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.72) 48%, transparent 100%);
  animation: ui-skeleton-shimmer 1.5s ease-in-out infinite;
}

@keyframes ui-skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}
</style>
