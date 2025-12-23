<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { type VariantProps, cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        // Custom variants from CircleOn.me
        'recruit': 'border-transparent bg-primary/10 text-primary gap-2',
        'status-pending': 'rounded-sm font-heading font-bold uppercase tracking-wide border-2 bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
        'status-processing': 'rounded-sm font-heading font-bold uppercase tracking-wide border-2 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
        'status-completed': 'rounded-sm font-heading font-bold uppercase tracking-wide border-2 bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface BadgeProps {
  variant?: VariantProps<typeof badgeVariants>['variant']
  class?: HTMLAttributes['class']
}

const props = defineProps<BadgeProps>()
</script>

<template>
  <div :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </div>
</template>
