import type { ICustomerItem } from 'stores/interfaces/customers-store.interfaces';

export {};

declare global {
  interface Window {
    electronAPI: {
      products: {
        getAll: () => Promise<unknown[]>;
        search: (query: string) => Promise<unknown[]>;
        create: (data: unknown) => Promise<unknown>;
        update: (id: number, data: unknown) => Promise<unknown>;
        delete: (id: number) => Promise<unknown>;
      };
      customers: {
        getAll: () => Promise<{
          items: ICustomerItem[];
          total: number;
        }>;
        search: (query: string) => Promise<{
          items: ICustomerItem[];
          total: number;
        }>;
        create: (data: unknown) => Promise<unknown>;
        update: (id: number, data: unknown) => Promise<unknown>;
        delete: (id: number) => Promise<unknown>;
      };
      orders: {
        getList: (page: number, limit: number) => Promise<unknown>;
        getById: (id: number) => Promise<unknown>;
        create: (order: unknown, items: unknown) => Promise<unknown>;
        update: (id: number, order: unknown, items: unknown) => Promise<unknown>;
        delete: (id: number) => Promise<unknown>;
      };
    };
  }
}
