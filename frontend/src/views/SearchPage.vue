<script setup>
  import { ref, watch } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import api from '@/api'
  import SearchInput from '@/components/SearchInput.vue'

  const route = useRoute()
  const router = useRouter()

  const query = ref('')
  const dir = ref('')
  const results = ref([])
  const loading = ref(false)
  const error = ref(null)

  const performSearch = async (searchQuery, searchDir) => {
    if (!searchQuery || !searchDir) return

    loading.value = true
    error.value = null
    results.value = []

    try {
      const response = await api.searchVideos(searchQuery, searchDir)
      results.value = response.data
    } catch (err) {
      console.error(err)
      error.value = 'Failed to perform search'
    } finally {
      loading.value = false
    }
  }

  const handleSearch = newQuery => {
    if (!newQuery.trim()) return
    router.push({
      name: 'Search',
      query: {
        q: newQuery,
        dir: dir.value
      }
    })
  }

  const formatDuration = seconds => {
    if (!seconds) return '0:00'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatDate = dateStr => {
    if (!dateStr || dateStr.length !== 8) return dateStr
    const y = dateStr.substring(0, 4)
    const m = dateStr.substring(4, 6)
    const d = dateStr.substring(6, 8)
    return `${d}.${m}.${y}`
  }

  watch(
    () => route.query,
    newQuery => {
      query.value = newQuery.q || ''
      dir.value = newQuery.dir || ''
      if (query.value && dir.value) {
        performSearch(query.value, dir.value)
      }
    },
    { immediate: true }
  )
</script>

<template>
  <div class="min-h-screen">
    <!-- Header -->
    <div class="sticky top-0 z-10 backdrop-blur-sm border-b border-gray-800 shadow-md bg-gray-900/80">
      <div class="max-w-7xl mx-auto px-8 py-4 flex items-center gap-4">
        <router-link
          :to="{ name: 'Home', query: { dir: dir } }"
          class="p-2 rounded-full hover:bg-gray-700 transition-colors group"
          title="Back to Home">
          <i class="bi bi-arrow-left text-xl text-gray-400 group-hover:text-white transition-colors"/>
        </router-link>
        <div class="flex-1 flex items-center justify-between">
          <h1 class="text-xl font-bold text-white truncate mr-4">Search Results</h1>
          <div class="w-full max-w-md">
            <SearchInput
              :initial-query="query"
              :disabled="!dir"
              @search="handleSearch" />
          </div>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto p-8">
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
        v-else-if="results.length === 0"
        class="text-center py-12 text-gray-500">
        No videos found matching "{{ query }}"
      </div>

      <div
        v-else
        class="flex flex-col gap-4">
        <router-link
          v-for="video in results"
          :key="video.id || video.filename"
          :to="{
            name: 'Video',
            params: { videoId: video.id || video.filename, playlistId: video.playlistId },
            query: { dir: dir }
          }"
          class="bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex cursor-pointer group h-32">
          <!-- Thumbnail -->
          <div class="w-48 flex-shrink-0 bg-gray-700 relative overflow-hidden">
            <img
              v-if="video.thumbnail"
              :src="api.getFileUrl(video.thumbnail)"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-gray-400">
              <i class="bi bi-play-circle text-3xl"/>
            </div>
            <div class="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
              {{ formatDuration(video.duration) }}
            </div>
          </div>

          <!-- Info -->
          <div class="p-4 flex-grow flex flex-col justify-center min-w-0">
            <h3 class="font-semibold text-white text-lg mb-1 group-hover:text-blue-400 transition-colors truncate">
              {{ video.title }}
            </h3>
            <div class="text-sm text-gray-400 mb-1 flex items-center gap-2">
              <i class="bi bi-folder"/>
              <span class="truncate">{{ video.playlistName }}</span>
            </div>
            <div class="flex items-center gap-3 text-sm text-gray-500">
              <span
                v-if="video.uploader"
                class="flex items-center gap-1 truncate">
                <i class="bi bi-person"/>
                {{ video.uploader }}
              </span>
              <span
                v-if="video.upload_date"
                class="flex items-center gap-1">
                <i class="bi bi-calendar"/>
                {{ formatDate(video.upload_date) }}
              </span>
            </div>
          </div>
        </router-link>
      </div>
    </div>
  </div>
</template>
