<script setup lang="ts">
const props = defineProps<{
  title: string;
  message: string;
}>();
</script>

<template>
  <div class="flex h-screen w-full flex-col items-center justify-center bg-slate-200">
    <h1 class="text-3xl font-semibold text-slate-900">{{ props.title }}</h1>
    <p class="text-slate-600">{{ props.message }}</p>
  </div>
</template>
