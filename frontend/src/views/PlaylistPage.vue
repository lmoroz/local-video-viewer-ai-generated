<script setup>
  import { ref, computed, onMounted } from 'vue'
  import { useRouter } from 'vue-router'
  import api from '../api'

  const props = defineProps({
    name: String,
    dir: String
  })

  const router = useRouter()
  const videos = ref([])
  const loading = ref(true)
  const error = ref(null)
  const sortBy = ref('name')

  const totalDuration = computed(() => {
    return videos.value.reduce((acc, v) => acc + (v.duration || 0), 0)
  })

  const sortedVideos = computed(() => {
    return [...videos.value].sort((a, b) => {
      if (sortBy.value === 'name') {
        return a.title.localeCompare(b.title)
      } else {
        // Date format YYYYMMDD
        return (b.upload_date || '').localeCompare(a.upload_date || '')
      }
    })
  })

  onMounted(async () => {
    try {
      const response = await api.getPlaylistDetails(props.name, props.dir)
      videos.value = response.data
    } catch (err) {
      console.error(err)
      error.value = 'Failed to load videos'
    } finally {
      loading.value = false
    }
  })

  const goBack = () => {
    router.push({ name: 'Home', query: { dir: props.dir } })
  }

  const openVideo = video => {
    router.push({
      name: 'Video',
      params: { filename: video.filename },
      query: { dir: props.dir, playlist: props.name }
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
</script>

<template>
  <div class="min-h-screen bg-gray-900 p-8">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="mb-8 flex items-center gap-4">
        <button
          @click="goBack"
          class="p-2 rounded-full hover:bg-gray-700 transition-colors">
          <svg
            class="w-6 h-6 text-gray-600"
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
        <h1 class="text-2xl font-bold text-white truncate">{{ name }}</h1>
      </div>

      <div
        v-if="loading"
        class="text-center py-12">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"/>
      </div>

      <div
        v-else-if="error"
        class="text-center py-12 text-red-600">
        {{ error }}
      </div>

      <div
        v-else
        class="flex flex-col lg:flex-row gap-8">
        <!-- Sidebar / Info (Optional, using as cover placeholder or just layout) -->
        <!-- For now, we list videos directly as per requirements: "left cover, right list" - wait, requirements said:
             "block divided into two parts: left playlist cover, right list of videos"
        -->

        <!-- Layout adjustment based on requirements -->
        <div class="lg:w-1/4">
          <div class="bg-gray-800 rounded-xl shadow-sm p-4 sticky top-8">
            <!-- We don't have playlist cover explicitly in the API response for details,
                 but we could pass it or fetch it.
                 Actually, the API /playlist/:name returns list of videos.
                 The cover was available in the list view.
                 We might need to fetch playlist info again or just show the first video thumbnail as cover if missing.
                 Let's assume we just show a placeholder or try to find a cover from the videos if needed,
                 but strictly the requirement says "playlist cover".
                 Since we don't have a separate endpoint for playlist metadata (only list of videos),
                 we can try to guess or just skip if not critical.
                 However, let's try to use the first video's thumbnail or a generic icon.
            -->
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
            <h2 class="font-bold text-lg mb-2">{{ name }}</h2>
            <p class="text-gray-400">{{ videos.length }} videos</p>
            <p class="text-gray-400 text-sm">{{ formatDuration(totalDuration) }}</p>

            <div class="mt-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">Sort by</label>
              <select
                v-model="sortBy"
                class="w-full bg-gray-700 text-white border-gray-600 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500">
                <option value="name">Name</option>
                <option value="date">Date</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Video List -->
        <div class="lg:w-3/4">
          <div class="space-y-4">
            <div
              v-for="video in sortedVideos"
              :key="video.filename"
              class="bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex cursor-pointer group"
              @click="openVideo(video)">
              <!-- Thumbnail -->
              <div class="w-48 flex-shrink-0 bg-gray-700 relative">
                <img
                  v-if="video.thumbnail"
                  :src="api.getFileUrl(video.thumbnail)"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
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
                <div class="absolute bottom-1 right-1 bg-black bg-opacity-75 text-white text-xs px-1 rounded">
                  {{ formatDuration(video.duration) }}
                </div>
              </div>

              <!-- Info -->
              <div class="p-4 flex-grow">
                <h3 class="font-semibold text-white mb-1 group-hover:text-blue-400 transition-colors">
                  {{ video.title }}
                </h3>
                <div class="text-sm text-gray-400 mb-2">
                  {{ video.uploader }}
                </div>
                <div class="text-xs text-gray-400">
                  {{ formatDate(video.upload_date) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
