<script setup>
  import { ref, watch, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import api from '@/shared/api'
  import { formatDuration } from '@/shared/lib/utils.js'
  import { settings } from '@/entities/settings/model/useSettings'

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
      settings.value.lastPath = path
    } catch (err) {
      console.error(err)
      error.value = err.response?.data?.error || 'Failed to load playlists'
    } finally {
      loading.value = false
    }
  }

  const handleSearch = query => {
    if (!query.trim()) return
    router.push({
      name: 'Search',
      query: {
        q: query,
        dir: currentPath.value
      }
    })
  }

  watch(
    () => currentPath.value,
    () => {
      loadPlaylists(currentPath.value)

      router.replace({ query: { ...route.query, dir: currentPath.value } })
    }
  )

  onMounted(() => {
    const savedPath = settings.value.lastPath
    if (savedPath) currentPath.value = savedPath
  })
</script>

<template>
  <div class="min-h-screen px-8 py-3">
    <div class="max-w-7xl mx-auto">
      <div class="mb-12 flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-grow w-full">
          <PathInput
            v-model="currentPath"
            @search="loadPlaylists" />
        </div>
        <div class="w-full md:w-1/3">
          <SearchInput
            :disabled="!currentPath"
            @search="handleSearch" />
        </div>
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
              <i class="bi bi-collection-play text-5xl" />
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
