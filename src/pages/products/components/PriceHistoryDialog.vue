<template>
  <q-dialog :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)">
    <q-card class="history-card">
      <q-card-section class="history-header">
        <div>
          <div class="history-title">История цен</div>
          <div class="product-name">{{ product?.name }}</div>
        </div>
        <q-btn
          flat
          dense
          round
          icon="close"
          aria-label="Закрыть"
          @click="emit('update:modelValue', false)"
        />
      </q-card-section>

      <q-card-section class="history-body">
        <div class="range-controls">
          <q-btn-toggle
            v-model="selectedRange"
            no-caps
            unelevated
            toggle-color="primary"
            :options="rangeOptions"
          />
          <div v-if="selectedRange === 'custom'" class="custom-range">
            <q-input v-model="customFrom" dense outlined type="date" label="С" stack-label />
            <q-input v-model="customTo" dense outlined type="date" label="По" stack-label />
          </div>
        </div>
        <div v-if="showPurchasePrices" class="price-tabs">
          <q-btn
            no-caps
            unelevated
            label="Продажа"
            :class="{ active: selectedPrice === 'price_sell' }"
            @click="selectedPrice = 'price_sell'"
          />
          <q-btn
            no-caps
            unelevated
            label="Закупка"
            :class="{ active: selectedPrice === 'price_buy' }"
            @click="selectedPrice = 'price_buy'"
          />
        </div>

        <div v-if="invalidRange" class="history-state compact">Укажите корректный диапазон дат</div>
        <div v-else-if="loading" class="history-state">
          <q-spinner color="primary" size="28px" />
          <span>Загружаем историю…</span>
        </div>
        <div v-else-if="loadError" class="history-state">
          <q-icon name="error_outline" size="28px" />
          <span>Не удалось загрузить историю цен</span>
          <q-btn flat no-caps label="Повторить" color="primary" @click="loadHistory(false)" />
        </div>
        <template v-else-if="displayEntries.length">
          <div class="price-summary">
            <div>
              <div class="summary-label">Последняя цена в периоде</div>
              <div class="summary-value">{{ formatPrice(latestPrice) }}</div>
            </div>
            <div>
              <div class="summary-label">С предыдущей записи</div>
              <template v-if="changeAmount !== null">
                <div
                  class="summary-change"
                  :class="{ increase: changeAmount > 0, decrease: changeAmount < 0 }"
                >
                  {{ changeAmount > 0 ? '+' : '' }}{{ formatMoney(changeAmount) }} ₽
                  <span v-if="changePercent !== null"
                    >({{ changePercent > 0 ? '+' : '' }}{{ changePercent.toFixed(1) }}%)</span
                  >
                </div>
                <div class="summary-previous">Было {{ formatPrice(previousPrice) }}</div>
              </template>
              <div v-else class="summary-previous">
                {{ hasMore && displayEntries.length === 1
                  ? 'Загрузите более ранние записи для сравнения'
                  : 'Нет предыдущей цены для сравнения' }}
              </div>
            </div>
          </div>

          <div v-if="chartData.length" class="chart-wrap">
            <canvas ref="chartCanvas" role="img" :aria-label="chartDescription" />
          </div>
          <div v-else class="history-state compact">Для этого вида цены пока нет значений</div>

          <div class="list-title">Записи</div>
          <div class="history-list">
            <div v-for="entry in reversedEntries" :key="entry.id" class="history-row">
              <div>
                <div class="row-date">{{ formatDate(entry.recorded_at) }}</div>
                <div class="row-source">
                  {{
                    entry.source === 'baseline'
                      ? 'Первая запись'
                      : entry.id === displayEntries[0]?.id
                        ? 'Цена на дату'
                        : 'Изменение цены'
                  }}
                </div>
              </div>
              <div class="row-price">{{ formatPrice(entry[selectedPrice]) }}</div>
            </div>
          </div>
          <div v-if="hasMore" class="history-note">
            График построен по загруженным записям. Более ранние можно открыть ниже.
          </div>
          <q-btn
            v-if="hasMore"
            flat
            no-caps
            class="load-more-btn"
            label="Показать более ранние"
            :loading="loadingMore"
            @click="loadHistory(true)"
          />
          <div v-if="loadMoreError" class="history-note">
            Не удалось загрузить записи. Попробуйте ещё раз.
          </div>
          <div v-if="entries[0]?.source === 'baseline'" class="history-note">
            Изменения до первой записи не сохранены.
          </div>
        </template>
        <div v-else class="history-state">
          <q-icon name="show_chart" size="32px" />
          <span>{{
            hasMore
              ? 'В загруженных записях нет изменений этой цены'
              : 'За выбранный период изменений пока нет'
          }}</span>
          <q-btn
            v-if="hasMore"
            flat
            no-caps
            label="Показать более ранние"
            :loading="loadingMore"
            @click="loadHistory(true)"
          />
          <span v-if="loadMoreError">Не удалось загрузить записи. Попробуйте ещё раз.</span>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue';
