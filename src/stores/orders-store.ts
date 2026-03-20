import { defineStore } from 'pinia';
import { Notify } from 'quasar';
import { errorHandler } from 'src/utils/errorHandler';
import type {
  IDetailItem,
  IOrderDetail,
  IOrderItem,
  IOrderPayload,
} from 'stores/interfaces/orders-store.interfaces';


export type IOrderItemPayload = Omit<IDetailItem, 'id' | 'order_id'>;

const LIMIT = 50;

export const useOrdersStore = defineStore('orders', {
  state: () => ({
    items: [] as IOrderItem[],
    totalCount: 0,
    loading: false,
    loadingMore: false,
    saving: false,
    currentOrder: null as IOrderDetail | null,
    currentOrderLoading: false,
  }),

  getters: {
    hasMore: (state) => state.items.length < state.totalCount,
  },

  actions: {
    /** Загрузка первой страницы */
    async getList() {
      try {
        this.loading = true;
        const data = await window.electronAPI.orders.getList(0, LIMIT);
        this.items = data.items;
        this.totalCount = data.total;
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /** Догрузка при скролле */
    async loadMore() {
      if (this.loadingMore || !this.hasMore) return;
      try {
        this.loadingMore = true;
        const data = await window.electronAPI.orders.getList(this.items.length, LIMIT);
        this.items.push(...data.items);
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.loadingMore = false;
      }
    },

    /** Загрузка одной заявки для редактирования */
    async getById(id: number) {
      try {
        this.currentOrderLoading = true;

        this.currentOrder = await window.electronAPI.orders.getById(id);
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.currentOrderLoading = false;
      }
    },

    /** Создание */
    async createOrder(order: IOrderPayload, items: IOrderItemPayload[]) {
      try {
        this.saving = true;
        await window.electronAPI.orders.create({ ...order }, [...items]);
        Notify.create({ type: 'positive', message: 'Заявка создана', timeout: 1500 });
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /** Редактирование */
    async updateOrder(id: number, order: IOrderPayload, items: IOrderItemPayload[]) {
      try {
        this.saving = true;
        await window.electronAPI.orders.update(id, { ...order }, [...items]);
        Notify.create({ type: 'positive', message: 'Заявка обновлена', timeout: 1500 });
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.saving = false;
      }
    },

    /** Удаление */
    async deleteOrder(id: number) {
      try {
        this.saving = true;
        await window.electronAPI.orders.delete(id);
        this.items = this.items.filter((item) => item.id !== id);
        this.totalCount -= 1;
        Notify.create({ type: 'positive', message: 'Заявка удалена', timeout: 1500 });
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.saving = false;
      }
    },

    clearCurrentOrder() {
      this.currentOrder = null;
    },
  },
});
