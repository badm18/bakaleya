<template>
  <div class="print-root">
    <div
      v-for="(orderData, orderIndex) in ordersData"
      :key="orderData.order.id"
      :data-order-index="orderIndex"
      class="order-wrapper"
      :class="{ 'page-break': orderIndex > 0, 'two-up': fitsMap[orderIndex] === true }"
    >
      <!-- Невидимый элемент для измерения высоты -->
      <div class="measure-wrap">
        <div :ref="(el) => setMeasureRef(el, orderIndex)" class="measure-form">
          <PrintForm :order="orderData.order" :items="orderData.items" />
        </div>
        <div :ref="setHalfRulerRef" class="half-ruler" aria-hidden="true"></div>
      </div>

      <!-- Два экземпляра на одном листе -->
      <template v-if="fitsMap[orderIndex] === true">
        <div class="half-page">
          <PrintForm :order="orderData.order" :items="orderData.items" />
        </div>
        <div class="half-divider"></div>
        <div class="half-page half-page-flipped">
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
const halfRulerRef = ref<HTMLElement | null>(null);

const setMeasureRef = (el: unknown, index: number) => {
  if (el) measureRefs.value[index] = el as HTMLElement;
};

const setHalfRulerRef = (el: unknown) => {
  if (el && !halfRulerRef.value) halfRulerRef.value = el as HTMLElement;
};

onMounted(async () => {
  props.ordersData.forEach((_, index) => {
    fitsMap.value[index] = null;
  });

  await nextTick();

  // Берем фактическую высоту половины листа из CSS, чтобы совпадало с печатью.
  const halfPagePx = Math.round(halfRulerRef.value?.getBoundingClientRect().height ?? 0);

  props.ordersData.forEach((_, index) => {
    const el = measureRefs.value[index];
    if (!el || !halfPagePx) return;
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
  --print-page-height-mm: 297mm;
  --print-page-margin-mm: 10mm;
  --print-content-height-mm: calc(
    var(--print-page-height-mm) - (var(--print-page-margin-mm) * 2)
  );
  --print-divider-height-mm: 4mm;
  --print-divider-offset-mm: 1.5mm;
  --print-half-height-mm: calc(
    (var(--print-content-height-mm) - var(--print-divider-height-mm)) / 2
  );
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

.half-ruler {
  width: 1px;
  height: var(--print-half-height-mm);
}

.half-page {
  height: var(--print-half-height-mm);
  overflow: hidden;
  box-sizing: border-box;
  padding-right: 1px;
}

.half-divider {
  height: var(--print-divider-height-mm);
  display: flex;
  align-items: center;
  transform: translateY(var(--print-divider-offset-mm));

  &::after {
    content: '';
    display: block;
    width: 100%;
    border-top: 1px dashed #999;
  }
}

.full-page {
  min-height: var(--print-content-height-mm);
  box-sizing: border-box;
}

@media print {
  @page {
    margin: 10mm;
    size: A4;
  }

  .order-wrapper.two-up {
    height: var(--print-content-height-mm);
    display: flex;
    flex-direction: column;
  }

  .measure-wrap {
    display: none !important;
  }

  .half-page {
    height: auto;
    flex: 1 1 0;
    page-break-inside: avoid;
  }

  .half-divider {
    flex: 0 0 var(--print-divider-height-mm);
    page-break-after: avoid;
    page-break-before: avoid;
  }

  .half-page-flipped {
    transform: rotate(180deg);
    transform-origin: center;
  }

  .full-page {
    page-break-inside: avoid;
  }

  .page-break {
    page-break-before: always;
  }
}

.half-page-flipped {
  transform: rotate(180deg);
  transform-origin: center;
}
</style>
