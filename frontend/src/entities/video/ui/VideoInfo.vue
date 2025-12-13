<script setup>
  import { formatDescription, formatDate } from '@/shared/lib/utils.js'

  const props = defineProps({
    videoData: {
      type: Object,
      required: true
    }
  })
</script>

<template>
  <div class="p-8">
    <h2 class="text-2xl font-bold mb-4 text-white">{{ videoData.title }}</h2>
    <div class="flex items-center gap-6 text-gray-400 mb-6 text-sm border-b border-gray-800 pb-4">
      <span class="flex items-center gap-2">
        <i class="bi bi-person" />
        <a
          :href="videoData.uploader_url ?? videoData.channel_url"
          target="_blank"
          rel="noreferrer">
          {{ videoData.uploader }}
        </a>
      </span>
      <span class="flex items-center gap-2">
        <i class="bi bi-calendar" />
        {{ formatDate(videoData.upload_date) }}
      </span>
    </div>
    <div
      class="prose prose-invert max-w-none text-gray-300"
      v-html="formatDescription(videoData.description)" />
  </div>
</template>
