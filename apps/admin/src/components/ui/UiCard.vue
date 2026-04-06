<script setup lang="ts">
import { cn } from "@/lib/utils";

defineProps<{
  class?: string;
}>();
</script>

<template>
  <section :class="cn('admin-surface rounded-[8px] bg-white', $props.class)">
    <slot />
  </section>
</template>
