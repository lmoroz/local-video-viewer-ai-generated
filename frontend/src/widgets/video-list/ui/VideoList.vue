<script setup>
  import api from '@/shared/api'
  import { formatDuration } from '@/shared/lib/utils.js'
  import { videoProgress } from '@/entities/settings/model/useSettings'

  defineProps({
    videos: {
      type: Array,
      required: true
    },
    loading: {
      type: Boolean,
      default: false
    },
    emptyMessage: {
      type: String,
      default: 'No videos found.'
    },
    currentPath: {
      // Passed down to construct queries if needed, mainly for 'Home' link context if we were linking back, but here we link TO video
      type: String,
      default: ''
    }
  })

  const formatDate = dateStr => {
    if (!dateStr || dateStr.length !== 8) return dateStr
    const y = dateStr.substring(0, 4)
    const m = dateStr.substring(4, 6)
    const d = dateStr.substring(6, 8)
    return `${d}.${m}.${y}`
  }
</script>

<template>
  <div
    v-if="loading"
    class="text-center py-12">
    <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
  </div>

  <div
    v-else-if="videos.length === 0"
    class="text-center py-12 text-gray-500">
    {{ emptyMessage }}
  </div>

  <div
    v-else
    class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
    <ListCard
      v-for="video in videos"
      :key="video.id || video.filename"
      :data="video"
      :to="{
        name: 'Video',
        params: { videoId: video.id || video.filename, playlistId: video.playlistId },
        query: { dir: currentPath }
      }" />
  </div>
</template>
