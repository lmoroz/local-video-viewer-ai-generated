<script setup>
  import { ref, onMounted, onUnmounted, computed } from 'vue'
  import { useRouter } from 'vue-router'
  import videojs from 'video.js'
  import 'video.js/dist/video-js.css'
  import api from '../api'

  const props = defineProps({
    filename: String,
    dir: String,
    playlist: String
  })

  const router = useRouter()
  const videoPlayer = ref(null)
  const player = ref(null)
  const videoData = ref(null)

  const chapters = computed(() => videoData.value?.chapters || [])

  onMounted(async () => {
    // Fetch video details again to get full metadata including chapters/description
    // Since our API structure is a bit flat (getPlaylistDetails returns all videos),
    // we might need to fetch the playlist and find this video.
    // Ideally we should have a single video endpoint, but we can reuse getPlaylistDetails.

    try {
      const response = await api.getPlaylistDetails(props.playlist, props.dir)
      const found = response.data.find(v => v.filename === props.filename)
      if (found) {
        videoData.value = found
        initPlayer(found)
      }
    } catch (err) {
      console.error('Failed to load video data', err)
    }
  })

  const initPlayer = data => {
    if (!videoPlayer.value) return

    const src = api.getFileUrl(data.path)

    player.value = videojs(videoPlayer.value, {
      fluid: true, // Responsive
      sources: [
        {
          src: src,
          type: 'video/mp4' // Or detect type
        }
      ]
    })
  }

  const seekTo = time => {
    if (player.value) {
      player.value.currentTime(time)
      player.value.play()
    }
  }

  const goBack = () => {
    router.push({
      name: 'Playlist',
      params: { name: props.playlist },
      query: { dir: props.dir }
    })
  }

  const formatTime = seconds => {
    if (!seconds && seconds !== 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formatDate = dateStr => {
    if (!dateStr || dateStr.length !== 8) return dateStr
    const y = dateStr.substring(0, 4)
    const m = dateStr.substring(4, 6)
    const d = dateStr.substring(6, 8)
    return `${d}.${m}.${y}`
  }

  onUnmounted(() => {
    if (player.value) {
      player.value.dispose()
    }
  })
</script>

<template>
  <div class="min-h-screen bg-gray-900 text-white">
    <!-- Header -->
    <div class="sticky top-0 z-20 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 p-4 flex items-center gap-4 shadow-md">
      <button
        @click="goBack"
        class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white group">
        <svg
          class="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span class="font-medium">{{ playlist }}</span>
      </button>
      <div class="h-6 w-px bg-gray-700 mx-2"></div>
      <h1 class="text-lg font-semibold truncate text-gray-100">{{ videoData?.title || filename }}</h1>
    </div>

    <div class="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      <!-- Player Section -->
      <div class="flex-grow bg-black flex flex-col relative">
        <div class="flex-grow relative">
          <video
            ref="videoPlayer"
            class="video-js vjs-big-play-centered w-full h-full"
            controls
            preload="auto"/>
        </div>

        <!-- Info Section (Below player) -->
        <div class="p-6 bg-gray-900 overflow-y-auto max-h-60 lg:max-h-none">
          <h2 class="text-xl font-bold mb-2">{{ videoData?.title }}</h2>
          <div class="flex items-center gap-4 text-gray-400 mb-4 text-sm">
            <span>{{ videoData?.uploader }}</span>
            <span>{{ formatDate(videoData?.upload_date) }}</span>
          </div>
          <div class="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300 text-sm">
            {{ videoData?.description }}
          </div>
        </div>
      </div>

      <!-- Chapters Sidebar -->
      <div
        v-if="chapters && chapters.length > 0"
        class="lg:w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0">
        <div class="p-4 border-b border-gray-700 font-semibold">Chapters</div>
        <ul>
          <li
            v-for="(chapter, index) in chapters"
            :key="index"
            class="p-3 hover:bg-gray-700 cursor-pointer flex gap-3 text-sm transition-colors border-b border-gray-700/50 last:border-0"
            @click="seekTo(chapter.start_time)">
            <span class="font-mono text-blue-400">{{ formatTime(chapter.start_time) }}</span>
            <span class="truncate">{{ chapter.title }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style>
  /* Override video.js styles if needed */
  .video-js {
    width: 100%;
    height: 100%;
  }
</style>