import Chart from 'chart.js/auto';
import { getElectronAPI } from 'src/utils/electronApi';
import type {
  IProductItem,
  IProductPriceHistoryEntry,
  IProductPriceHistoryQuery,
} from 'stores/interfaces/products-store.interfaces';

const props = defineProps<{
  modelValue: boolean;
  product: IProductItem | null;
  showPurchasePrices: boolean;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

type PriceField = 'price_buy' | 'price_sell';
type Range = '30d' | 'year' | 'all' | 'custom';
const rangeOptions: { label: string; value: Range }[] = [
  { label: '30 дней', value: '30d' },
  { label: 'Год', value: 'year' },
  { label: 'Всё время', value: 'all' },
  { label: 'Даты', value: 'custom' },
];
const selectedRange = ref<Range>('all');
const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const customFrom = ref(localDate(new Date(Date.now() - 30 * 86400000)));
const customTo = ref(localDate(new Date()));
const invalidRange = computed(
  () =>
    selectedRange.value === 'custom' &&
    (!customFrom.value || !customTo.value || customFrom.value > customTo.value),
);
const selectedPrice = ref<PriceField>('price_sell');
const entries = ref<IProductPriceHistoryEntry[]>([]);
const hasMore = ref(false);
const loading = ref(false);
const loadingMore = ref(false);
const loadError = ref(false);
const loadMoreError = ref(false);
let requestNumber = 0;
let activeBounds: Pick<IProductPriceHistoryQuery, 'from' | 'to'> = { from: null, to: null };

function dateFromInput(value: string, nextDay = false) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year!, month! - 1, day! + (nextDay ? 1 : 0));
}

function dbTimestamp(date: Date) {
  return date.toISOString().replace('T', ' ').replace('Z', '');
}

function historyQuery(before: IProductPriceHistoryQuery['before']): IProductPriceHistoryQuery {
  let from: string | null = null;
  let to: string | null = null;
  if (selectedRange.value === '30d') {
    from = dbTimestamp(new Date(Date.now() - 30 * 86400000));
  } else if (selectedRange.value === 'year') {
    const yearAgo = new Date();
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);
    from = dbTimestamp(yearAgo);
  } else if (selectedRange.value === 'custom') {
    from = dbTimestamp(dateFromInput(customFrom.value));
    to = dbTimestamp(dateFromInput(customTo.value, true));
  }
  return { from, to, before };
}

