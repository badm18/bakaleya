import { defineStore } from 'pinia';
import type { ICustomerItem } from 'stores/interfaces/customers-store.interfaces';
import { Notify } from 'quasar';
import { errorHandler } from 'src/utils/errorHandler';

export const useCustomersStore = defineStore('customers', {
  state: () => ({
    items: [] as ICustomerItem[],
    totalCount: 0,
    loading: false,
    upsertLoading: false,
  }),

  actions: {
    async getList() {
      try {
        this.loading = true;
        const data = await window.electronAPI.customers.getAll();
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
        const data = await window.electronAPI.customers.search(name);
        this.items = data.items;
        this.totalCount = data.total;
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.loading = false;
      }
    },

    /** Сохранение */
    async saveCustomer(name: string) {
      if (!name.trim()) {
        return;
      }

      try {
        this.upsertLoading = true;
        await window.electronAPI.customers.create({ name: name.trim() });
        void this.getList();
        Notify.create({
          type: 'positive',
          message: 'Клиент добавлен',
          timeout: 1500,
        });
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.upsertLoading = false;
      }
    },

    /** Редактирование */
    async editCustomer(name: string, id: number) {
      if (!name.trim()) {
        return;
      }

      try {
        this.upsertLoading = true;
        await window.electronAPI.customers.update(id, {
          name: name.trim(),
        });

        this.items = this.items.map((item) => {
          if (item.id === id) {
            return {
              ...item,
              name,
            };
          }
          return item;
        });

        Notify.create({
          type: 'positive',
          message: 'Клиент обновлён',
          timeout: 1500,
        });
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.upsertLoading = false;
      }
    },

    async deleteCustomer(customerId: number) {
      if (!customerId) {
        return;
      }
      this.upsertLoading = true;
      try {
        await window.electronAPI.customers.delete(customerId);
        this.items = this.items.filter((item) => item.id !== customerId);
        this.totalCount -= 1;
        Notify.create({ type: 'positive', message: 'Клиент удалён', timeout: 1500 });
      } catch (e) {
        errorHandler(e);
        throw e;
      } finally {
        this.upsertLoading = false;
      }
    },
  },
});
