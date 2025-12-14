<script setup>
  import { ref, watch, onMounted, computed } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import api from '@/shared/api'
  import { settings, viewOptions } from '@/entities/settings/model/useSettings'

  defineOptions({
    name: 'HomePage'
  })

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

  // Sorting and Grouping State (Mapped to persistent settings)
  const playlistSortOption = computed({
    get: () => viewOptions.value.playlistSort || 'default',
    set: val => (viewOptions.value.playlistSort = val)
  })
  const videoGroupOption = computed({
    get: () => viewOptions.value.videoGroup || 'none',
    set: val => (viewOptions.value.videoGroup = val)
  })
  const searchSortOption = computed({
    get: () => viewOptions.value.searchSort || 'default',
    set: val => (viewOptions.value.searchSort = val)
  })
  const searchGroupOption = computed({
    get: () => viewOptions.value.searchGroup || 'none',
    set: val => (viewOptions.value.searchGroup = val)
  })

  const groupVideoList = (list, groupBy) => {
    if (groupBy === 'none') {
      return [{ title: '', videos: list }]
    }

    const groups = {}

    if (groupBy === 'author') {
      list.forEach(video => {
        const author = video.uploader || 'Unknown'
        if (!groups[author]) groups[author] = []
        groups[author].push(video)
      })

      return Object.keys(groups)
        .sort()
        .map(key => ({
          title: key,
          videos: groups[key]
        }))
    } else if (groupBy === 'date') {
      list.forEach(video => {
        let key = 'Unknown Date'
        if (video.upload_date && video.upload_date.length === 8) {
          const year = video.upload_date.substring(0, 4)
          const month = video.upload_date.substring(4, 6)
          const dateObj = new Date(year, month - 1)
          key = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' })
        }
        if (!groups[key]) groups[key] = []
        groups[key].push(video)
      })
      return Object.keys(groups).map(key => ({
        title: key,
        videos: groups[key]
      }))
    } else if (groupBy === 'playlist') {
      list.forEach(video => {
        const playlist = video.playlistName || 'Unknown Playlist'
        if (!groups[playlist]) groups[playlist] = []
        groups[playlist].push(video)
      })
      return Object.keys(groups)
        .sort()
        .map(key => ({
          title: key,
          videos: groups[key]
        }))
    }

    return []
  }

  // Computed
  const sortedPlaylists = computed(() => {
    let sorted = [...playlists.value]
    if (playlistSortOption.value === 'author') {
      sorted.sort((a, b) => (a.uploader || '').localeCompare(b.uploader || ''))
    } else if (playlistSortOption.value === 'date') {
      sorted.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    }
    return sorted
  })

  const groupedVideos = computed(() => {
    return groupVideoList(allVideos.value, videoGroupOption.value)
  })

  const processedSearchResults = computed(() => {
    let sorted = [...searchResults.value]

    // Sort
    if (searchSortOption.value === 'author') {
      sorted.sort((a, b) => (a.uploader || '').localeCompare(b.uploader || ''))
    } else if (searchSortOption.value === 'date') {
      sorted.sort((a, b) => {
        // Newest first
        const dateA = a.upload_date || ''
        const dateB = b.upload_date || ''
        return dateB.localeCompare(dateA)
      })
    }

    // Group
    return groupVideoList(sorted, searchGroupOption.value)
  })

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

  const handlePathSearch = path => {
    loadPlaylists(path)
  }

  const handleSearchInput = query => {
    searchQuery.value = query
    if (query.trim()) {
      currentTab.value = TABS.SEARCH
      performSearch(query, currentPath.value)
    }
  }

  /* ... imports ... */

  const switchTab = async tab => {
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
        await performSearch(searchQuery.value, currentPath.value)
      }
    }
  }

  // Watch for route query changes (e.g. Browser Back/Forward)
  watch(
    () => route.query.tab,
    newTab => {
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
    async () => {
      // When path changes, reload current view
      if (currentTab.value === TABS.VIDEOS) {
        await loadAllVideos(currentPath.value)
      } else if (currentTab.value === TABS.SEARCH && searchQuery.value) {
        await performSearch(searchQuery.value, currentPath.value)
      }
    }
  )

  onMounted(async () => {
    const savedPath = settings.value.lastPath
    if (savedPath) {
      currentPath.value = savedPath
      await loadPlaylists(savedPath)
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

      <!-- Tabs & Controls -->
      <div
        v-if="currentPath"
        class="sticky z-50 bg-gradient-to-r from-slate-900/50 via-gray-900/50 to-black/50 backdrop-blur-md backdrop-saturate-150 mb-6 border-b border-gray-700 flex flex-wrap items-end justify-between gap-4 pt-4 px-6 top-[var(--title-bar-height)]">
        <nav
          class="-mb-px flex space-x-8"
          aria-label="Tabs">
          <button
            v-for="tab in TABS"
            :key="tab"
            @click="switchTab(tab)"
            :class="[
              currentTab === tab ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300',
              'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg focus:outline-none transition-colors duration-200'
            ]"
            :aria-current="currentTab === tab ? 'page' : undefined">
            {{ tab }}
          </button>
        </nav>

        <!-- Sort/Group Controls -->
        <div class="pb-2">
          <select
            v-if="currentTab === TABS.PLAYLISTS"
            v-model="playlistSortOption"
            class="bg-gray-800 text-white text-sm px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none rounded-sm">
            <option value="default">Default Sort</option>
            <option value="author">Sort by Author</option>
            <option value="date">Sort by Date Updated</option>
          </select>

          <select
            v-if="currentTab === TABS.VIDEOS"
            v-model="videoGroupOption"
            class="bg-gray-800 text-white text-sm px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none rounded-sm">
            <option value="none">No Grouping</option>
            <option value="date">Group by Date</option>
            <option value="author">Group by Author</option>
            <option value="playlist">Group by Playlist</option>
          </select>

          <!-- Search Tab Controls -->
          <div
            v-if="currentTab === TABS.SEARCH"
            class="flex gap-2">
            <select
              v-model="searchSortOption"
              class="bg-gray-800 text-white text-sm px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none rounded-sm">
              <option value="default">Default Sort</option>
              <option value="author">Sort by Author</option>
              <option value="date">Sort by Date</option>
            </select>
            <select
              v-model="searchGroupOption"
              class="bg-gray-800 text-white text-sm px-3 py-2 border border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none rounded-sm">
              <option value="none">No Grouping</option>
              <option value="date">Group by Date</option>
              <option value="author">Group by Author</option>
              <option value="playlist">Group by Playlist</option>
            </select>
          </div>
        </div>
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
            <ListCard
              v-for="playlist in sortedPlaylists"
              :key="playlist.id"
              isPlaylist
              :data="playlist"
              :to="{
                name: 'Playlist',
                params: { id: playlist.id },
                query: { dir: currentPath }
              }" />
          </div>
        </div>

        <!-- VIDEOS TAB -->
        <div v-else-if="currentTab === TABS.VIDEOS">
          <div
            v-if="loading"
            class="text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          </div>

          <div v-else>
            <div
              v-for="group in groupedVideos"
              :key="group.title"
              class="mb-8">
              <h2
                v-if="group.title"
                class="sticky top-[76px] z-40 bg-black/80 backdrop-blur-md backdrop-saturate-150 py-2 px-6 text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-800">
                <i
                  v-if="videoGroupOption === 'date'"
                  class="bi bi-calendar3 text-blue-500" />
                <i
                  v-else-if="videoGroupOption === 'author'"
                  class="bi bi-person text-blue-500" />
                <i
                  v-else-if="videoGroupOption === 'playlist'"
                  class="bi bi-collection-play text-blue-500" />
                {{ group.title }}
                <span class="text-sm font-normal text-gray-500 ml-2">({{ group.videos.length }})</span>
              </h2>
              <VideoList
                :videos="group.videos"
                :loading="false"
                :current-path="currentPath"
                empty-message="No videos in this group." />
            </div>
            <div
              v-if="groupedVideos.length === 0 && !loading"
              class="text-center py-12 text-gray-500">
              No videos found.
            </div>
          </div>
        </div>

        <!-- SEARCH TAB -->
        <div v-else-if="currentTab === TABS.SEARCH">
          <div
            v-if="loading"
            class="text-center py-12">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          </div>

          <div v-else>
            <div
              v-for="group in processedSearchResults"
              :key="group.title"
              class="mb-8">
              <h2
                v-if="group.title"
                class="sticky top-[76px] z-40 bg-black/80 backdrop-blur-md backdrop-saturate-150 py-2 px-6 rounded-xl text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-gray-800">
                <i
                  v-if="searchGroupOption === 'date'"
                  class="bi bi-calendar3 text-blue-500" />
                <i
                  v-else-if="searchGroupOption === 'author'"
                  class="bi bi-person text-blue-500" />
                <i
                  v-else-if="searchGroupOption === 'playlist'"
                  class="bi bi-collection-play text-blue-500" />
                {{ group.title }}
                <span class="text-sm font-normal text-gray-500 ml-2">({{ group.videos.length }})</span>
              </h2>
              <VideoList
                :videos="group.videos"
                :loading="false"
                :current-path="currentPath"
                :empty-message="hasSearched ? `No results found for '${searchQuery}'` : 'Enter a query to search.'" />
            </div>
            <div
              v-if="processedSearchResults.length === 0 && !loading"
              class="text-center py-12 text-gray-500">
              {{ hasSearched ? `No results found for '${searchQuery}'` : 'Enter a query to search.' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
  .video-card:before {
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.15'/%3E%3C/svg%3E");
  }
</style>
