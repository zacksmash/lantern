<script setup lang="ts">
import { Link } from '@inertiajs/vue3';
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
    <div>
      <Link href="/about">Go to About</Link> | <Link href="/test">Go to Test</Link>
    </div>
  </div>
</template>
