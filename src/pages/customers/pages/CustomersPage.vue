<template>
  <q-page class="customers-page">
    <!-- Toolbar -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <span class="page-title">Клиенты</span>
        <span class="customers-count" v-if="!customersStore.loading">{{
          customersStore.totalCount
        }}</span>
      </div>
      <div class="toolbar-right">
        <div class="search-wrap" :class="{ active: searchActive }">
          <q-input
            ref="searchInputRef"
            :model-value="search"
            dense
            borderless
            placeholder="Поиск клиента..."
            class="search-input"
            @update:model-value="
              (val) => {
                search = `${val}`;
                customersStore.search(`${val}`);
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
          icon="person_add"
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
        <div class="col-date">Добавлен</div>
        <div class="col-actions"></div>
      </div>

      <q-virtual-scroll
        :items="customersStore.items"
        :virtual-scroll-item-size="48"
        v-slot="{ item }"
      >
        <div class="table-row" :key="item.id">
          <div class="col-name">
            <q-icon name="person" size="16px" class="row-icon" />
            {{ item.name }}
          </div>
          <div class="col-date">{{ formatDate(item.created_at) }}</div>
          <div class="col-actions">
            <q-btn
              flat
              dense
              round
              icon="edit"
              size="md"
              class="action-btn edit-btn"
              @click="openEditDialog(item)"
            />
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

      <div v-if="!customersStore.loading && !customersStore.items.length" class="empty-state">
        <q-icon name="people" size="48px" class="empty-icon" />
        <div class="empty-text">{{ search ? 'Ничего не найдено' : 'Клиентов пока нет' }}</div>
        <q-btn
          v-if="!search"
          flat
          label="Добавить первого клиента"
          class="empty-btn"
          @click="openCreateDialog"
        />
      </div>
    </div>

    <!-- Create/Edit Dialog -->
    <q-dialog v-model="dialogOpen" persistent>
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">
            {{ editingCustomer ? 'Редактировать клиента' : 'Новый клиент' }}
          </div>
          <q-btn flat dense round icon="close" @click="closeDialog" />
        </q-card-section>

        <q-card-section class="dialog-body">
          <q-input
            v-model="form.name"
            label="Название клиента"
            autofocus
            class="dialog-input"
            :rules="[(val) => !!val || 'Введите название']"
            @keydown.enter="upsertCustomer"
          />
        </q-card-section>

        <q-card-actions class="dialog-actions">
          <q-btn flat label="Отмена" @click="closeDialog" class="cancel-btn" />
          <q-btn
            label="Сохранить"
            @click="upsertCustomer"
            class="save-btn"
            :loading="customersStore.upsertLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <!-- Delete Confirm Dialog -->
    <q-dialog v-model="deleteDialogOpen">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">Удалить клиента?</div>
        </q-card-section>
        <q-card-section class="dialog-body text-body">
          Клиент <strong>{{ deletingCustomer?.name }}</strong> будет удалён. Заявки с этим клиентом
          останутся без изменений.
        </q-card-section>
        <q-card-actions class="dialog-actions">
          <q-btn flat label="Отмена" @click="deleteDialogOpen = false" class="cancel-btn" />
          <q-btn
            label="Удалить"
            @click="deleteCustomer"
            class="delete-confirm-btn"
            :loading="customersStore.upsertLoading"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { formatDate } from 'src/utils/formatDate';
import { ref, onMounted, onUnmounted } from 'vue';
import { useCustomersStore } from 'stores/customers-store';
import type { ICustomerItem } from 'stores/interfaces/customers-store.interfaces';

const customersStore = useCustomersStore();

const search = ref('');
const searchActive = ref(false);
const searchInputRef = ref();

const dialogOpen = ref(false);
const deleteDialogOpen = ref(false);
const editingCustomer = ref<ICustomerItem | null>(null);
const deletingCustomer = ref<ICustomerItem | null>(null);

const form = ref({ name: '' });

const openCreateDialog = () => {
  editingCustomer.value = null;
  form.value = { name: '' };
  dialogOpen.value = true;
};

const openEditDialog = (customer: ICustomerItem) => {
  editingCustomer.value = customer;
  form.value = { name: customer.name };
  dialogOpen.value = true;
};

const closeDialog = () => {
  dialogOpen.value = false;
  editingCustomer.value = null;
  form.value = { name: '' };
};

const upsertCustomer = async () => {
  try {
    if (editingCustomer.value) {
      await customersStore.editCustomer(form.value.name, editingCustomer.value.id);
    } else {
      await customersStore.saveCustomer(form.value.name);
    }

    if (form.value.name) {
      closeDialog();
    }
  } catch (e) {
    return e;
  }
};

const confirmDelete = (customer: ICustomerItem) => {
  deletingCustomer.value = customer;
  deleteDialogOpen.value = true;
};

const deleteCustomer = async () => {
  if (!deletingCustomer.value) {
    return;
  }
  try {
    await customersStore.deleteCustomer(deletingCustomer.value.id);
    deleteDialogOpen.value = false;
  } finally {
    deletingCustomer.value = null;
  }
};

const clearSearch = () => {
  search.value = '';
  searchActive.value = false;
  void customersStore.getList();
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.code === 'KeyF') {
    e.preventDefault();
    searchActive.value = true;
    searchInputRef.value?.focus();
  }

  /** Сброс фильтра на esc */
  if (e.code === 'Escape' && search.value) {
    clearSearch();
  }
};

onMounted(() => {
  void customersStore.getList();
  window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped lang="scss">
.customers-page {
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

.customers-count {
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

.search-icon {
  color: #98a2b3;
}

.clear-icon {
  color: #98a2b3;
  &:hover {
    color: #667085;
  }
}

.add-btn {
  background: #1a1d23;
  color: #fff !important;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;

  &:hover {
    background: #2d3139;
  }
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
  grid-template-columns: 1fr 140px 80px;
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
  grid-template-columns: 1fr 140px 80px;
  padding: 0 16px;
  height: 48px;
  align-items: center;
  border-bottom: 1px solid #f2f4f7;
  transition: background 0.1s;

  &:hover {
    background: #f9fafb;

    .action-btn {
      opacity: 1;
    }
  }

  &:last-child {
    border-bottom: none;
  }
}

.col-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #1a1d23;
  font-weight: 500;
}

.row-icon {
  color: #98a2b3;
  flex-shrink: 0;
}

.col-date {
  font-size: 13px;
  color: #667085;
}

.col-actions {
  display: flex;
  gap: 4px;
  justify-content: flex-end;
}

.action-btn {
  opacity: 0;
  transition: opacity 0.1s;
}

.edit-btn {
  color: #667085 !important;
}
.delete-btn {
  color: #f04438 !important;
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
  font-size: 14px;
  color: #98a2b3;
}

.empty-btn {
  color: #4a6cf7 !important;
  font-size: 13px;
}

.dialog-card {
  width: 400px;
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

  &.text-body {
    font-size: 14px;
    color: #344054;
    line-height: 1.6;
  }
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

.delete-confirm-btn {
  background: #f04438 !important;
  color: #fff !important;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 20px;
}
</style>
