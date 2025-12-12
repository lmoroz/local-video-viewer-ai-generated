<template>
  <HomeButton />
  <router-view v-slot="{ Component }">
    <transition
      @enter="fadeIn"
      @leave="fadeOut"
      v-bind:css="false"
      mode="out-in">
      <keep-alive include="HomePage">
        <component :is="Component" />
      </keep-alive>
    </transition>
  </router-view>
</template>

<script setup>
  import { fadeIn, fadeOut } from '@/shared/lib/animations.js'
  import HomeButton from '@/widgets/home-button/ui/HomeButton.vue'
</script>
