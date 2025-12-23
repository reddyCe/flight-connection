<script lang="ts" setup>
import type { ToasterProps } from "vue-sonner"
import { reactiveOmit } from "@vueuse/core"
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, XIcon } from "lucide-vue-next"
import { Toaster as Sonner } from "vue-sonner"

const props = defineProps<ToasterProps>()
const delegatedProps = reactiveOmit(props, "toastOptions")
</script>

<template>
  <Sonner
    class="toaster group"
    :toast-options="{
      classes: {
        toast: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:border-black group-[.toaster]:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group-[.toaster]:rounded-sm group-[.toaster]:font-heading group-[.toaster]:uppercase',
        description: 'group-[.toast]:text-muted-foreground group-[.toast]:font-medium group-[.toast]:normal-case',
        actionButton:
          'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:border-2 group-[.toast]:border-black group-[.toast]:rounded-sm group-[.toast]:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-[.toast]:font-bold',
        cancelButton:
          'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:border-2 group-[.toast]:border-black group-[.toast]:rounded-sm',
      },
    }"
    v-bind="delegatedProps"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-5 text-green-600" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-5 text-blue-600" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-5 text-yellow-600" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-5 text-red-600" />
    </template>
    <template #loading-icon>
      <div>
        <Loader2Icon class="size-5 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>
