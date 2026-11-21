<template>
  <router-view />

  <q-dialog v-model="showDownload" persistent>
    <q-card style="min-width: 360px; max-width: 90vw">
      <q-card-section class="text-h6">Скачивание обновления</q-card-section>
      <q-card-section>
        <q-linear-progress
          rounded
          size="12px"
          color="primary"
          :indeterminate="!total"
          :value="percent / 100"
        />
        <div class="q-mt-md">
          {{ total ? `Загружено ${Math.round(percent)}%` : 'Подключаемся к серверу обновлений…' }}
        </div>
        <div v-if="total" class="text-caption text-grey-7 q-mt-xs">
          {{ formatMegabytes(transferred) }} из {{ formatMegabytes(total) }} МБ
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';

const showDownload = ref(false);
const percent = ref(0);
const transferred = ref(0);
const total = ref(0);
let unsubscribe: (() => void) | undefined;

function formatMegabytes(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1);
}

onMounted(() => {
  if (!window.electronAPI?.updates) return;

  unsubscribe = window.electronAPI.updates.onDownloadState((state) => {
    showDownload.value = state.status === 'starting' || state.status === 'downloading';
    percent.value = state.percent;
    transferred.value = state.transferred;
    total.value = state.total;
  });
});

onBeforeUnmount(() => unsubscribe?.());
</script>
