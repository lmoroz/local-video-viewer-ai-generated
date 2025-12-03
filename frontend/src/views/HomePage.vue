<script setup>
  import { ref, onMounted, watchEffect } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import api from '../api'

  const router = useRouter()
  const route = useRoute()

  const currentPath = ref('')
  const playlists = ref([])
  const loading = ref(false)
  const error = ref(null)
  const hasSearched = ref(false)

  const loadPlaylists = async path => {
    if (!path) return

    loading.value = true
    error.value = null
    hasSearched.value = true
    playlists.value = []

    try {
      const response = await api.getPlaylists(path)
      playlists.value = response.data

      // Update URL without reloading
      router.replace({ query: { ...route.query, dir: path } })
    } catch (err) {
      console.error(err)
      error.value = err.response?.data?.error || 'Failed to load playlists'
    } finally {
      loading.value = false
    }
  }

  const formatDuration = seconds => {
    if (!seconds) return '0s'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) return `${h}h ${m}m`
    if (m > 0) return `${m}m ${s}s`
    return `${s}s`
  }

  watchEffect(() => {
    // Restore path from query or local storage if needed,
    // but usually we start empty or from previous session if we want.
    // For now, let's check if query has dir
    if (route.query.dir) {
      currentPath.value = route.query.dir
      loadPlaylists(currentPath.value)
    }
  })
</script>

<template>
  <div class="min-h-screen px-8 py-3">
    <div class="max-w-7xl mx-auto">
      <div class="mb-12">
        <PathInput
          v-model="currentPath"
          @search="loadPlaylists" />
      </div>

      <div
        v-if="loading"
        class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
      </div>

      <div
        v-else-if="error"
        class="text-center py-12 text-red-600">
        {{ error }}
      </div>

      <div
        v-else-if="playlists.length === 0 && hasSearched"
        class="text-center py-12 text-gray-500">
        No playlists found in this directory.
      </div>

      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        <router-link
          v-for="playlist in playlists"
          :key="playlist.id"
          :to="{
            name: 'Playlist',
            params: { id: playlist.id },
            query: { dir: currentPath }
          }"
          class="bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer block">
          <div class="aspect-video bg-gray-700 relative overflow-hidden">
            <img
              v-if="playlist.cover"
              :src="api.getFileUrl(playlist.cover)"
              alt="Cover"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-gray-400">
              <svg
                class="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div class="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">{{ playlist.videoCount }} videos</div>
          </div>

          <div class="p-4">
            <h3
              class="font-semibold text-white line-clamp-2 mb-2"
              :title="playlist.title || playlist.name">
              {{ playlist.title || playlist.name }}
            </h3>
            <div class="text-sm text-gray-400">
              {{ formatDuration(playlist.totalDuration) }}
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>
