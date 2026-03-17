import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Номенклатура
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    search: (query: string) => ipcRenderer.invoke('products:search', query),
    create: (data: unknown) => ipcRenderer.invoke('products:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('products:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('products:delete', id),
  },

  // Клиенты
  customers: {
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    search: (query: string) => ipcRenderer.invoke('customers:search', query),
    create: (data: unknown) => ipcRenderer.invoke('customers:create', data),
    update: (id: number, data: unknown) => ipcRenderer.invoke('customers:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('customers:delete', id),
  },

  // Заявки
  orders: {
    getList: (page: number, limit: number) => ipcRenderer.invoke('orders:getList', page, limit),
    getById: (id: number) => ipcRenderer.invoke('orders:getById', id),
    create: (order: unknown, items: unknown) => ipcRenderer.invoke('orders:create', order, items),
    update: (id: number, order: unknown, items: unknown) =>
      ipcRenderer.invoke('orders:update', id, order, items),
    delete: (id: number) => ipcRenderer.invoke('orders:delete', id),
  },
});
