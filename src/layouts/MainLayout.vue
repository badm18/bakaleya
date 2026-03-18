<template>
  <q-layout view="hHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>Бакалея</q-toolbar-title>

        <q-tabs align="left">
          <q-route-tab :to="{ name: 'orders' }" label="Заявки" icon="receipt_long" />
          <q-route-tab :to="{ name: 'order-new' }" label="Новая заявка" icon="add_circle" />
          <q-separator vertical inset />
          <q-route-tab :to="{ name: 'products' }" label="Номенклатура" icon="inventory_2" />
          <q-route-tab :to="{ name: 'customers' }" label="Клиенты" icon="people" />
        </q-tabs>
      </q-toolbar>
    </q-header>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts"></script>
