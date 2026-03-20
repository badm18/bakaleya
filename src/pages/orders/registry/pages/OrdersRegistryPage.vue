<template>
  <q-page class="orders-page">
    <!-- Toolbar -->
    <div class="page-toolbar">
      <div class="toolbar-left">
        <span class="page-title">Заявки</span>
        <span class="orders-count" v-if="!ordersStore.loading">{{ ordersStore.totalCount }}</span>
      </div>
      <div class="toolbar-right">
        <q-btn
          flat
          dense
          icon="add"
          label="Новая заявка"
          class="add-btn"
          :to="{ name: 'order-new' }"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      <div class="table-header">
        <div class="col-id">№</div>
        <div class="col-date">Дата</div>
        <div class="col-customer">Клиент</div>
        <div class="col-sum">Сумма</div>
        <div class="col-actions"></div>
      </div>

      <!-- Список -->
      <div class="scroll-container" ref="scrollContainerRef" @scroll="onScroll">
        <template v-if="!ordersStore.loading">
          <div
            v-for="item in ordersStore.items"
            :key="item.id"
            class="table-row"
            @dblclick="openOrder(item.id)"
          >
            <div class="col-id"># {{ item.id }}</div>
            <div class="col-date">{{ formatDate(item.created_at) }}</div>
            <div class="col-customer">
              <q-icon name="person" size="14px" class="row-icon" />
              {{ item.customer_name }}
            </div>
            <div class="col-sum">{{ formatPrice(item.total_sum) }} ₽</div>
            <div class="col-actions">
              <q-btn
                flat
                dense
                round
                icon="print"
                size="md"
                class="action-btn print-btn"
                @click.stop="printOrder(item.id)"
              />
              <q-btn
                flat
                dense
                round
                icon="edit"
                size="md"
                class="action-btn edit-btn"
                @click.stop="openOrder(item.id)"
              />
              <q-btn
                flat
                dense
                round
                icon="delete"
                size="md"
                class="action-btn delete-btn"
                @click.stop="confirmDelete(item)"
              />
            </div>
          </div>

          <!-- Загрузка ещё -->
          <div v-if="ordersStore.loadingMore" class="loading-more">
            <q-spinner size="20px" color="grey-5" />
          </div>

          <!-- Пусто -->
          <div v-if="!ordersStore.items.length" class="empty-state">
            <q-icon name="receipt_long" size="48px" class="empty-icon" />
            <div class="empty-text">Заявок пока нет</div>
            <q-btn
              flat
              label="Создать первую заявку"
              class="empty-btn"
              :to="{ name: 'order-new' }"
            />
          </div>
        </template>

        <!-- Скелетон при загрузке -->
        <template v-else>
          <div v-for="i in 10" :key="i" class="table-row skeleton-row">
            <div class="col-id"><q-skeleton type="text" width="40px" /></div>
            <div class="col-date"><q-skeleton type="text" width="80px" /></div>
            <div class="col-customer"><q-skeleton type="text" width="120px" /></div>
            <div class="col-sum"><q-skeleton type="text" width="70px" /></div>
            <div class="col-actions"></div>
          </div>
        </template>
      </div>
    </div>

    <!-- Delete Confirm Dialog -->
    <q-dialog v-model="deleteDialogOpen">
      <q-card class="dialog-card">
        <q-card-section class="dialog-header">
          <div class="dialog-title">Удалить заявку?</div>
        </q-card-section>
        <q-card-section class="dialog-body text-body">
          Заявка <strong>#{{ deletingOrder?.id }}</strong> клиента
          <strong>{{ deletingOrder?.customer_name }}</strong> будет удалена безвозвратно.
        </q-card-section>
        <q-card-actions class="dialog-actions">
          <q-btn flat label="Отмена" @click="deleteDialogOpen = false" class="cancel-btn" />
          <q-btn
            label="Удалить"
            @click="deleteOrder"
            class="delete-confirm-btn"
            :loading="ordersStore.saving"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { formatDate } from 'src/utils/formatDate';
import { ref, onMounted } from 'vue';
import { useOrdersStore } from 'stores/orders-store';
import type { IOrderItem } from 'stores/interfaces/orders-store.interfaces';

const router = useRouter();
const ordersStore = useOrdersStore();

const scrollContainerRef = ref<HTMLElement | null>(null);
const deleteDialogOpen = ref(false);
const deletingOrder = ref<IOrderItem | null>(null);

const formatPrice = (val: number) =>
  val.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const openOrder = (id: number) => {
  void router.push({ name: 'order-edit', params: { id } });
};

const printOrder = (id: number) => {
  // TODO: реализовать печать
  console.log('print', id);
};

const confirmDelete = (order: IOrderItem) => {
  deletingOrder.value = order;
  deleteDialogOpen.value = true;
};

const deleteOrder = async () => {
  if (!deletingOrder.value) return;
  try {
    await ordersStore.deleteOrder(deletingOrder.value.id);
    deleteDialogOpen.value = false;
  } finally {
    deletingOrder.value = null;
  }
};

const onScroll = () => {
  const el = scrollContainerRef.value;
  if (!el) return;
  const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 100;
  if (nearBottom && ordersStore.hasMore && !ordersStore.loadingMore) {
    void ordersStore.loadMore();
  }
};

onMounted(() => {
  void ordersStore.getList();
});
</script>

<style scoped lang="scss">
.orders-page {
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

.orders-count {
  background: #eaecf0;
  color: #667085;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 10px;
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
  grid-template-columns: 70px 140px 1fr 130px 110px;
  padding: 10px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #eaecf0;
  font-size: 12px;
  font-weight: 600;
  color: #667085;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.scroll-container {
  height: calc(100vh - 180px);
  overflow-y: auto;
}

.table-row {
  display: grid;
  grid-template-columns: 70px 140px 1fr 130px 110px;
  padding: 0 16px;
  height: 48px;
  align-items: center;
  border-bottom: 1px solid #f2f4f7;
  transition: background 0.1s;
  cursor: pointer;

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

.col-id {
  font-size: 13px;
  color: #667085;
  font-weight: 500;
}

.col-date {
  font-size: 13px;
  color: #667085;
}

.col-customer {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #1a1d23;
  font-weight: 500;
}

.row-icon {
  color: #98a2b3;
}

.col-sum {
  font-size: 14px;
  font-weight: 600;
  color: #1a1d23;
  font-variant-numeric: tabular-nums;
}

.col-actions {
  display: flex;
  gap: 2px;
  justify-content: flex-end;
}

.action-btn {
  opacity: 0;
  transition: opacity 0.1s;
}

.print-btn {
  color: #667085 !important;
}
.edit-btn {
  color: #667085 !important;
}
.delete-btn {
  color: #f04438 !important;
}

.loading-more {
  display: flex;
  justify-content: center;
  padding: 16px;
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

.skeleton-row {
  pointer-events: none;
}

.dialog-card {
  width: 420px;
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

.delete-confirm-btn {
  background: #f04438 !important;
  color: #fff !important;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 20px;
}
</style>
