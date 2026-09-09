<script setup lang="ts">
import DefaultTheme from 'vitepress/theme';
import { useData } from 'vitepress';
import { computed } from 'vue';
import PoteParade from './components/PoteParade.vue';

const { Layout } = DefaultTheme;
const { page } = useData();

const isHome = computed(() => page.value.relativePath === 'index.md');
</script>

<template>
  <Layout>
    <template #layout-top>
      <PoteParade v-if="isHome" />
    </template>
  </Layout>
</template>
