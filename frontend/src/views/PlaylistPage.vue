<script setup>
  import { ref, computed, onMounted, watch, nextTick } from 'vue'
  import { useRouter, onBeforeRouteLeave } from 'vue-router'
  import api from '../api'

  const props = defineProps({
    name: String,
    dir: String
  })

  const router = useRouter()
  const videos = ref([])
  const loading = ref(true)
  const error = ref(null)
  const sortBy = ref('default') // default, date_asc, date_desc, title_asc, title_desc

  // Load sort order
  watch(
    () => props.name,
    newName => {
      if (!newName) return
      const saved = localStorage.getItem(`playlist-sort-${newName}`)
      if (saved) {
        sortBy.value = saved
      } else {
        sortBy.value = 'default'
      }
    },
    { immediate: true }
  )

  // Save sort order
  watch(sortBy, newValue => {
    if (props.name) {
      localStorage.setItem(`playlist-sort-${props.name}`, newValue)
    }
  })

  const totalDuration = computed(() => {
    return videos.value.reduce((acc, v) => acc + (v.duration || 0), 0)
  })

  const sortedVideos = computed(() => {
    let sorted = [...videos.value]

    switch (sortBy.value) {
      case 'title_asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title))
      case 'title_desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title))
      case 'date_asc':
        return sorted.sort((a, b) => (a.upload_date || '').localeCompare(b.upload_date || ''))
      case 'date_desc':
        return sorted.sort((a, b) => (b.upload_date || '').localeCompare(a.upload_date || ''))
      case 'default':
      default:
        return sorted // Original order from backend
    }
  })

  onMounted(async () => {
    try {
      const response = await api.getPlaylistDetails(props.name, props.dir)
      videos.value = response.data.map((v, i) => ({ ...v, originalIndex: i }))

      // Restore scroll position
      setTimeout(() => {
        const savedScroll = sessionStorage.getItem(`scroll-pos-${props.name}`)
        if (savedScroll) {
          window.scrollTo(0, parseInt(savedScroll))
          sessionStorage.removeItem(`scroll-pos-${props.name}`)
        }
      }, 100)
    } catch (err) {
      console.error(err)
      error.value = 'Failed to load videos'
    } finally {
      loading.value = false
    }
  })

  onBeforeRouteLeave((to, from, next) => {
    console.log('%cwindow.scrollY = ', 'color: yellow', window.scrollY)
    sessionStorage.setItem(`scroll-pos-${props.name}`, window.scrollY)
    console.log(`%cscroll-pos-${props.name}`, 'color: yellow', sessionStorage.getItem(`scroll-pos-${props.name}`))
    next()
  })

  const goBack = () => {
    router.push({ name: 'Home', query: { dir: props.dir } })
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
</script>

<template>
  <div class="min-h-screen bg-gray-900">
    <!-- Fixed Header -->
    <div class="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 shadow-md">
      <div class="max-w-7xl mx-auto px-8 py-4 flex items-center gap-4">
        <button
          @click="goBack"
          class="p-2 rounded-full hover:bg-gray-700 transition-colors group"
          :title="'Back to ' + (dir || 'Home')">
          <svg
            class="w-6 h-6 text-gray-400 group-hover:text-white transition-colors"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div class="flex flex-col">
          <h1 class="text-xl font-bold text-white truncate">{{ name }}</h1>
          <span class="text-xs text-gray-500 font-mono">{{ dir || '/' }}</span>
        </div>
      </div>
    </div>

    <div class="max-w-7xl mx-auto p-8 pt-6">
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
        v-else
        class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar -->
        <div class="lg:w-1/4">
          <div class="bg-gray-800 rounded-xl shadow-sm p-4 sticky top-24">
            <div class="aspect-video bg-gray-700 rounded-lg overflow-hidden mb-4">
              <img
                v-if="videos.length > 0 && videos[0].thumbnail"
                :src="api.getFileUrl(videos[0].thumbnail)"
                class="w-full h-full object-cover" />
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
                    d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </div>
            </div>
            <h2 class="font-bold text-lg mb-2 text-white">{{ name }}</h2>
            <p class="text-gray-400">{{ videos.length }} videos</p>
            <p class="text-gray-400 text-sm">{{ formatDuration(totalDuration) }}</p>

            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
              <div class="relative">
                <select
                  v-model="sortBy"
                  class="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 appearance-none py-2 pl-3 pr-10">
                  <option value="default">Default (Position)</option>
                  <option value="date_desc">Date (Newest first)</option>
                  <option value="date_asc">Date (Oldest first)</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="title_desc">Title (Z-A)</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <svg
                    class="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Video List -->
        <div class="lg:w-3/4">
          <div class="space-y-4">
            <router-link
              v-for="(video, index) in sortedVideos"
              :key="video.originalIndex"
              :to="{
                name: 'Video',
                params: { filename: video.filename },
                query: { dir: props.dir, playlist: props.name }
              }"
              class="bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex cursor-pointer group border border-transparent hover:border-gray-700">
              <!-- Numbering -->
              <div
                class="w-12 flex-shrink-0 flex items-center justify-center text-gray-500 font-mono text-lg font-bold bg-gray-800/50 border-r border-gray-700">
                {{ video.originalIndex + 1 }}
              </div>

              <!-- Thumbnail -->
              <div class="w-48 flex-shrink-0 bg-gray-700 relative overflow-hidden">
                <img
                  v-if="video.thumbnail"
                  :src="api.getFileUrl(video.thumbnail)"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-gray-400">
                  <svg
                    class="w-8 h-8"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="absolute bottom-1 right-1 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded font-mono">
                  {{ formatDuration(video.duration) }}
                </div>
              </div>

              <!-- Info -->
              <div class="p-4 flex-grow flex flex-col justify-center">
                <h3 class="font-semibold text-white text-lg mb-1 group-hover:text-blue-400 transition-colors line-clamp-2">
                  {{ video.title }}
                </h3>
                <div class="flex items-center gap-3 text-sm text-gray-400">
                  <span
                    v-if="video.uploader"
                    class="flex items-center gap-1">
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {{ video.uploader }}
                  </span>
                  <span
                    v-if="video.upload_date"
                    class="flex items-center gap-1">
                    <svg
                      class="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {{ formatDate(video.upload_date) }}
                  </span>
                </div>
              </div>
            </router-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
