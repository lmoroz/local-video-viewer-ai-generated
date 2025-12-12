<script setup>
  import { computed } from 'vue'
  import { useRoute } from 'vue-router'

  const route = useRoute()
  const isVisible = computed(() => route.name !== 'Home')
</script>

<template>
  <div
    v-if="isVisible"
    class="fixed top-4 left-4 z-50">
    <router-link
      :to="{ name: 'Home', query: route.query }"
      class="flex items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 group"
      title="Back to Home">
      <img 
        src="/app_icon.png" 
        alt="Home" 
        class="w-10 h-10 object-contain group-hover:scale-110 transition-transform" />
    </router-link>
  </div>
</template>
