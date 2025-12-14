<script setup lang="ts">
  defineProps({
    label: {
      type: String,
      required: true
    }
  })
</script>

<template>
  <div class="flex items-center justify-center perspective-1000">
    <button
      @click="$emit('click')"
      class="group relative h-10 w-10 cursor-pointer border-none bg-transparent p-0 outline-none transform-3d transition-all duration-300 ease-out hover:rotate-x-12 hover:rotate-y-12 active:scale-95">
      <!-- Shadow/Depth Layer -->
      <div
        class="absolute inset-0 rounded-lg bg-blue-900/50 shadow-lg transition-all duration-300 transform-flat translate-z-[-8px] scale-90 group-hover:translate-y-1 group-hover:blur-sm" />

      <!-- Back Layer (Thickness) -->
      <div class="absolute inset-0 rounded-lg bg-blue-800 transition-all duration-300 transform-3d translate-z-[-3px]" />

      <!-- Main Body Layer -->
      <div
        class="absolute inset-0 flex overflow-hidden items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-sm font-bold text-white shadow-inner border border-white/20 transition-all duration-300 transform-3d translate-z-0 group-hover:translate-z-4 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]">
        {{ label }}

        <!-- Shine Effect -->
        <div
          class="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-[150%]" />
      </div>

      <!-- Corner Glows (Subtler) -->
      <div
        class="absolute -top-1 -right-1 size-2 rounded-full bg-cyan-300 blur-sm transition-all duration-300 group-hover:animate-pulse opacity-0 group-hover:opacity-100" />
      <div
        class="absolute -bottom-1 -left-1 size-2 rounded-full bg-blue-400 blur-sm transition-all duration-300 group-hover:animate-pulse opacity-0 group-hover:opacity-100" />
    </button>
  </div>
</template>
