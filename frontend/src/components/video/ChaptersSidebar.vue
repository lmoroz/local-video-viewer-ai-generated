<script setup>
  import { formatTime } from '../../utils'

  const props = defineProps({
    chapters: {
      type: Array,
      default: () => []
    },
    currentChapterName: {
      type: String,
      default: ''
    },
    visible: {
      type: Boolean,
      default: true
    }
  })

  const emit = defineEmits(['close', 'seek'])
</script>

<template>
  <div
    v-if="chapters && chapters.length > 0 && visible"
    class="chapters bg-linear-to-b from-gray-900/95 to-transparent border border-gray-600 overflow-y-auto flex-shrink-0 custom-scrollbar rounded-xl">
    <div class="p-4 border-b border-gray-700 font-semibold bg-gray-900/95 sticky top-0 z-10 flex items-center justify-between">
      <span>In this video</span>
      <button
        class="w-10 h-10 rounded-lg text-6xl bg-transparent hover:bg-gray-700 inline-flex items-center justify-center cursor-pointer"
        @click="emit('close')">
        <i class="bi bi-x text-xl text-white" />
      </button>
    </div>
    <ul>
      <li
        v-for="(chapter, index) in chapters"
        :key="index"
        class="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm transition-colors border-b border-gray-700/50 last:border-0"
        :class="{ 'bg-gray-700/50': currentChapterName === chapter.title }"
        @click="emit('seek', chapter.start_time)">
        <div class="text-gray-300 font-bold group-hover:text-white">{{ chapter.title }}</div>
        <div class="font-mono inline-block p-1 mt-1 bg-black/90 text-gray-400 font-medium group-hover:text-blue-300 rounded-sm">
          {{ formatTime(chapter.start_time) }}
        </div>
      </li>
    </ul>
  </div>
</template>
