<script setup lang="ts">
import { cn } from "@/lib/utils";

defineProps<{
  class?: string;
}>();
</script>

<template>
  <section :class="cn('admin-surface rounded-3xl bg-white', $props.class)">
    <slot />
  </section>
</template>
