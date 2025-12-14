<script setup></script>

<template>
  <div class="z-50">
    <router-link
      :to="{ name: 'Home' }"
      class="relative flex items-center justify-center w-15 h-15 transition-all duration-200 group overflow-hidden rounded-xl"
      title="Back to Home">
      <img
        src="/app_icon.png"
        alt="Home"
        class="w-14 h-14 object-contain group-hover:scale-110 transition-transform relative z-10" />
      
      <!-- Shine Effect -->
      <div
        class="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-[150%] z-20" />
    </router-link>
  </div>
</template>
