<template>
  <div class="min-h-screen bg-slate-950 text-slate-100">
    <Header />
    <div class="flex">
      <Sidebar />
      <main class="flex-1 p-6 overflow-auto">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import Header from '../components/shared/Header.vue';
import Sidebar from '../components/shared/Sidebar.vue';
</script>
