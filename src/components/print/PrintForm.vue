<template>
  <div class="print-form" ref="printRef">
    <!-- Шапка -->
    <div class="doc-header">
      <div class="doc-title">
        Расходная накладная № {{ order.id }} от {{ formatDate(order.created_at) }}
      </div>
      <div class="doc-parties">
        <div class="party-row">
          <span class="party-label">Поставщик:</span>
          <span class="party-value">{{ order.organization_name }}</span>
        </div>
        <div class="party-row">
          <span class="party-label">Покупатель:</span>
          <span class="party-value">{{ order.customer_name }}</span>
        </div>
      </div>
    </div>

    <!-- Таблица -->
    <table class="doc-table">
      <thead>
        <tr>
          <th class="th-num">№</th>
          <th class="th-name">Наименование</th>
          <th class="th-qty">Количество</th>
          <th class="th-unit">Ед. изм.</th>
          <th class="th-price">Цена</th>
          <th class="th-total">Сумма</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="item.id">
          <td class="td-num">{{ index + 1 }}</td>
          <td class="td-name">{{ item.product_name }}</td>
          <td class="td-qty">{{ formatQty(item.quantity, item.unit) }}</td>
          <td class="td-unit">{{ UNIT_LABELS[item.unit] }}</td>
          <td class="td-price">{{ formatPrice(item.price_sell) }}</td>
          <td class="td-total">{{ formatPrice(item.total) }}</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td colspan="5" class="tf-label">Итого:</td>
          <td class="tf-total">{{ formatPrice(totalSum) }}</td>
        </tr>
      </tfoot>
    </table>

    <!-- Итого прописью -->
    <div class="doc-total-text">
      Итого наименований {{ items.length }}, на сумму {{ formatPrice(totalSum) }} руб.
    </div>

    <!-- Подписи -->
    <div class="doc-signatures">
      <div class="signature-row">
        <div class="signature-block">
          <span class="signature-label">Отпустил:</span>
          <span class="signature-line"></span>
          <span class="signature-hint">(подпись)</span>
        </div>
        <div class="signature-block">
          <span class="signature-label">Получил:</span>
          <span class="signature-line"></span>
          <span class="signature-hint">(подпись)</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { IOrderItem, IDetailItem } from 'stores/interfaces/orders-store.interfaces';

const UNIT_LABELS: Record<string, string> = { kg: 'кг', pcs: 'шт' };

const props = defineProps<{
  order: IOrderItem;
  items: IDetailItem[];
}>();

const totalSum = computed(() => props.items.reduce((sum, item) => sum + item.total, 0));

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('ru-RU');
};

const formatPrice = (val: number) =>
  val.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatQty = (qty: number, unit: string) => {
  if (unit === 'kg') {
    return qty.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }
  return qty.toString();
};
</script>

<style scoped lang="scss">
.print-form {
  font-family: 'Times New Roman', Times, serif;
  font-size: 10pt;
  color: #000;
  max-width: 210mm;
  margin: 0 auto;
}

.doc-header {
  margin-bottom: 4mm;
}

.doc-title {
  font-size: 13pt;
  font-weight: bold;
  text-align: center;
  margin-bottom: 3mm;
}

.doc-parties {
  display: flex;
  flex-direction: column;
  gap: 1mm;
}

.party-row {
  display: flex;
  gap: 4mm;
  align-items: baseline;
}

.party-label {
  font-weight: bold;
  white-space: nowrap;
  min-width: 90px;
}

.party-value {
  border-bottom: 1px solid #000;
  flex: 1;
  min-width: 100px;
}

.doc-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed; // добавь

  th,
  td {
    border: 1px solid #000;
    line-height: 1.4;
    font-size: 10pt;
  }

  td {
    padding: 0 2mm;
    font-size: 11pt;
  }

  th {
    font-weight: bold;
    text-align: center;
  }
}

.th-num,
.td-num {
  width: 8mm;
  text-align: center;
}
.th-unit,
.td-unit {
  width: 16mm;
  text-align: center;
}
.th-qty,
.td-qty {
  width: 24mm;
  text-align: center;
}
.th-price,
.td-price {
  width: 28mm;
  text-align: right;
}
.th-total,
.td-total {
  width: 28mm;
  text-align: right;
}
.th-name,
.td-name {
  text-align: left;
}

tfoot td {
  font-weight: bold;
}

.tf-label {
  text-align: right;
  border-right: none;
}

.tf-total {
  text-align: right;
}

.doc-total-text {
  font-size: 10pt;
}

.doc-signatures {
  margin-top: 3mm;
}

.signature-row {
  display: flex;
  justify-content: space-between;
  gap: 20mm;
}

.signature-block {
  display: flex;
  align-items: baseline;
  gap: 3mm;
  flex: 1;
}

.signature-label {
  font-weight: bold;
  white-space: nowrap;
}

.signature-line {
  flex: 1;
  border-bottom: 1px solid #000;
  min-width: 40mm;
}

.signature-hint {
  font-size: 9pt;
  color: #666;
  white-space: nowrap;
}

@media print {
  .print-form {
    padding: 0;
  }
}
</style>
