<script setup lang="ts">
import { cva, type VariantProps } from "class-variance-authority";
import { computed } from "vue";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-[8px] px-2.5 py-1 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[linear-gradient(180deg,#2563eb_0%,#1d4ed8_100%)] text-white",
        secondary: "bg-[#f3f7fd] text-slate-600",
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
