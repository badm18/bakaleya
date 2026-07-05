<template>
  <q-page class="reports-page">
    <div class="page-toolbar">
      <div class="toolbar-left">
        <span class="page-title">Отчеты</span>
      </div>
      <div class="toolbar-right">
        <q-btn
          v-for="preset in presets"
          :key="preset.value"
          flat
          dense
          :label="preset.label"
          class="preset-btn"
          :class="{ active: activePreset === preset.value }"
          @click="applyPreset(preset.value)"
        />
        <q-input
          v-model="dateFrom"
          dense
          outlined
          type="date"
          label="С"
          class="date-input"
          @update:model-value="() => loadReport()"
        />
        <q-input
          v-model="dateTo"
          dense
          outlined
          type="date"
          label="По"
          class="date-input"
          @update:model-value="() => loadReport()"
        />
      </div>
    </div>

    <div class="reports-content">
      <div class="summary-row">
        <div class="summary-item">
          <div class="summary-label">Получено денег</div>
          <div class="summary-value">{{ formatPrice(report.summary.total_sum) }} ₽</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Заявок</div>
          <div class="summary-value small">{{ report.summary.orders_count }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Позиций</div>
          <div class="summary-value small">{{ report.summary.items_count }}</div>
        </div>
      </div>

      <div class="table-wrap">
        <div class="table-header">
          <div class="col-category">Главная категория</div>
          <div class="col-count">Позиций</div>
          <div class="col-sum">Получено денег</div>
        </div>

        <template v-if="!loading">
          <div v-for="item in report.items" :key="item.main_category_id" class="table-row">
            <div class="col-category">
              <q-icon name="category" size="16px" class="row-icon" />
              <span>{{ item.main_category_name }}</span>
            </div>
            <div class="col-count">{{ item.items_count }}</div>
            <div class="col-sum">{{ formatPrice(item.total_sum) }} ₽</div>
          </div>

          <div v-if="!report.items.length" class="empty-state">
            <q-icon name="bar_chart" size="48px" class="empty-icon" />
            <div class="empty-text">За выбранный период заявок нет</div>
          </div>
        </template>

        <template v-else>
          <div v-for="i in 6" :key="i" class="table-row">
            <div class="col-category"><q-skeleton type="text" width="160px" /></div>
            <div class="col-count"><q-skeleton type="text" width="40px" /></div>
            <div class="col-sum"><q-skeleton type="text" width="100px" /></div>
          </div>
        </template>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { errorHandler } from 'src/utils/errorHandler';
import { getElectronAPI } from 'src/utils/electronApi';
import type { IRevenueByCategoryReport } from 'src/stores/interfaces/reports-store.interfaces';

type Preset = 'today' | 'week' | 'month';

const presets: { label: string; value: Preset }[] = [
  { label: 'Сегодня', value: 'today' },
  { label: 'Неделя', value: 'week' },
  { label: 'Месяц', value: 'month' },
];

const emptyReport = (): IRevenueByCategoryReport => ({
  items: [],
  summary: {
    total_sum: 0,
    orders_count: 0,
    items_count: 0,
  },
});

const report = ref<IRevenueByCategoryReport>(emptyReport());
const loading = ref(false);
const activePreset = ref<Preset | null>('today');
const dateFrom = ref('');
const dateTo = ref('');

const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
};

const formatPrice = (val: number | null | undefined) => {
  const normalized = Number(val);
  const safeValue = Number.isFinite(normalized) ? normalized : 0;

  return safeValue.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const normalizeReport = (data: IRevenueByCategoryReport): IRevenueByCategoryReport => ({
  items: data.items.map((item) => ({
    ...item,
    total_sum: Number(item.total_sum) || 0,
    items_count: Number(item.items_count) || 0,
  })),
  summary: {
    total_sum: Number(data.summary?.total_sum) || 0,
    orders_count: Number(data.summary?.orders_count) || 0,
    items_count: Number(data.summary?.items_count) || 0,
  },
});

const loadReport = async (keepPreset = false) => {
  if (!dateFrom.value || !dateTo.value) return;

  if (!keepPreset) {
    activePreset.value = null;
  }

  try {
    loading.value = true;
    const data = await getElectronAPI().reports.getRevenueByCategory({
      date_from: dateFrom.value,
      date_to: dateTo.value,
    });
    report.value = normalizeReport(data);
  } catch (error) {
    errorHandler(error, 'Не удалось загрузить отчет');
  } finally {
    loading.value = false;
  }
};

const applyPreset = (preset: Preset) => {
  const now = new Date();
  const start = new Date(now);

  if (preset === 'week') {
    start.setDate(now.getDate() - 6);
  }

  if (preset === 'month') {
    start.setDate(1);
  }

  activePreset.value = preset;
  dateFrom.value = toDateInputValue(start);
  dateTo.value = toDateInputValue(now);
  void loadReport(true);
};

onMounted(() => {
  applyPreset('today');
});
</script>

<style scoped lang="scss">
.reports-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 24px 12px;
  background: #fff;
  border-bottom: 1px solid #eaecf0;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  flex-wrap: wrap;
  justify-content: flex-end;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1d23;
}

.preset-btn {
  background: #fff;
  color: #344054 !important;
  border: 1px solid #eaecf0;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;

  &.active {
    background: #1a1d23;
    color: #fff !important;
    border-color: #1a1d23;
  }
}

.date-input {
  width: 150px;
}

.reports-content {
  padding: 16px 24px;
}

.summary-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 140px 140px;
  gap: 12px;
  margin-bottom: 16px;
}

.summary-item {
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 8px;
  padding: 14px 16px;
}

.summary-label {
  color: #667085;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
}

.summary-value {
  margin-top: 6px;
  color: #1a1d23;
  font-size: 26px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;

  &.small {
    font-size: 22px;
  }
}

.table-wrap {
  background: #fff;
  border: 1px solid #eaecf0;
  border-radius: 8px;
  overflow: hidden;
}

.table-header,
.table-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 120px 180px;
  align-items: center;
}

.table-header {
  padding: 10px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #eaecf0;
  color: #667085;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
}

.table-row {
  min-height: 48px;
  padding: 0 16px;
  border-bottom: 1px solid #f2f4f7;

  &:last-child {
    border-bottom: none;
  }
}

.col-category {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: #1a1d23;
  font-size: 14px;
  font-weight: 500;
}

.row-icon {
  color: #98a2b3;
}

.col-count {
  color: #667085;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.col-sum {
  color: #1a1d23;
  font-size: 14px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  gap: 12px;
}

.empty-icon {
  color: #d0d5dd;
}

.empty-text {
  color: #98a2b3;
  font-size: 14px;
}

@media (max-width: 760px) {
  .page-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .toolbar-right {
    justify-content: flex-start;
  }

  .summary-row {
    grid-template-columns: 1fr;
  }

  .table-header,
  .table-row {
    grid-template-columns: minmax(160px, 1fr) 80px 140px;
  }
}
</style>
