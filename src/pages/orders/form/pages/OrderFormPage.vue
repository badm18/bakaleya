<template>
  <q-page class="order-page">
    <!-- Шапка -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <q-btn flat dense round icon="arrow_back" @click="router.push({ name: 'orders' })" />
        <span class="page-title">{{ isEdit ? 'Редактирование заявки' : 'Новая заявка' }}</span>
      </div>
      <div class="toolbar-right">
        <q-btn flat label="Отмена" class="cancel-btn" @click="router.push({ name: 'orders' })" />
        <q-btn
          label="Сохранить"
          class="save-btn"
          :loading="ordersStore.saving"
          @click="saveOrder"
        />
      </div>
    </div>

    <div class="order-content">
      <!-- Реквизиты -->
      <div class="requisites-card">
        <div class="requisites-row">
          <!-- Организация -->
          <div class="field-group">
            <div class="field-label">Организация</div>
            <q-select
              v-model="form.organization_name"
              :options="ORGANIZATIONS"
              dense
              outlined
              class="field-input"
            />
          </div>

          <!-- Клиент -->
          <div class="field-group">
            <div class="field-label">Клиент</div>
            <q-select
              v-model="selectedCustomer"
              :options="customerOptions"
              option-label="name"
              option-value="id"
              dense
              outlined
              use-input
              input-debounce="200"
              placeholder="Поиск клиента..."
              class="field-input"
              @filter="filterCustomers"
              @update:model-value="onCustomerSelect"
            >
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">Ничего не найдено</q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <!-- Дата -->
          <div class="field-group">
            <div class="field-label">Дата</div>
            <div class="field-date">{{ formatDate(new Date().toISOString()) }}</div>
          </div>
        </div>
      </div>

      <!-- Таблица позиций -->
      <div class="items-card">
        <div class="table-header">
          <div class="col-drag"></div>
          <div class="col-num">#</div>
          <div class="col-name">Товар</div>
          <div class="col-unit">Ед.</div>
          <div class="col-price">Цена</div>
          <div class="col-qty">Кол-во</div>
          <div class="col-total">Сумма</div>
          <div class="col-actions"></div>
        </div>

        <draggable
          v-model="form.items"
          item-key="uid"
          handle=".drag-handle"
          @end="onDragEnd"
          ghost-class="drag-ghost"
        >
          <template #item="{ element, index }">
            <div class="table-row">
              <div class="col-drag">
                <q-icon name="drag_indicator" class="drag-handle" />
              </div>
              <div class="col-num">{{ index + 1 }}</div>
              <div class="col-name">{{ element.product_name }}</div>
              <div class="col-unit">
                <span class="unit-badge" :class="element.unit">
                  {{ UNIT_LABELS[element.unit] }}
                </span>
              </div>
              <div class="col-price">
                <input
                  v-model.number="element.price_sell"
                  type="number"
                  step="0.01"
                  min="0"
                  class="qty-input price-input"
                  @input="recalcTotal(element)"
                />
              </div>
              <div class="col-qty">
                <input
                  :ref="(el) => setQtyRef(el, index)"
                  v-model.number="element.quantity"
                  type="number"
                  :step="element.unit === 'kg' ? '0.001' : '1'"
                  :min="element.unit === 'kg' ? '0.001' : '1'"
                  class="qty-input"
                  @input="recalcTotal(element)"
                  @keydown.enter="focusProductSearch"
                  @keydown.tab="focusProductSearch"
                />
              </div>
              <div class="col-total">{{ formatPrice(element.total) }} ₽</div>
              <div class="col-actions">
                <q-btn
                  flat
                  dense
                  round
                  icon="delete"
                  size="sm"
                  class="delete-row-btn"
                  @click="removeItem(index)"
                />
              </div>
            </div>
          </template>
        </draggable>

        <!-- Строка добавления товара -->
        <div class="add-product-row">
          <div class="col-drag"></div>
          <div class="col-num"></div>
          <div class="col-name add-product-col">
            <q-select
              ref="productSearchRef"
              v-model="productSearchValue"
              :options="productOptions"
              option-label="name"
              option-value="id"
              dense
              borderless
              use-input
              input-debounce="150"
              placeholder="Добавить товар..."
              class="product-search"
              @filter="filterProducts"
              @update:model-value="onProductSelect"
            >
              <template #option="{ itemProps, opt }">
                <q-item v-bind="itemProps">
                  <q-item-section>
                    <q-item-label>{{ opt.name }}</q-item-label>
                    <q-item-label caption>
                      {{ UNIT_LABELS[opt.unit] }}
                      <span v-if="opt.price_sell"> · {{ formatPrice(opt.price_sell) }} ₽</span>
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
              <template #no-option>
                <q-item>
                  <q-item-section class="text-grey">Ничего не найдено</q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>
          <div class="col-unit"></div>
          <div class="col-price"></div>
          <div class="col-qty"></div>
          <div class="col-total"></div>
          <div class="col-actions"></div>
        </div>

        <!-- Итого -->
        <div class="total-row">
          <div class="total-label">Итого:</div>
          <div class="total-value">{{ formatPrice(totalSum) }} ₽</div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue';
