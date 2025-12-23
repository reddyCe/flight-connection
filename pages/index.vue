<script setup lang="ts">
definePageMeta({
  layout: 'map'
})
</script>

<template>
  <div class="h-full w-full overflow-hidden p-2 sm:p-4 bg-muted/20">
    <div class="w-full h-full rounded-xl overflow-hidden border border-border shadow-2xl relative bg-card">
      <ClientOnly>
        <AirportMap />
      </ClientOnly>
    </div>
  </div>
</template>

<style>
html, body, #__nuxt {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
