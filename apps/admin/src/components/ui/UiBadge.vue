<script setup lang="ts">
import { cva, type VariantProps } from "class-variance-authority";
import { computed } from "vue";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-900 text-white",
        secondary: "bg-slate-100 text-slate-600",
        success: "bg-emerald-50 text-emerald-700",
        info: "bg-sky-50 text-sky-700"
      }
    },
    defaultVariants: {
      variant: "secondary"
    }
  }
);

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

interface Props {
  variant?: BadgeVariant;
  class?: string;
}

const props = defineProps<Props>();
const classes = computed(() => cn(badgeVariants({ variant: props.variant }), props.class));
</script>

<template>
  <span :class="classes">
    <slot />
  </span>
</template>
