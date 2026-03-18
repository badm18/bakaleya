import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      { path: '', redirect: { name: 'orders' } },
      { path: 'orders', name: 'orders', component: () => import('pages/OrderList.vue') },
      { path: 'orders/new', name: 'order-new', component: () => import('pages/OrderNew.vue') },
      {
        path: 'orders/:id/edit',
        name: 'order-edit',
        component: () => import('pages/OrderNew.vue'),
      },
      { path: 'products', name: 'products', component: () => import('pages/Products.vue') },
      { path: 'customers', name: 'customers', component: () => import('pages/customers/pages/CustomersPage.vue') },
    ],
  },

  {
    path: '/:catchAll(.*)*',
    component: () => import('pages/ErrorNotFound.vue'),
  },
];

export default routes;
