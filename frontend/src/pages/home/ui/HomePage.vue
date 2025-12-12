<script setup>
  import { ref, watch, onMounted, computed } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import api from '@/shared/api'
  import { formatDuration } from '@/shared/lib/utils.js'
  import { settings } from '@/entities/settings/model/useSettings'
  import VideoList from '@/widgets/video-list/ui/VideoList.vue'

  const router = useRouter()
  const route = useRoute()

  const currentPath = ref('')
  const loading = ref(false)
  const error = ref(null)

  // Data
  const playlists = ref([])
  const allVideos = ref([])
  const searchResults = ref([])

  // Tabs
  const TABS = {
    PLAYLISTS: 'Playlists',
    VIDEOS: 'Videos',
    SEARCH: 'Search'
  }
  const currentTab = ref(TABS.PLAYLISTS)
  const searchQuery = ref('')
  const hasSearched = ref(false)

  const loadPlaylists = async path => {
    if (!path) return
    loading.value = true
    error.value = null
    playlists.value = []

    try {
      const response = await api.getPlaylists(path)
      playlists.value = response.data
      
      // Update URL without reloading
      router.replace({ query: { ...route.query, dir: path } })
      settings.value.lastPath = path
      
      // If we are in Videos tab, reload videos too
      if (currentTab.value === TABS.VIDEOS) {
        await loadAllVideos(path)
      }
    } catch (err) {
      console.error(err)
      error.value = err.response?.data?.error || 'Failed to load playlists'
    } finally {
      loading.value = false
    }
  }

  const loadAllVideos = async path => {
    if (!path) return
    loading.value = true
    error.value = null
    allVideos.value = []

    try {
      const response = await api.getVideos(path)
      allVideos.value = response.data
    } catch (err) {
      console.error(err)
      error.value = 'Failed to load videos'
    } finally {
      loading.value = false
    }
  }

  const performSearch = async (query, path) => {
    if (!query || !path) return
    loading.value = true
    error.value = null
    searchResults.value = []
    hasSearched.value = true

    try {
      const response = await api.searchVideos(query, path)
      searchResults.value = response.data
    } catch (err) {
      console.error(err)
      error.value = 'Failed to perform search'
    } finally {
      loading.value = false
    }
  }

  const handlePathSearch = (path) => {
    loadPlaylists(path)
  }

  const handleSearchInput = (query) => {
    searchQuery.value = query
    if (query.trim()) {
      currentTab.value = TABS.SEARCH
      performSearch(query, currentPath.value)
    }
  }

  /* ... imports ... */

  const switchTab = async (tab) => {
    currentTab.value = tab
    
    // Update URL to persist tab state
    router.replace({ 
        query: { 
            ...route.query, 
            dir: currentPath.value,
            tab: tab 
        } 
    })

    if (tab === TABS.VIDEOS && allVideos.value.length === 0) {
      await loadAllVideos(currentPath.value)
    }
    if (tab === TABS.SEARCH && searchQuery.value) {
        if (searchResults.value.length === 0) {
             performSearch(searchQuery.value, currentPath.value)
        }
    }
  }

  // Watch for route query changes (e.g. Browser Back/Forward)
  watch(
    () => route.query.tab,
    (newTab) => {
        if (newTab && Object.values(TABS).includes(newTab)) {
            if (currentTab.value !== newTab) {
                currentTab.value = newTab
                // Trigger data load if needed
                if (newTab === TABS.VIDEOS && allVideos.value.length === 0) loadAllVideos(currentPath.value)
                if (newTab === TABS.SEARCH && searchQuery.value) performSearch(searchQuery.value, currentPath.value)
            }
        } else if (!newTab && currentTab.value !== TABS.PLAYLISTS) {
            // Default to Playlists if no tab param
            currentTab.value = TABS.PLAYLISTS
        }
    }
  )

  watch(
    () => currentPath.value,
    () => {
      // When path changes, reload current view
      if (currentTab.value === TABS.VIDEOS) {
          loadAllVideos(currentPath.value)
      } else if (currentTab.value === TABS.SEARCH && searchQuery.value) {
          performSearch(searchQuery.value, currentPath.value)
      }
    }
  )

  onMounted(() => {
    const savedPath = settings.value.lastPath
    if (savedPath) {
        currentPath.value = savedPath
        loadPlaylists(savedPath)
    }
    
    // Restore tab from URL
    const tabParam = route.query.tab
    if (tabParam && Object.values(TABS).includes(tabParam)) {
        currentTab.value = tabParam
        // Data loading for initial tab will happen in watch(currentPath) or explicit call if path already set?
        // onMounted runs, savedPath sets currentPath. 
        // If savedPath exists, loadPlaylists runs.
        // We probably need to ensure correct data for the tab is loaded.
        // If it's VIDEOS, we need to call loadAllVideos.
        if (tabParam === TABS.VIDEOS && savedPath) loadAllVideos(savedPath)
    }
  })
</script>

<template>
  <div class="min-h-screen px-4 py-3 md:px-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header Area -->
      <div class="mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-grow w-full">
          <PathInput
            v-model="currentPath"
            @search="handlePathSearch" />
        </div>
        <div class="w-full md:w-1/3">
          <SearchInput
            :initial-query="searchQuery"
            :disabled="!currentPath"
            @search="handleSearchInput" />
        </div>
      </div>

      <!-- Tabs -->
      <div v-if="currentPath" class="mb-6 border-b border-gray-700">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            v-for="tab in TABS"
            :key="tab"
            @click="switchTab(tab)"
            :class="[
              currentTab === tab
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg focus:outline-none transition-colors duration-200'
            ]"
            :aria-current="currentTab === tab ? 'page' : undefined">
            {{ tab }}
          </button>
        </nav>
      </div>

      <!-- Messages -->
      <div
        v-if="error"
        class="text-center py-12 text-red-600">
        {{ error }}
      </div>

      <!-- Content -->
      <div v-else>
        <!-- PLAYLISTS TAB -->
        <div v-if="currentTab === TABS.PLAYLISTS">
            <div
                v-if="loading"
                class="text-center py-12">
                <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            </div>
            <div
                v-else-if="playlists.length === 0"
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
                class="bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden cursor-pointer block group">
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
                    class="font-semibold text-white line-clamp-2 mb-2 group-hover:text-blue-400 transition-colors"
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

        <!-- VIDEOS TAB -->
        <div v-else-if="currentTab === TABS.VIDEOS">
            <VideoList 
                :videos="allVideos" 
                :loading="loading" 
                :current-path="currentPath"
                empty-message="No videos found in this directory info structure." />
        </div>

        <!-- SEARCH TAB -->
        <div v-else-if="currentTab === TABS.SEARCH">
            <VideoList 
                :videos="searchResults" 
                :loading="loading" 
                :current-path="currentPath"
                :empty-message="hasSearched ? `No results found for '${searchQuery}'` : 'Enter a query to search.'" />
        </div>
      </div>
    </div>
  </div>
</template>