import { Dialog, Notify } from 'quasar';
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router';
import draggable from 'vuedraggable';
import { formatDate } from 'src/utils/formatDate';
import { useOrdersStore } from 'src/stores/orders-store';
import type { IOrderItemPayload } from 'src/stores/orders-store';
import { ORGANIZATIONS } from 'src/const/organizations';

const UNIT_LABELS: Record<string, string> = { kg: 'кг', pcs: 'шт' };

interface CustomerOption {
  id: number;
  name: string;
}

interface ProductOption {
  id: number;
  name: string;
  unit: 'kg' | 'pcs';
  price_sell: number | null;
  kg_per_pcs: number | null;
}

interface OrderItemForm extends IOrderItemPayload {
  uid: string;
}

const router = useRouter();
const route = useRoute();
const ordersStore = useOrdersStore();

const isEdit = computed(() => !!route.params.id);

const form = ref({
  organization_name: ORGANIZATIONS[0] as string,
  customer_id: null as number | null,
  customer_name: '',
  items: [] as OrderItemForm[],
});

const selectedCustomer = ref<CustomerOption | null>(null);
const customerOptions = ref<CustomerOption[]>([]);
const allCustomers = ref<CustomerOption[]>([]);

const productSearchRef = ref();
const productSearchValue = ref(null);
const productOptions = ref<ProductOption[]>([]);
const allProducts = ref<ProductOption[]>([]);

const qtyRefs = ref<Record<number, HTMLInputElement>>({});
const isDirty = ref(false);
const isLoaded = ref(false);

watch(
  () => form.value,
  () => {
    if (isLoaded.value) {
      isDirty.value = true;
    }
  },
  { deep: true },
);

onBeforeRouteLeave((_to, _from, next) => {
  if (!isDirty.value || ordersStore.saving) {
    next();
    return;
  }

  Dialog.create({
    title: 'Несохранённые изменения',
    message: 'Вы уверены, что хотите покинуть страницу? Все изменения будут потеряны.',
    cancel: { label: 'Остаться', flat: true, color: 'grey' },
    ok: { label: 'Покинуть', color: 'negative' },
    persistent: true,
  })
    .onOk(() => {
      next();
    })
    .onCancel(() => {
      next(false);
    });
});

const setQtyRef = (el: unknown, index: number) => {
  if (el) qtyRefs.value[index] = el as HTMLInputElement;
};

const totalSum = computed(() => form.value.items.reduce((sum, item) => sum + item.total, 0));

