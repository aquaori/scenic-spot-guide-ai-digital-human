<script setup lang="ts">
import { computed, ref, watch } from "vue";
import UiSelect from "@/components/ui/UiSelect.vue";
import type { UiSelectOption } from "@/components/ui/UiSelect.vue";

type Axis = "latitude" | "longitude";

interface Props {
  modelValue: number;
  axis: Axis;
  disabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false
});

const emit = defineEmits<{
  "update:modelValue": [value: number];
  change: [value: number];
}>();

const direction = ref("N");
const magnitude = ref("");

const directionOptions = computed<UiSelectOption[]>(() =>
  props.axis === "latitude"
    ? [
        { label: "北纬", value: "N" },
        { label: "南纬", value: "S" }
      ]
    : [
        { label: "东经", value: "E" },
        { label: "西经", value: "W" }
      ]
);

watch(
  () => props.modelValue,
  (value) => {
    const absolute = Math.abs(Number(value) || 0);
    magnitude.value = absolute ? absolute.toFixed(6).replace(/\.?0+$/, "") : "";
    direction.value =
      props.axis === "latitude" ? (value < 0 ? "S" : "N") : value < 0 ? "W" : "E";
  },
  { immediate: true }
);

function syncValue() {
  const parsed = Number(magnitude.value);
  const absolute = Number.isNaN(parsed) ? 0 : Math.abs(parsed);
  const signed =
    props.axis === "latitude"
      ? direction.value === "S"
        ? -absolute
        : absolute
      : direction.value === "W"
        ? -absolute
        : absolute;

  emit("update:modelValue", signed);
  emit("change", signed);
}
</script>

<template>
  <div class="grid grid-cols-[120px_1fr] gap-2">
    <UiSelect v-model="direction" :options="directionOptions" :disabled="disabled" @change="syncValue" />
    <input
      v-model="magnitude"
      :disabled="disabled"
      type="number"
      min="0"
      step="0.000001"
      class="h-12 w-full rounded-[8px] border border-[color:var(--color-border)] bg-white px-4 text-sm outline-none transition focus:border-[#2563eb] focus:ring-4 focus:ring-[#2563eb]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
      @change="syncValue"
    />
  </div>
</template>
