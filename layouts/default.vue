<script setup lang="ts">
import { Circle, Moon, Sun } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'

const colorMode = useColorMode()
</script>

<template>
  <div class="min-h-screen bg-background font-body antialiased">
    <!-- Navbar -->
    <header class="relative border-b sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div class="container mx-auto px-4 h-16 flex items-center justify-between">
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <div class="relative flex items-center justify-center">
            <div class="w-8 h-8 bg-black dark:bg-white text-white dark:text-black rounded flex items-center justify-center">
              <Circle class="w-5 h-5 fill-current" />
            </div>
          </div>
          <span class="font-heading font-black text-xl tracking-tighter uppercase">Design<span class="text-primary">Template</span></span>
        </NuxtLink>

        <div class="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            @click="colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'"
          >
            <Sun v-if="colorMode.value === 'dark'" class="w-5 h-5" />
            <Moon v-else class="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>

    <main class="relative z-10 p-8">
      <slot />
    </main>
  </div>
</template>