async function loadHistory(append = false) {
  if (!props.product || invalidRange.value || (append && (!hasMore.value || loadingMore.value)))
    return;
  const request = ++requestNumber;
  if (append) {
    loadingMore.value = true;
    loadMoreError.value = false;
  } else {
    loading.value = true;
    loadError.value = false;
    entries.value = [];
    hasMore.value = false;
  }
  try {
    const oldest = append ? entries.value[0] : undefined;
    const before = oldest ? { id: oldest.id, recorded_at: oldest.recorded_at } : null;
    const query = append ? { ...activeBounds, before } : historyQuery(null);
    if (!append) activeBounds = { from: query.from, to: query.to };
    const result = await getElectronAPI().products.getPriceHistory(props.product.id, query);
    if (request === requestNumber) {
      entries.value = append ? [...result.entries, ...entries.value] : result.entries;
      hasMore.value = result.hasMore;
    }
  } catch {
    if (request === requestNumber) {
      if (append) loadMoreError.value = true;
      else loadError.value = true;
    }
  } finally {
    if (request === requestNumber) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
}

watch(
  () =>
    [
      props.modelValue,
      props.product?.id,
      selectedRange.value,
      customFrom.value,
      customTo.value,
    ] as const,
  ([open]) => {
    if (open) {
      requestNumber++;
      if (invalidRange.value) {
        entries.value = [];
        hasMore.value = false;
        return;
      }
      void loadHistory(false);
    } else {
      requestNumber++;
      loading.value = false;
      loadingMore.value = false;
    }
  },
  { immediate: true },
);
watch(
  () => props.showPurchasePrices,
  (visible) => {
    if (!visible) selectedPrice.value = 'price_sell';
  },
);

const displayEntries = computed(() => {
  let previous: number | null = null;
  return entries.value.filter((entry, index) => {
    const current = entry[selectedPrice.value];
    const changed = current !== previous && (index > 0 || current !== null);
    previous = current;
    return changed;
  });
});
const reversedEntries = computed(() => [...displayEntries.value].reverse());
const latestPrice = computed(() => displayEntries.value.at(-1)?.[selectedPrice.value] ?? null);
const previousPrice = computed(() => displayEntries.value.at(-2)?.[selectedPrice.value] ?? null);
const changeAmount = computed(() =>
  previousPrice.value !== null && latestPrice.value !== null
    ? latestPrice.value - previousPrice.value
    : null,
);
const changePercent = computed(() =>
  changeAmount.value !== null && previousPrice.value
    ? (changeAmount.value / previousPrice.value) * 100
    : null,
);

function timestamp(value: string) {
  return new Date(`${value.replace(' ', 'T')}Z`).getTime();
}

const chartData = computed(() =>
  displayEntries.value.map((entry) => ({
    x: timestamp(entry.recorded_at),
    y: entry[selectedPrice.value],
  })),
);
const chartTimeSpan = computed(() => {
  const points = chartData.value;
  return points.length > 1 ? points[points.length - 1]!.x - points[0]!.x : 0;
});
function formatAxisTime(value: number) {
  const date = new Date(value);
  if (chartTimeSpan.value < 86400000) {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      ...(chartTimeSpan.value < 3600000 ? { second: '2-digit' } : {}),
    });
  }
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: '2-digit' });
}
const chartDescription = computed(
  () =>
    `${selectedPrice.value === 'price_sell' ? 'Цена продажи' : 'Цена закупки'}: ${chartData.value.length} точек`,
);

const chartCanvas = ref<HTMLCanvasElement | null>(null);
let chart: Chart<'line', { x: number; y: number | null }[]> | null = null;

function renderChart() {
  chart?.destroy();
  chart = null;
  if (!props.modelValue || !chartCanvas.value || !chartData.value.length) return;

  chart = new Chart(chartCanvas.value, {
    type: 'line',
    data: {
      datasets: [
        {
          label: selectedPrice.value === 'price_sell' ? 'Цена продажи' : 'Цена закупки',
          data: chartData.value,
          borderColor: '#4a6cf7',
          backgroundColor: '#4a6cf7',
          borderWidth: 2.5,
          spanGaps: false,
          pointRadius: chartData.value.length > 80 ? 0 : 3,
          pointHoverRadius: 5,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) =>
              items[0]
                ? new Date(items[0].parsed.x ?? 0).toLocaleString('ru-RU', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : '',
            label: (item) =>
              item.parsed.y === null ? 'Не указана' : `${formatMoney(item.parsed.y)} ₽`,
          },
        },
      },
      scales: {
        x: {
          type: 'linear',
          ticks: {
            maxRotation: 0,
            callback: (value) => formatAxisTime(Number(value)),
          },
          grid: { display: false },
        },
        y: {
          ticks: { callback: (value) => Number(value).toLocaleString('ru-RU') },
          grid: { color: '#eaecf0' },
        },
      },
    },
  });
}

