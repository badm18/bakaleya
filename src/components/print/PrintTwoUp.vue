<template>
  <div class="print-root">
    <div
      v-for="(orderData, orderIndex) in ordersData"
      :key="orderData.order.id"
      :data-order-index="orderIndex"
      class="order-wrapper"
      :class="{ 'page-break': orderIndex > 0 }"
    >
      <!-- Невидимый элемент для измерения высоты -->
      <div class="measure-wrap">
        <div :ref="(el) => setMeasureRef(el, orderIndex)" class="measure-form">
          <PrintForm :order="orderData.order" :items="orderData.items" />
        </div>
      </div>

      <!-- Два экземпляра на одном листе -->
      <template v-if="fitsMap[orderIndex] === true">
        <div class="half-page">
          <PrintForm :order="orderData.order" :items="orderData.items" />
        </div>
        <div class="half-divider"></div>
        <div class="half-page">
          <PrintForm :order="orderData.order" :items="orderData.items" />
        </div>
      </template>

      <!-- Два экземпляра на отдельных листах -->
      <template v-else-if="fitsMap[orderIndex] === false">
        <div class="full-page">
          <PrintForm :order="orderData.order" :items="orderData.items" />
        </div>
        <div class="full-page page-break">
          <PrintForm :order="orderData.order" :items="orderData.items" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import PrintForm from './PrintForm.vue';
import type { IOrderItem, IDetailItem } from 'stores/interfaces/orders-store.interfaces';

interface OrderData {
  order: IOrderItem;
  items: IDetailItem[];
}

const props = defineProps<{
  ordersData: OrderData[];
}>();

const emit = defineEmits<{
  ready: [];
}>();

const fitsMap = ref<Record<number, boolean | null>>({});
const measureRefs = ref<Record<number, HTMLElement>>({});

const setMeasureRef = (el: unknown, index: number) => {
  if (el) measureRefs.value[index] = el as HTMLElement;
};

onMounted(async () => {
  props.ordersData.forEach((_, index) => {
    fitsMap.value[index] = null;
  });

  await nextTick();

  // A4 высота минус поля принтера (10мм сверху + 10мм снизу) = 277мм
  // Половина = 138мм при 96dpi
  const halfPagePx = Math.round(138 * (96 / 25.4));

  props.ordersData.forEach((_, index) => {
    const el = measureRefs.value[index];
    if (!el) return;
    console.log(
      'clientHeight:',
      el.clientHeight,
      'halfPagePx:',
      halfPagePx,
      'fits:',
      el.clientHeight <= halfPagePx,
    );
    fitsMap.value[index] = el.clientHeight <= halfPagePx;
  });

  emit('ready');
});
</script>

<style lang="scss">
.print-root {
  font-family: 'Times New Roman', Times, serif;
}

.order-wrapper {
  width: 100%;
  position: relative;
}

.page-break {
  page-break-before: always;
}

.measure-wrap {
  position: absolute;
  top: 0;
  left: 0;
  visibility: hidden;
  pointer-events: none;
  width: 100%;
}

.measure-form {
  width: 100%;
}

.half-page {
  height: 138mm;
  overflow: hidden;
  box-sizing: border-box;
  padding-right: 1px;
}

.half-divider {
  height: 4mm;
  display: flex;
  align-items: center;

  &::after {
    content: '';
    display: block;
    width: 100%;
    border-top: 1px dashed #999;
  }
}

.full-page {
  min-height: 277mm;
  box-sizing: border-box;
}

@media print {
  @page {
    margin: 10mm;
    size: A4;
  }

  .measure-wrap {
    display: none !important;
  }

  .half-page {
    height: 138mm;
    page-break-inside: avoid;
  }

  .half-divider {
    page-break-after: avoid;
    page-break-before: avoid;
  }

  .full-page {
    page-break-inside: avoid;
  }

  .page-break {
    page-break-before: always;
  }
}
</style>
