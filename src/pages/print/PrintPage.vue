<template>
  <div class="print-page">
    <!-- Dev toolbar -->
    <div v-if="isDev" class="dev-toolbar">
      <span class="dev-label">Предпросмотр печати</span>
      <button class="dev-print-btn" @click="triggerPrint">Печать</button>
    </div>

    <div id="print-area">
      <PrintTwoUp v-if="ordersData.length" :orders-data="ordersData" @ready="onReady" />
      <div v-else-if="loading" class="loading">Загрузка...</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import PrintTwoUp from 'src/components/print/PrintTwoUp.vue';
import type { IOrderData } from 'stores/interfaces/orders-store.interfaces';

const isDev = import.meta.env.DEV;
const route = useRoute();
const loading = ref(true);
const ordersData = ref<IOrderData[]>([]);

onMounted(async () => {
  try {
    const idsParam = route.query.ids as string;
    const ids: number[] = JSON.parse(decodeURIComponent(idsParam));
    ordersData.value = await window.electronAPI.print.getOrdersData(ids);
  } finally {
    loading.value = false;
  }
});

const onReady = () => {
  if (!isDev) {
    setTimeout(() => window.print(), 100);
  }
};

const triggerPrint = () => {
  void window.electronAPI.print.trigger();
};
</script>

<style lang="scss">
.print-page {
  background: #f0f0f0;
  min-height: 100vh;
}

.dev-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #1a1d23;
  color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.dev-label {
  font-size: 14px;
  font-weight: 500;
}

.dev-print-btn {
  background: #4a6cf7;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    background: #3a5ce5;
  }
}

// Предпросмотр на экране
#print-area {
  background: #fff;
  width: 210mm;
  margin: 20px auto;
  padding: 10mm;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
  box-sizing: border-box;
}

.loading {
  padding: 40px;
  text-align: center;
  color: #667085;
}

@media print {
  * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  html,
  body {
    width: 100%;
    height: auto;
    margin: 0;
    padding: 0;
  }

  .dev-toolbar {
    display: none !important;
  }

  .print-page {
    background: none;
    min-height: unset;
  }

  // При печати убираем декоративные стили контейнера
  // поля задаются через @page в PrintTwoUp
  #print-area {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
    box-shadow: none !important;
    background: none !important;
  }
}
</style>
