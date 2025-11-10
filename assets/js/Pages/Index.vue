<script setup lang="ts">
// biome-ignore lint: noUnusedVariables
import { Link } from '@inertiajs/vue3';
// biome-ignore lint: noUnusedVariables
import Lantern from '@/Components/Lantern.vue';

const props = defineProps({
  name: String,
})
</script>

<template>
  <div class="h-screen flex flex-col items-center justify-center bg-slate-200">
    <h1 class="text-4xl font-extrabold leading-none tracking-tight text-slate-700 md:text-5xl lg:text-6xl">
      {{ name }}JS
    </h1>
    <Lantern />
    <Link href="/about">Go to About</Link>
  </div>
</template>
