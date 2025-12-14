<script setup>
  import { ref, computed, onMounted, watch } from 'vue'
  import { useRouter, onBeforeRouteLeave } from 'vue-router'
  import api from '@/shared/api'
  import SearchInput from '@/features/search/search-bar/ui/SearchInput.vue'
  import { formatDuration, formatDate } from '@/shared/lib/utils.js'
  import { sortingOptions, videoProgress } from '@/entities/settings/model/useSettings'

  const props = defineProps({
    id: String,
    dir: String
  })

  const router = useRouter()
  const videos = ref([])
  const playlistTitle = ref('')
  const loading = ref(true)
  const error = ref(null)
  const sortBy = ref('default') // default, date_asc, date_desc, title_asc, title_desc

  // Load sort order
  watch(
    () => props.id,
    newId => {
      if (!newId) return
      const saved = sortingOptions.value[newId]
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
    if (props.id) {
      if (props.id) {
        sortingOptions.value[props.id] = newValue
      }
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
      const response = await api.getPlaylistDetails(props.id, props.dir)

      videos.value = response.data.videos.map((v, i) => {
        return {
          ...v,
          originalIndex: i
        }
      })
      playlistTitle.value = response.data.title || props.id

      document.title = playlistTitle.value

      // Restore scroll position
      setTimeout(() => {
        const savedScroll = sessionStorage.getItem(`scroll-pos-${props.id}`)
        if (savedScroll) {
          window.scrollTo(0, parseInt(savedScroll))
          sessionStorage.removeItem(`scroll-pos-${props.id}`)
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
    sessionStorage.setItem(`scroll-pos-${props.id}`, window.scrollY)
    next()
  })

  const handleSearch = query => {
    if (!query.trim()) return
    router.push({
      name: 'Search',
      query: {
        q: query,
        dir: props.dir
      }
    })
  }
</script>

<template>
  <div class="min-h-screen">
    <StickyHeader
      :to="{ name: 'Home', query: { dir: props.dir } }"
      :page-title="playlistTitle"
      :page-descr="dir || '/'" />

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
        <div class="lg:w-1/4 h-full">
          <div class="bg-linear-to-b from-gray-800/95 to-transparent rounded-xl p-4 sticky top-24 h-80 max-h-80">
            <div class="aspect-video bg-gray-700 rounded-lg overflow-hidden mb-4">
              <img
                v-if="videos.length > 0 && videos[0].thumbnail"
                :src="api.getFileUrl(videos[0].thumbnail)"
                class="w-full h-full object-cover" />
              <div
                v-else
                class="w-full h-full flex items-center justify-center text-gray-400">
                <i class="bi bi-collection-play text-5xl" />
              </div>
            </div>
            <h2 class="font-bold text-lg mb-2 text-white">{{ playlistTitle }}</h2>
            <p class="text-gray-400">{{ videos.length }} videos</p>
            <p class="text-gray-400 text-sm">{{ formatDuration(totalDuration) }}</p>

            <div class="mt-6 flex items-center justify-center text-gray-300 gap-3">
              <label class="text-2xl font-medium"><i class="bi bi-filter" /></label>
              <div class="relative">
                <select
                  v-model="sortBy"
                  class="bg-gray-900/95 border-gray-800 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 appearance-none py-2 pl-3 pr-10">
                  <option value="default">Default (Position)</option>
                  <option value="date_desc">Date (Newest first)</option>
                  <option value="date_asc">Date (Oldest first)</option>
                  <option value="title_asc">Title (A-Z)</option>
                  <option value="title_desc">Title (Z-A)</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                  <i class="bi bi-chevron-down" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Video List -->
        <div class="lg:w-3/4">
          <div class="space-y-4">
            <router-link
              v-for="video in sortedVideos"
              :key="video.originalIndex"
              :to="{
                name: 'Video',
                params: { videoId: video.id || video.filename, playlistId: props.id },
                query: { dir: props.dir }
              }"
              class="shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex cursor-pointer">
              <!-- Numbering -->
              <div class="w-12 flex-shrink-0 flex items-center justify-center text-gray-500 font-mono text-lg font-bold">
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
                  <i class="bi bi-play-circle text-3xl" />
                </div>
                <div
                  v-if="videoProgress[video.id] && video.duration > 0"
                  class="absolute bottom-0 left-0 h-1 bg-red-600 z-10"
                  :style="{ width: Math.min((videoProgress[video.id] / video.duration) * 100, 100) + '%' }" />
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
                    <i class="bi bi-person" />
                    {{ video.uploader }}
                  </span>
                  <span
                    v-if="video.upload_date"
                    class="flex items-center gap-1">
                    <i class="bi bi-calendar" />
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
