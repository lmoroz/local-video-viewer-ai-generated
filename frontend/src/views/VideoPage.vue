<script setup>
  import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
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

  // Player State
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)
  const isFullscreen = ref(false)
  const showControls = ref(false)
  let controlsTimeout = null

  const chapters = computed(() => videoData.value?.chapters || [])

  const currentChapterName = computed(() => {
    if (!chapters.value.length) return ''
    // Find the chapter that matches current time
    // Chapters are usually sorted by start_time
    // We find the last chapter where start_time <= currentTime
    const current = [...chapters.value].reverse().find(c => c.start_time <= currentTime.value)
    return current ? current.title : ''
  })

  onMounted(async () => {
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
      fluid: true,
      controls: false, // Hide default controls
      sources: [
        {
          src: src,
          type: 'video/mp4'
        }
      ]
    })

    // Restore volume
    const savedVolume = localStorage.getItem('video-volume')
    if (savedVolume !== null) {
      const vol = parseFloat(savedVolume)
      player.value.volume(vol)
      volume.value = vol
    } else {
      volume.value = player.value.volume()
    }

    // Event Listeners
    player.value.on('play', () => (isPlaying.value = true))
    player.value.on('pause', () => (isPlaying.value = false))
    player.value.on('timeupdate', () => (currentTime.value = player.value.currentTime()))
    player.value.on('durationchange', () => (duration.value = player.value.duration()))
    player.value.on('volumechange', () => {
      const vol = player.value.volume()
      volume.value = vol
      localStorage.setItem('video-volume', vol)
    })
    player.value.on('fullscreenchange', () => (isFullscreen.value = player.value.isFullscreen()))
  }

  const togglePlay = () => {
    if (player.value) {
      if (player.value.paused()) {
        player.value.play()
      } else {
        player.value.pause()
      }
    }
  }

  const toggleFullscreen = () => {
    if (player.value) {
      if (player.value.isFullscreen()) {
        player.value.exitFullscreen()
      } else {
        player.value.requestFullscreen()
      }
    }
  }

  const onVolumeChange = e => {
    const val = parseFloat(e.target.value)
    if (player.value) {
      player.value.volume(val)
    }
  }

  const hoverTime = ref(null)
  const hoverPosition = ref(0)

  const onCustomSeek = e => {
    if (!player.value || !duration.value) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const time = pos * duration.value
    player.value.currentTime(time)
  }

  const onProgressHover = e => {
    if (!duration.value) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    hoverPosition.value = pos * 100
    hoverTime.value = pos * duration.value
  }

  const getChapterAtTime = time => {
    if (!chapters.value.length) return null
    return [...chapters.value].reverse().find(c => c.start_time <= time)
  }

  const seekTo = time => {
    if (player.value) {
      player.value.currentTime(time)
      player.value.play()
    }
  }

  const handleMouseMove = () => {
    showControls.value = true
    if (controlsTimeout) clearTimeout(controlsTimeout)
    controlsTimeout = setTimeout(() => {
      if (isPlaying.value) {
        showControls.value = false
      }
    }, 3000)
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

  onUnmounted(() => {
    if (player.value) {
      player.value.dispose()
    }
    if (controlsTimeout) clearTimeout(controlsTimeout)
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
      <div class="h-6 w-px bg-gray-700 mx-2" />
      <h1 class="text-lg font-semibold truncate text-gray-100">{{ videoData?.title || filename }}</h1>
    </div>

    <div class="flex flex-col lg:flex-row h-[calc(100vh-64px)]">
      <!-- Player Section -->
      <div
        class="flex-grow bg-black flex flex-col relative group"
        @mousemove="handleMouseMove"
        @mouseleave="showControls = false">
        <div class="flex-grow relative">
          <video
            ref="videoPlayer"
            class="video-js vjs-big-play-centered w-full h-full"
            preload="auto"
            @click="togglePlay" />

          <!-- Custom Controls Overlay -->
          <div
            class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-4 py-4 transition-opacity duration-300 flex flex-col gap-2"
            :class="{ 'opacity-0': !showControls && isPlaying, 'opacity-100': showControls || !isPlaying }">
            <!-- Custom Progress Bar -->
            <div
              class="relative h-1 hover:h-2 transition-all bg-gray-600 rounded cursor-pointer group/progress mb-2"
              @click="onCustomSeek"
              @mousemove="onProgressHover"
              @mouseleave="hoverTime = null">
              <!-- Progress -->
              <div
                class="absolute top-0 left-0 bottom-0 bg-red-500 rounded transition-all"
                :style="{ width: (currentTime / duration) * 100 + '%' }">
                <div
                  class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-150 transition-transform shadow" />
              </div>

              <!-- Chapter Markers -->
              <template v-for="(chapter, index) in chapters">
                <div
                  :key="index"
                  class="absolute top-0 bottom-0 w-0.5 bg-white z-10 pointer-events-none"
                  :style="{ left: (chapter.start_time / duration) * 100 + '%' }"
                  v-if="chapter.start_time > 0" />
              </template>

              <!-- Hover Tooltip -->
              <div
                v-if="hoverTime !== null"
                class="absolute bottom-full mb-2 -translate-x-1/2 bg-black/90 text-white text-s px-2 py-1 rounded whitespace-nowrap pointer-events-none z-20"
                :style="{ left: hoverPosition + '%' }">
                <div class="font-mono">{{ formatTime(hoverTime) }}</div>
                <div
                  v-if="getChapterAtTime(hoverTime)"
                  class="text-gray-100 max-w-[150px] truncate">
                  {{ getChapterAtTime(hoverTime).title }}
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between">
              <!-- Left Controls -->
              <div class="flex items-center gap-4">
                <!-- Play/Pause -->
                <button
                  @click="togglePlay"
                  class="hover:text-blue-400 transition-colors">
                  <svg
                    v-if="!isPlaying"
                    class="w-8 h-8"
                    fill="currentColor"
                    viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  <svg
                    v-else
                    class="w-8 h-8"
                    fill="currentColor"
                    viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                </button>

                <!-- Volume -->
                <div class="flex items-center gap-2 group/vol">
                  <button
                    @click="volume === 0 ? player.volume(1) : player.volume(0)"
                    class="hover:text-blue-400 transition-colors">
                    <svg
                      v-if="volume === 0"
                      class="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                    <svg
                      v-else
                      class="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    :value="volume"
                    @input="onVolumeChange"
                    class="w-0 overflow-hidden group-hover/vol:w-24 transition-all duration-300 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                </div>

                <!-- Time -->
                <div class="text-sm font-mono text-gray-300">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</div>

                <!-- Chapter Name -->
                <div
                  v-if="currentChapterName"
                  class="text-sm text-gray-100 border-l border-gray-600 pl-4 truncate max-w-[200px]">
                  {{ currentChapterName }}
                </div>
              </div>

              <!-- Right Controls -->
              <div class="flex items-center gap-4">
                <button
                  @click="toggleFullscreen"
                  class="hover:text-blue-400 transition-colors">
                  <svg
                    v-if="!isFullscreen"
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  <svg
                    v-else
                    class="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M4 16v4h4m-4-4l5 5m11-5l-5 5m5-5v4h-4M4 8V4h4M4 8l5-5M16 4h4v4m-4-4l5 5" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
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
        <div class="p-4 border-b border-gray-700 font-semibold">In this video</div>
        <ul>
          <li
            v-for="(chapter, index) in chapters"
            :key="index"
            class="p-3 hover:bg-gray-700 cursor-pointer flex gap-3 text-sm transition-colors border-b border-gray-700/50 last:border-0"
            :class="{ 'bg-gray-700/50': currentChapterName === chapter.title }"
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

  .video-js .vjs-tech {
    object-fit: contain;
  }

  /* Hide default big play button since we have our own or click-to-play */
  .video-js .vjs-big-play-button {
    display: none;
  }
</style>
