<script setup>
  import { onBeforeMount, onBeforeUnmount } from 'vue'
  import { fadeIn, fadeOut } from '@/shared/lib/animations.js'
  import useMuddleClickHandler from '@/shared/lib/useMuddleClickHandler.js'
  import HomeButton from '@/widgets/home-button/ui/HomeButton.vue'

  onBeforeMount(() => document.addEventListener('auxclick', useMuddleClickHandler))
  onBeforeUnmount(() => document.removeEventListener('auxclick', useMuddleClickHandler))
</script>

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
