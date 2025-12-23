<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  value: string | number
  label: string
  class?: HTMLAttributes['class']
  variant?: 'default' | 'primary'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<template>
  <div 
    :class="cn(
      'text-center px-6 py-4 rounded-sm bg-secondary/50 border border-border flex-1 min-w-[120px]', 
      props.class
    )"
  >
    <div 
      class="text-3xl font-heading font-black"
      :class="variant === 'primary' ? 'text-primary' : 'text-foreground'"
    >
      {{ value }}
    </div>
    <div class="text-xs font-heading font-bold text-muted-foreground uppercase tracking-widest mt-1">
      {{ label }}
    </div>
  </div>
</template>
