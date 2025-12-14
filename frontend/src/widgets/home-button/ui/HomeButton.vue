<script setup></script>

<template>
  <div class="z-50">
    <router-link
      :to="{ name: 'Home' }"
      class="flex items-center justify-center w-15 h-15 transition-all duration-200 group"
      title="Back to Home">
      <img
        src="/app_icon.png"
        alt="Home"
        class="w-14 h-14 object-contain group-hover:scale-110 transition-transform" />
    </router-link>
  </div>
</template>
