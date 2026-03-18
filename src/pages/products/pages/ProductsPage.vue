<template>
  <q-page class="products-page">
    <!-- Toolbar -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <span class="page-title">Номенклатура</span>
        <span class="products-count" v-if="!productsStore.loading">{{
            productsStore.totalCount
          }}</span>
      </div>
      <div class="toolbar-right">
        <div class="search-wrap" :class="{ active: searchActive }">
          <q-input
            ref="searchInputRef"
            :model-value="search"
            dense
            borderless
            placeholder="Поиск товара..."
            class="search-input"
            @update:model-value="
              (val) => {
                search = `${val}`;
                productsStore.search(`${val}`);
              }
            "
            @keydown.escape="clearSearch"
          >
            <template #prepend>
              <q-icon name="search" size="16px" class="search-icon" />
            </template>
            <template #append>
              <q-icon
                v-if="search"
                name="close"
                size="14px"
                class="cursor-pointer clear-icon"
                @click="clearSearch"
              />
            </template>
          </q-input>
        </div>
        <q-btn
          flat
          dense
          icon="add"
          label="Добавить"
          class="add-btn"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <div class="table-header">
        <div class="col-name">Название</div>
        <div class="col-unit">Ед. изм.</div>
        <div class="col-price">Цена закупки</div>
        <div class="col-price">Цена продажи</div>
        <div class="col-kg">Кг в штуке</div>
        <div class="col-actions"></div>
      </div>

      <q-virtual-scroll
        :items="productsStore.items"
        :virtual-scroll-item-size="48"
        v-slot="{ item }"
      >
        <div class="table-row" :key="item.id">
          <!-- Название -->
          <div class="col-name">
            <q-icon name="inventory_2" size="16px" class="row-icon" />
            <span
              class="editable-cell"
              @click="startEdit(item.id, 'name', item.name)"
            >
              <template v-if="editingCell?.id === item.id && editingCell?.field === 'name'">
                <input
                  ref="editInputRef"
                  v-model="editingCell.value"
                  class="inline-input"
                  @blur="saveEdit(item)"
                  @keydown.enter="saveEdit(item)"
                  @keydown.escape="cancelEdit"
                />
              </template>
              <template v-else>{{ item.name }}</template>
            </span>
          </div>

          <!-- Единица измерения -->
          <div class="col-unit">
            <span
              class="editable-cell"
              @click="startEdit(item.id, 'unit', item.unit)"
            >
              <template v-if="editingCell?.id === item.id && editingCell?.field === 'unit'">
                <select
                  ref="editInputRef"
                  v-model="editingCell.value"
                  class="inline-select"
                  @change="saveEdit(item)"
                  @keydown.escape="cancelEdit"
                >
                  <option value="kg">кг</option>
                  <option value="pcs">шт</option>
                </select>
              </template>
              <template v-else>
                <span class="unit-badge" :class="item.unit">
                  {{ UNIT_LABELS[item.unit] }}
                </span>
              </template>
            </span>
          </div>

          <!-- Цена закупки -->
          <div class="col-price">
            <span
              class="editable-cell"
              @click="startEdit(item.id, 'price_buy', item.price_buy ?? '')"
            >
              <template v-if="editingCell?.id === item.id && editingCell?.field === 'price_buy'">
                <input
                  ref="editInputRef"
                  v-model="editingCell.value"
                  type="number"
                  step="0.01"
                  class="inline-input"
                  @blur="saveEdit(item)"
                  @keydown.enter="saveEdit(item)"
                  @keydown.escape="cancelEdit"
                />
              </template>
              <template v-else>
                <span v-if="item.price_buy != null" class="price-value">{{ formatPrice(item.price_buy) }} ₽</span>
                <span v-else class="empty-value">—</span>
              </template>
            </span>
          </div>

          <!-- Цена продажи -->
          <div class="col-price">
            <span
              class="editable-cell"
              @click="startEdit(item.id, 'price_sell', item.price_sell ?? '')"
            >
              <template v-if="editingCell?.id === item.id && editingCell?.field === 'price_sell'">
                <input
                  ref="editInputRef"
                  v-model="editingCell.value"
                  type="number"
                  step="0.01"
                  class="inline-input"
                  @blur="saveEdit(item)"
                  @keydown.enter="saveEdit(item)"
                  @keydown.escape="cancelEdit"
                />
              </template>
              <template v-else>
                <span v-if="item.price_sell != null" class="price-value">{{ formatPrice(item.price_sell) }} ₽</span>
                <span v-else class="empty-value">—</span>
              </template>
            </span>
          </div>

          <!-- Кг в штуке -->
          <div class="col-kg">
            <span
              class="editable-cell"
              @click="item.unit === 'pcs' && startEdit(item.id, 'kg_per_pcs', item.kg_per_pcs ?? '')"
              :class="{ disabled: item.unit !== 'pcs' }"
            >
              <template v-if="editingCell?.id === item.id && editingCell?.field === 'kg_per_pcs'">
                <input
                  ref="editInputRef"
                  v-model="editingCell.value"
                  type="number"
                  step="0.001"
                  class="inline-input"
                  @blur="saveEdit(item)"
                  @keydown.enter="saveEdit(item)"
                  @keydown.escape="cancelEdit"
                />
              </template>
              <template v-else>
                <span v-if="item.unit === 'pcs' && item.kg_per_pcs != null">{{ item.kg_per_pcs }} кг</span>
                <span v-else class="empty-value">—</span>
              </template>
            </span>
          </div>

          <!-- Действия -->
          <div class="col-actions">
            <q-btn
              flat
              dense
              round
              icon="delete"
              size="md"
              class="action-btn delete-btn"
              @click="confirmDelete(item)"
            />
          </div>
        </div>
      </q-virtual-scroll>

      <div v-if="!productsStore.loading && !productsStore.items.length" class="empty-state">
        <q-icon name="inventory_2" size="48px" class="empty-icon" />
        <div class="empty-text">{{ search ? 'Ничего не найдено' : 'Товаров пока нет' }}</div>
        <q-btn
          v-if="!search"
          flat
          label="Добавить первый товар"
          class="empty-btn"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Create Dialog -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">Новый товар</div>
          <q-btn flat dense round icon="close" @click="closeDialog" />
        </q-card-section>

        <q-card-section class="dialog-body">
          <q-input
            v-model="form.name"
            label="Название"
            autofocus
            class="dialog-input"
            :rules="[(val) => !!val || 'Введите название']"
          />

          <q-select
            v-model="form.unit"
            :options="unitOptions"
            emit-value
            map-options
            label="Единица измерения"
            class="dialog-input"
          />

          <div class="price-row">
            <q-input
              v-model.number="form.price_buy"
              label="Цена закупки"
              type="number"
              step="0.01"
              min="0"
              suffix="₽"
              class="dialog-input"
            />
            <q-input
              v-model.number="form.price_sell"
              label="Цена продажи"
              type="number"
              step="0.01"
              min="0"
              suffix="₽"
              class="dialog-input"
            />
          </div>

          <q-input
            v-if="form.unit === 'pcs'"
            v-model.number="form.kg_per_pcs"
            label="Кг в 1 штуке"
            type="number"
            step="0.001"
            suffix="кг"
            class="dialog-input"
            hint="Необязательно"
          />
        </q-card-section>

        <q-card-actions class="dialog-actions">
          <q-btn flat label="Отмена" @click="closeDialog" class="cancel-btn" />
          <q-btn
            label="Сохранить"
            @click="createProduct"
            class="save-btn"
            :loading="productsStore.upsertLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirm Dialog -->
    <q-dialog v-model="deleteDialogOpen">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">Удалить товар?</div>
        </q-card-section>
        <q-card-section class="dialog-body text-body">
          Товар <strong>{{ deletingProduct?.name }}</strong> будет удалён.
          Заявки с этим товаром останутся без изменений.
        </q-card-section>
        <q-card-actions class="dialog-actions">
          <q-btn flat label="Отмена" @click="deleteDialogOpen = false" class="cancel-btn" />
          <q-btn
            label="Удалить"
            @click="deleteProduct"
            class="delete-confirm-btn"
            :loading="productsStore.upsertLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useProductsStore } from 'stores/products-store';

