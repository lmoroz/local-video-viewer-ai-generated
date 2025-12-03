<script setup>
  import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
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
  const chaptersVisible = ref(true)

  // Player State
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)
  const isFullscreen = ref(false)
  const showControls = ref(false)
  const playbackRate = ref(1)
  const showSpeedMenu = ref(false)
  const customSpeed = ref(1)
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
        document.title = videoData.value.title
        nextTick(() => {
          initPlayer(videoData.value)
        })
      }
    } catch (err) {
      console.error('Failed to load video data', err)
    }
  })

  const initPlayer = data => {
    if (!videoPlayer.value) return

    const src = api.getFileUrl(data.path)

    player.value = videojs(videoPlayer.value, {
      fluid: false,
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

    player.value.on('ratechange', () => (playbackRate.value = player.value.playbackRate()))
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

  const setPlaybackRate = rate => {
    if (player.value) {
      player.value.playbackRate(rate)
      showSpeedMenu.value = false
    }
  }

  const applyCustomSpeed = () => {
    const rate = parseFloat(customSpeed.value)
    if (!isNaN(rate) && rate > 0) {
      setPlaybackRate(rate)
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
    <div class="sticky top-0 z-20 p-4 flex items-center gap-4 shadow-md">
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

    <div class="flex flex-col lg:flex-row overflow-hidden gap-9 px-7">
      <!-- Left Column: Video + Info (Scrollable) -->
      <div class="flex-1 bg-black custom-scrollbar">
        <!-- Player Section -->
        <div
          class="chapters relative group aspect-video w-full rounded-lg overflow-hidden"
          @mousemove="handleMouseMove"
          @mouseleave="showControls = false">
          <div class="absolute inset-0 rounded-lg">
            <video
              v-if="videoData"
              ref="videoPlayer"
              class="video-js h-full rounded-lg"
              :poster="api.getFileUrl(videoData.thumbnail)"
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
                  class="absolute top-0 left-0 bottom-0 bg-red-800 rounded transition-all"
                  :style="{ width: (currentTime / duration) * 100 + '%' }">
                  <div
                    class="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full scale-0 group-hover/progress:scale-100 transition-transform shadow" />
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
                  class="absolute bottom-full mb-2 -translate-x-1/2 bg-black/90 text-white text-s px-2 py-1 rounded pointer-events-none z-20"
                  :style="{ left: hoverPosition + '%' }">
                  <div class="font-mono">{{ formatTime(hoverTime) }}</div>
                  <div
                    v-if="getChapterAtTime(hoverTime)"
                    class="text-gray-400 max-w-[150px]">
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
                    class="text-sm text-gray-100 border-l border-gray-600 hover:bg-gray-400 rounded-lg px-4 py-1 cursor-pointer"
                    @click="chaptersVisible = !chaptersVisible">
                    {{ currentChapterName }}
                  </div>
                </div>

                <!-- Right Controls -->
                <div class="flex items-center gap-4">
                  <!-- Speed Control -->
                  <div class="relative">
                    <button
                      @click="showSpeedMenu = !showSpeedMenu"
                      class="hover:text-blue-400 transition-colors font-medium w-12 text-center text-sm">
                      {{ playbackRate }}x
                    </button>

                    <!-- Speed Popup -->
                    <div
                      v-if="showSpeedMenu"
                      class="absolute bottom-full right-0 mb-4 bg-gray-800 rounded-lg shadow-xl p-2 w-48 z-30 border border-gray-700">
                      <div class="flex flex-col gap-1 max-h-60 overflow-y-auto custom-scrollbar">
                        <button
                          v-for="rate in [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4]"
                          :key="rate"
                          @click="setPlaybackRate(rate)"
                          class="px-3 py-1 text-left hover:bg-gray-700 rounded text-sm transition-colors"
                          :class="{ 'text-blue-400 font-bold': playbackRate === rate, 'text-gray-300': playbackRate !== rate }">
                          {{ rate }}x
                        </button>
                      </div>
                      <div class="border-t border-gray-700 mt-2 pt-2 px-1">
                        <div class="text-xs text-gray-400 mb-1">Custom Speed</div>
                        <div class="flex gap-2">
                          <input
                            type="number"
                            v-model="customSpeed"
                            step="0.1"
                            min="0.1"
                            class="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none"
                            @keyup.enter="applyCustomSpeed" />
                          <button
                            @click="applyCustomSpeed"
                            class="bg-blue-600 hover:bg-blue-500 text-white px-2 rounded text-sm transition-colors">
                            Go
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
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
        </div>

        <!-- Info Section (Below player) -->
        <div class="p-8 bg-gray-900">
          <h2 class="text-2xl font-bold mb-4 text-white">{{ videoData?.title }}</h2>
          <div class="flex items-center gap-6 text-gray-400 mb-6 text-sm border-b border-gray-800 pb-4">
            <span class="flex items-center gap-2">
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
              <a
                :href="videoData?.uploader_url ?? videoData?.channel_url"
                target="_blank"
                rel="noreferrer">
                {{ videoData?.uploader }}
              </a>
            </span>
            <span class="flex items-center gap-2">
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
              {{ formatDate(videoData?.upload_date) }}
            </span>
          </div>
          <div class="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300">
            {{ videoData?.description }}
          </div>
        </div>
      </div>

      <!-- Chapters Sidebar (Fixed Right) -->
      <div
        v-if="chapters && chapters.length > 0 && chaptersVisible"
        class="chapters lg:w-96 bg-gray-800 border-l border-gray-700 overflow-y-auto flex-shrink-0 custom-scrollbar rounded-lg">
        <div class="p-4 border-b border-gray-700 font-semibold bg-gray-800 sticky top-0 z-10 flex items-center justify-between">
          <span>In this video</span>
          <button
            class="w-10 h-10 rounded-lg text-6xl bg-transparent hover:bg-gray-700 inline-flex items-center justify-center cursor-pointer"
            @click="chaptersVisible = !chaptersVisible">
            <i class="bi bi-x text-xl text-white" />
          </button>
        </div>
        <ul>
          <li
            v-for="(chapter, index) in chapters"
            :key="index"
            class="px-3 py-2 hover:bg-gray-700 cursor-pointer text-sm transition-colors border-b border-gray-700/50 last:border-0"
            :class="{ 'bg-gray-700/50': currentChapterName === chapter.title }"
            @click="seekTo(chapter.start_time)">
            <div class="text-gray-300 font-bold group-hover:text-white">{{ chapter.title }}</div>
            <div class="font-mono inline-block p-1 mt-1 bg-gray-700 text-blue-400 font-medium group-hover:text-blue-300 rounded-md">
              {{ formatTime(chapter.start_time) }}
            </div>
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

  .chapters {
    max-height: calc(100vh - 200px);
  }
</style>
