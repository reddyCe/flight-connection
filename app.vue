<script setup lang="ts">
import { Toaster } from '@/components/ui/sonner'
import 'vue-sonner/style.css'
</script>

<template>
  <div class="h-full">
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster />
  </div>
</template>