const UNIT_LABELS: Record<string, string> = {
  kg: 'кг',
  pcs: 'шт',
};

const unitOptions = [
  { label: 'кг', value: 'kg' },
  { label: 'шт', value: 'pcs' },
];

interface ProductItem {
  id: number;
  name: string;
  unit: 'kg' | 'pcs';
  price_buy: number | null;
  price_sell: number | null;
  kg_per_pcs: number | null;
  created_at: string;
}

interface EditingCell {
  id: number;
  field: string;
  value: string | number;
}

const productsStore = useProductsStore();

const search = ref('');
const searchActive = ref(false);
const searchInputRef = ref();
const editInputRef = ref();

const dialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const deletingProduct = ref<ProductItem | null>(null);
const editingCell = ref<EditingCell | null>(null);

const form = ref({
  name: '',
  unit: 'kg' as 'kg' | 'pcs',
  price_buy: null as number | null,
  price_sell: null as number | null,
  kg_per_pcs: null as number | null,
});

const openCreateDialog = () => {
  form.value = { name: '', unit: 'kg', price_buy: null, price_sell: null, kg_per_pcs: null };
  dialogOpen.value = true;
};

const closeDialog = () => {
  dialogOpen.value = false;
};

const createProduct = async () => {
  if (!form.value.name.trim()) return;
  try {
    await productsStore.createProduct(form.value);
    closeDialog();
  } catch (e) {
    return e;
  }
};

const startEdit = async (id: number, field: string, value: string | number) => {
  editingCell.value = { id, field, value };
  await nextTick();
  editInputRef.value?.focus();
};

