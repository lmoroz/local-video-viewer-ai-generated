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
    currentPath: { // Passed down to construct queries if needed, mainly for 'Home' link context if we were linking back, but here we link TO video
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
  <div v-if="loading" class="text-center py-12">
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
    <router-link
      v-for="video in videos"
      :key="video.id || video.filename"
      :to="{
        name: 'Video',
        params: { videoId: video.id || video.filename, playlistId: video.playlistId },
        query: { dir: currentPath }
      }"
      class="bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer flex flex-col h-full group">
      <!-- Thumbnail -->
      <div class="aspect-video bg-gray-700 relative overflow-hidden">
        <img
          v-if="video.thumbnail"
          :src="api.getFileUrl(video.thumbnail)"
          class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div
          v-else
          class="w-full h-full flex items-center justify-center text-gray-400">
          <i class="bi bi-play-circle text-3xl"/>
        </div>
        
        <!-- Progress Bar -->
        <div
          v-if="videoProgress[video.id] && video.duration > 0"
          class="absolute bottom-0 left-0 h-1.5 bg-red-600 z-10"
          :style="{ width: Math.min((videoProgress[video.id] / video.duration) * 100, 100) + '%' }" />

        <div class="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded font-mono">
          {{ formatDuration(video.duration) }}
        </div>
      </div>

      <!-- Info -->
      <div class="p-4 flex flex-col flex-grow">
        <h3 class="font-semibold text-white text-lg mb-2 group-hover:text-blue-400 transition-colors line-clamp-2" :title="video.title">
          {{ video.title }}
        </h3>
        <div class="text-sm text-gray-400 mb-2 flex items-center gap-2 mt-auto">
          <i class="bi bi-folder-fill"/>
          <span class="truncate" :title="video.playlistName">{{ video.playlistName }}</span>
        </div>
        <div class="flex flex-col gap-1 text-sm text-gray-500">
          <span
            v-if="video.uploader"
            class="flex items-center gap-2 truncate">
            <i class="bi bi-person"/>
            {{ video.uploader }}
          </span>
          <span
            v-if="video.upload_date"
            class="flex items-center gap-2">
            <i class="bi bi-calendar3"/>
            {{ formatDate(video.upload_date) }}
          </span>
        </div>
      </div>
    </router-link>
  </div>
</template>