onMounted(async () => {
  const [customersData, productsData] = await Promise.all([
    window.electronAPI.customers.getAll(),
    window.electronAPI.products.getAll(),
  ]);

  allCustomers.value = customersData.items;
  customerOptions.value = customersData.items;
  allProducts.value = productsData.items;
  productOptions.value = productsData.items;

  if (isEdit.value) {
    await loadOrder();
  }

  await nextTick();
  isLoaded.value = true;
});;

onUnmounted(() => {
  ordersStore.clearCurrentOrder();
});

async function loadOrder() {
  await ordersStore.getById(Number(route.params.id));
  const data = ordersStore.currentOrder;
  if (!data) return;

  form.value.organization_name = data.order.organization_name;
  form.value.customer_id = data.order.customer_id;
  form.value.customer_name = data.order.customer_name;

  selectedCustomer.value = allCustomers.value.find((c) => c.id === data.order.customer_id) ?? {
    id: data.order.customer_id ?? 0,
    name: data.order.customer_name,
  };

  form.value.items = data.items.map((item) => ({
    ...item,
    uid: crypto.randomUUID(),
  }));
}

function filterCustomers(val: string, update: (fn: () => void) => void) {
  update(() => {
    if (!val) {
      customerOptions.value = allCustomers.value;
    } else {
      const q = val.toLowerCase();
      customerOptions.value = allCustomers.value.filter((c) => c.name.toLowerCase().includes(q));
    }
  });
}

function onCustomerSelect(customer: CustomerOption | null) {
  if (!customer) return;
  form.value.customer_id = customer.id;
  form.value.customer_name = customer.name;
}

function filterProducts(val: string, update: (fn: () => void) => void) {
  update(() => {
    if (!val) {
      productOptions.value = allProducts.value;
    } else {
      const q = val.toLowerCase();
      productOptions.value = allProducts.value.filter((p) => p.name.toLowerCase().includes(q));
    }
  });
}

async function onProductSelect(product: ProductOption | null) {
  if (!product) return;

  const newItem: OrderItemForm = {
    uid: crypto.randomUUID(),
    serial_number: form.value.items.length + 1,
    product_id: product.id,
    product_name: product.name,
    unit: product.unit,
    price_sell: product.price_sell ?? 0,
    quantity: 1,
    total: product.price_sell ?? 0,
  };

  form.value.items.push(newItem);
  productSearchValue.value = null;

  await nextTick();
  const lastIndex = form.value.items.length - 1;
  qtyRefs.value[lastIndex]?.focus();
  qtyRefs.value[lastIndex]?.select();
}

function focusProductSearch() {
  productSearchRef.value?.focus();
}

function recalcTotal(item: OrderItemForm) {
  item.total = Math.round(item.price_sell * item.quantity * 100) / 100;
}

function removeItem(index: number) {
  form.value.items.splice(index, 1);
  renumberItems();
}

function onDragEnd() {
  renumberItems();
}

function renumberItems() {
  form.value.items.forEach((item, index) => {
    item.serial_number = index + 1;
  });
}

const formatPrice = (val: number) =>
  val.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

async function saveOrder() {
  if (!form.value.customer_name) {
    Notify.create({ type: 'warning', message: 'Выберите клиента', timeout: 2000 });
    return;
  }
  if (form.value.items.length === 0) {
    Notify.create({ type: 'warning', message: 'Добавьте хотя бы один товар', timeout: 2000 });
    return;
  }

  const orderPayload = {
    organization_name: form.value.organization_name,
    customer_id: form.value.customer_id,
    customer_name: form.value.customer_name,
  };

  // Убираем uid — он только для vue key, в БД не нужен
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const itemsPayload = form.value.items.map(({ uid, ...item }) => item);

  try {
    if (isEdit.value) {
      await ordersStore.updateOrder(Number(route.params.id), orderPayload, itemsPayload);
    } else {
      await ordersStore.createOrder(orderPayload, itemsPayload);
    }

    isDirty.value = false;
    await router.push({ name: 'orders' });
  } catch {
    // ошибка уже обработана в store через errorHandler
  }
}
</script>