const saveEdit = async (item: ProductItem) => {
  if (!editingCell.value) return;

  const { field, value } = editingCell.value;
  const updated = { ...item, [field]: value === '' ? null : value };

  // Если сменили единицу на kg — сбрасываем kg_per_pcs
  if (field === 'unit' && value === 'kg') {
    updated.kg_per_pcs = null;
  }

  editingCell.value = null;
  await productsStore.updateProduct(item.id, updated);
};
const cancelEdit = () => {
  editingCell.value = null;
};

const confirmDelete = (product: ProductItem) => {
  deletingProduct.value = product;
  deleteDialogOpen.value = true;
};

const deleteProduct = async () => {
  if (!deletingProduct.value) return;
  try {
    await productsStore.deleteProduct(deletingProduct.value.id);
    deleteDialogOpen.value = false;
  } finally {
    deletingProduct.value = null;
  }
};

const clearSearch = () => {
  search.value = '';
  searchActive.value = false;
  void productsStore.getList();
};

const formatPrice = (val: number) =>
  val.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.code === 'KeyF') {
    e.preventDefault();
    searchActive.value = true;
    searchInputRef.value?.focus();
  }
  if (e.code === 'Escape') {
    if (editingCell.value) {
      cancelEdit();
    } else if (search.value) {
      clearSearch();
    }
  }
};

onMounted(() => {
  void productsStore.getList();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped lang="scss">
.products-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.page-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px 12px;
  background: #fff;
  border-bottom: 1px solid #eaecf0;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.page-title {
  font-size: 18px;
  font-weight: 600;
  color: #1a1d23;
  letter-spacing: -0.3px;
}

.products-count {
  background: #eaecf0;
  color: #667085;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.search-wrap {
  border: 1px solid #eaecf0;
  border-radius: 8px;
  padding: 0 8px;
  background: #f7f8fa;
  transition: all 0.15s ease;
  width: 300px;

  &.active,
  &:focus-within {
    border-color: #4a6cf7;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(74, 108, 247, 0.1);
  }
}

.search-icon { color: #98a2b3; }
.clear-icon {
  color: #98a2b3;
  &:hover { color: #667085; }
}

.add-btn {
  background: #1a1d23;
  color: #fff !important;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  &:hover { background: #2d3139; }
}

.table-wrap {
  margin: 16px 24px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid #eaecf0;
  overflow: hidden;
}

.table-header {
  display: grid;
  grid-template-columns: 1fr 80px 130px 130px 110px 48px;
  padding: 10px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #eaecf0;
  font-size: 12px;
  font-weight: 600;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.table-row {
  display: grid;
  grid-template-columns: 1fr 80px 130px 130px 110px 48px;
  padding: 0 16px;
  height: 48px;
  align-items: center;
  border-bottom: 1px solid #f2f4f7;
  transition: background 0.1s;

  &:hover {
    background: #f9fafb;
    .action-btn { opacity: 1; }
  }

  &:last-child { border-bottom: none; }
}

.col-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1a1d23;
  font-weight: 500;
  min-width: 0;
}

.row-icon {
  color: #98a2b3;
  flex-shrink: 0;
}

.col-unit,
.col-price,
.col-kg {
  font-size: 13px;
  color: #344054;
}

.col-actions {
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  opacity: 0;
  transition: opacity 0.1s;
}

.delete-btn { color: #f04438 !important; }

.editable-cell {
  display: flex;
  align-items: center;
  width: 100%;
  min-height: 28px;
  padding: 2px 6px;
  border-radius: 6px;
  cursor: text;
  transition: background 0.1s;

  &:hover {
    background: #eaecf0;
  }

  &.disabled {
    cursor: default;
    &:hover { background: transparent; }
  }
}

.inline-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #1a1d23;
  font-family: inherit;
  padding: 0;
}

.inline-select {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: #1a1d23;
  font-family: inherit;
  cursor: pointer;
}

.unit-badge {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;

  &.kg {
    background: #e8f5e9;
    color: #2e7d32;
  }

  &.pcs {
    background: #e3f2fd;
    color: #1565c0;
  }
}

.price-value {
  font-variant-numeric: tabular-nums;
}

.empty-value {
  color: #d0d5dd;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  gap: 12px;
}

.empty-icon { color: #d0d5dd; }
.empty-text { font-size: 14px; color: #98a2b3; }
.empty-btn { color: #4a6cf7 !important; font-size: 13px; }

.dialog-card {
  width: 440px;
  border-radius: 12px !important;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 16px;
  border-bottom: 1px solid #eaecf0;
}

.dialog-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1d23;
}

.dialog-body {
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;

  &.text-body {
    font-size: 14px;
    color: #344054;
    line-height: 1.6;
  }
}

.price-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.dialog-input {
  :deep(.q-field__label) {
    color: #667085;
    font-size: 13px;
  }
}

.dialog-actions {
  padding: 0 20px 20px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.cancel-btn { color: #667085 !important; font-size: 13px; }

.save-btn {
  background: #1a1d23 !important;
  color: #fff !important;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 20px;
}

.delete-confirm-btn {
  background: #f04438 !important;
  color: #fff !important;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 20px;
}
</style>
