import { ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useAdminStore } from "@/stores/admin";

export const useAdminScopedLoader = <T>(loader: (scenicId: number) => Promise<T>) => {
  const adminStore = useAdminStore();
  const { selectedScenicId } = storeToRefs(adminStore);

  const data = ref<T | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const refresh = async () => {
    if (!selectedScenicId.value) return;

    loading.value = true;
    error.value = null;

    try {
      data.value = await loader(selectedScenicId.value);
    } catch (caughtError) {
      error.value = caughtError instanceof Error ? caughtError.message : "请求失败";
    } finally {
      loading.value = false;
    }
  };

  watch(
    selectedScenicId,
    async () => {
      await refresh();
    },
    { immediate: true }
  );

  return {
    data,
    loading,
    error,
    refresh
  };
};
