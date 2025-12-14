<script setup>
  import { onBeforeMount, onBeforeUnmount, onMounted } from 'vue'
  import { fadeIn, fadeOut } from '@/shared/lib/animations.js'
  import useMuddleClickHandler from '@/shared/lib/useMuddleClickHandler.js'

  const isElectron = 'electronAPI' in window

  onBeforeMount(() => document.addEventListener('auxclick', useMuddleClickHandler))
  onBeforeUnmount(() => document.removeEventListener('auxclick', useMuddleClickHandler))

  onMounted(() => {
    if (isElectron) {
      document.body.classList.add('is-electron')
    }
  })
</script>

<template>
  <WindowTitleBar v-if="isElectron" />
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
