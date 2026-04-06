import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { adminApi } from "@/api/admin";
import type { Scenic } from "@/types/admin";

export const useAdminStore = defineStore("admin", () => {
  const scenicList = ref<Scenic[]>([]);
  const selectedScenicId = ref<number | null>(null);
  const isScenicLoading = ref(false);

  const selectedScenic = computed(
    () => scenicList.value.find((item) => item.id === selectedScenicId.value) ?? scenicList.value[0] ?? null
  );

  const loadScenicList = async (preferredId?: number | null) => {
    isScenicLoading.value = true;
    try {
      const response = await adminApi.listScenic();
      scenicList.value = response.rows;
      const nextId =
        preferredId && response.rows.some((item) => item.id === preferredId)
          ? preferredId
          : response.rows[0]?.id ?? null;
      selectedScenicId.value = nextId;
    } finally {
      isScenicLoading.value = false;
    }
  };

  const ensureScenicList = async () => {
    if (scenicList.value.length > 0) return;
    await loadScenicList(selectedScenicId.value);
  };

  const setSelectedScenic = (id: number) => {
    selectedScenicId.value = id;
  };

  return {
    scenicList,
    selectedScenicId,
    selectedScenic,
    isScenicLoading,
    loadScenicList,
    ensureScenicList,
    setSelectedScenic
  };
});