<style scoped lang="scss">
.order-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: #fff;
  border-bottom: 1px solid #eaecf0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1d23;
  letter-spacing: -0.3px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cancel-btn {
  color: #667085 !important;
  font-size: 13px;
}

.save-btn {
  background: #1a1d23 !important;
  color: #fff !important;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 20px;
}

.order-content {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.requisites-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #eaecf0;
  padding: 16px 20px;
}

.requisites-row {
  display: grid;
  grid-template-columns: 1fr 1fr auto;
  gap: 16px;
  align-items: end;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field-label {
  font-size: 12px;
  font-weight: 500;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.field-input {
  :deep(.q-field__control) {
    border-radius: 8px;
  }
}

.field-date {
  font-size: 14px;
  color: #344054;
  padding: 8px 0;
  white-space: nowrap;
}

.items-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #eaecf0;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 32px 40px 1fr 60px 110px 100px 110px 40px;
  padding: 10px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #eaecf0;
  font-size: 11px;
  font-weight: 600;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row {
  display: grid;
  grid-template-columns: 32px 40px 1fr 60px 110px 100px 110px 40px;
  padding: 0 16px;
  height: 48px;
  align-items: center;
  border-bottom: 1px solid #f2f4f7;
  transition: background 0.1s;

  &:hover {
    background: #f9fafb;
    .delete-row-btn {
      opacity: 1;
    }
  }
}

.drag-ghost {
  opacity: 0.4;
  background: #e8f0fe;
}

.drag-handle {
  color: #c1c9d2;
  cursor: grab;
  font-size: 18px;

  &:active {
    cursor: grabbing;
  }
  &:hover {
    color: #667085;
  }
}

.col-num {
  font-size: 12px;
  color: #98a2b3;
  text-align: center;
}

.col-name {
  font-size: 14px;
  color: #1a1d23;
  font-weight: 500;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-unit {
  font-size: 13px;
}

.col-price {
  font-size: 13px;
  color: #667085;
  font-variant-numeric: tabular-nums;
}

.col-total {
  font-size: 14px;
  font-weight: 600;
  color: #1a1d23;
  font-variant-numeric: tabular-nums;
}

.col-actions {
  display: flex;
  justify-content: flex-end;
}

.delete-row-btn {
  opacity: 0;
  color: #f04438 !important;
  transition: opacity 0.1s;
}

.unit-badge {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 6px;
  border-radius: 8px;

  &.kg {
    background: #e8f5e9;
    color: #2e7d32;
  }
  &.pcs {
    background: #e3f2fd;
    color: #1565c0;
  }
}

.qty-input {
  width: 80px;
  border: 1px solid #eaecf0;
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 14px;
  color: #1a1d23;
  font-family: inherit;
  text-align: right;
  outline: none;
  transition: border-color 0.1s;

  &:focus {
    border-color: #4a6cf7;
    box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
  }
}

.add-product-row {
  display: grid;
  grid-template-columns: 32px 40px 1fr 60px 110px 100px 110px 40px;
  padding: 0 16px;
  height: 48px;
  align-items: center;
  border-bottom: 1px solid #f2f4f7;
  background: #fafbff;
}

.add-product-col {
  overflow: visible;
}

.price-input {
  width: 100px;
}

.product-search {
  width: 100%;
  :deep(.q-field__control) {
    padding: 0;
  }
  :deep(input::placeholder) {
    color: #98a2b3;
    font-size: 13px;
  }
}

.total-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  padding: 14px 20px;
  border-top: 2px solid #eaecf0;
  background: #f9fafb;
}

.total-label {
  font-size: 13px;
  font-weight: 600;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.total-value {
  font-size: 20px;
  font-weight: 700;
  color: #1a1d23;
  font-variant-numeric: tabular-nums;
  min-width: 140px;
  text-align: right;
}
</style>
