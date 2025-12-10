<template>
  <router-view v-slot="{ Component }">
    <transition
      @enter="fadeIn"
      @leave="fadeOut"
      v-bind:css="false"
      mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<script setup>
  import { fadeIn, fadeOut } from '@/animations.js'
</script>
