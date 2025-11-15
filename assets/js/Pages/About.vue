<script setup lang="ts">
import { Link } from "@inertiajs/vue3";
defineProps<{
  title: string;
  message: string;
}>();
</script>

<template>
  <div class="flex h-screen w-full flex-col items-center justify-center bg-slate-200">
    <h1 class="text-3xl font-semibold text-slate-900">{{ title }}</h1>
    <p class="text-slate-600">{{ message }}</p>
    <Link
      href="/"
      class="mt-4 text-blue-500 hover:underline">
      Go to Home
    </Link>
  </div>
</template>