watch(
  [chartData, loading, () => props.modelValue],
  async () => {
    await nextTick();
    renderChart();
  },
  { flush: 'post' },
);
onUnmounted(() => chart?.destroy());

const formatMoney = (value: number) =>
  value.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatPrice = (value: number | null) =>
  value === null ? 'Не указана' : `${formatMoney(value)} ₽`;
const formatDate = (value: string) =>
  new Date(timestamp(value)).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
</script>

<style scoped lang="scss">
.history-card {
  width: 720px;
  max-width: 92vw;
  max-height: calc(100vh - 32px);
  display: flex;
  flex-direction: column;
  border-radius: 12px;
}
.history-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 1px solid #eaecf0;
  padding: 20px 24px;
}
.history-title {
  color: #1a1d23;
  font-size: 17px;
  font-weight: 600;
}
.product-name {
  color: #667085;
  font-size: 13px;
  margin-top: 3px;
}
.history-body {
  padding: 20px 24px 24px;
  min-height: 0;
  overflow-y: auto;
}
.range-controls {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
}
.range-controls :deep(.q-btn-toggle) {
  align-self: flex-start;
  border: 1px solid #eaecf0;
  border-radius: 8px;
  overflow: hidden;
}
.range-controls :deep(.q-btn) {
  font-size: 12px;
  padding: 4px 12px;
}
.custom-range {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 180px));
  gap: 10px;
}
.price-tabs {
  display: inline-flex;
  gap: 4px;
  background: #f2f4f7;
  border-radius: 9px;
  padding: 3px;
  margin-bottom: 18px;
}
.price-tabs .q-btn {
  color: #667085;
  border-radius: 7px;
  font-size: 13px;
  padding: 2px 14px;
}
.price-tabs .q-btn.active {
  background: #fff;
  color: #1a1d23;
  box-shadow: 0 1px 3px #10182822;
}
.history-state {
  min-height: 220px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #98a2b3;
  font-size: 14px;
  text-align: center;
}
.history-state.compact {
  min-height: 150px;
}
.price-summary {
  display: flex;
  gap: 40px;
  margin-bottom: 14px;
}
.summary-label {
  font-size: 12px;
  color: #667085;
  margin-bottom: 4px;
}
.summary-value {
  font-size: 24px;
  font-weight: 650;
  color: #1a1d23;
  font-variant-numeric: tabular-nums;
}
.summary-change {
  font-size: 17px;
  font-weight: 600;
  color: #344054;
  font-variant-numeric: tabular-nums;
}
.summary-change.increase {
  color: #c43225;
}
.summary-change.decrease {
  color: #13805d;
}
.summary-previous {
  margin-top: 4px;
  font-size: 12px;
  color: #667085;
}
.chart-wrap {
  border: 1px solid #eaecf0;
  border-radius: 10px;
  padding: 12px;
  height: 260px;
}
.list-title {
  font-size: 13px;
  font-weight: 600;
  color: #344054;
  margin: 20px 0 8px;
}
.history-list {
  max-height: 185px;
  overflow-y: auto;
  border: 1px solid #eaecf0;
  border-radius: 8px;
}
.history-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-bottom: 1px solid #f2f4f7;
  gap: 16px;
}
.history-row:last-child {
  border-bottom: none;
}
.row-date {
  font-size: 13px;
  color: #344054;
}
.row-source {
  font-size: 11px;
  color: #98a2b3;
  margin-top: 2px;
}
.row-price {
  font-size: 13px;
  font-weight: 600;
  color: #1a1d23;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.history-note {
  font-size: 12px;
  color: #98a2b3;
  margin-top: 10px;
}
.load-more-btn {
  color: #4a6cf7;
  margin-top: 8px;
}
</style>
