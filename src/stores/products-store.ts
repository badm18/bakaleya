import { defineStore } from 'pinia';
import { Notify } from 'quasar';
import { errorHandler } from 'src/utils/errorHandler';
import type { IProductItem } from 'stores/interfaces/products-store.interfaces';

export type IProductCreate = Omit<IProductItem, 'id' | 'created_at'>;

export const useProductsStore = defineStore('products', {
  state: () => ({
    items: [] as IProductItem[],
    totalCount: 0,
    loading: false,
    upsertLoading: false,
  }),

  actions: {
    async getList() {
      try {
        this.loading = true;
        const data = await window.electronAPI.products.getAll();
        this.items = data.items;
        this.totalCount = data.total;
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async search(name: string) {
      try {
        this.loading = true;
        const data = await window.electronAPI.products.search(name);
        this.items = data.items;
        this.totalCount = data.total;
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    async createProduct(payload: IProductCreate) {
      if (!payload.name.trim()) {
        return;
      }

      try {
        this.upsertLoading = true;
        await window.electronAPI.products.create({ ...payload });
        void this.getList();
        Notify.create({ type: 'positive', message: 'Товар добавлен', timeout: 1500 });
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.upsertLoading = false;
      }
    },

    async updateProduct(id: number, payload: IProductCreate) {
      try {
        this.upsertLoading = true;
        await window.electronAPI.products.update(id, { ...payload });

        // Обновляем локально без перезапроса
        this.items = this.items.map((item) => (item.id === id ? { ...item, ...payload } : item));

        Notify.create({ type: 'positive', message: 'Товар обновлён', timeout: 1500 });
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.upsertLoading = false;
      }
    },

    async deleteProduct(id: number) {
      if (!id) return;
      try {
        this.upsertLoading = true;
        await window.electronAPI.products.delete(id);
        this.items = this.items.filter((item) => item.id !== id);
        this.totalCount -= 1;
        Notify.create({ type: 'positive', message: 'Товар удалён', timeout: 1500 });
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.upsertLoading = false;
      }
    },
  },
});
