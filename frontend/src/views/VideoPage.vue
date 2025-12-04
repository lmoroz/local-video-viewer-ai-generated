<script setup>
  import { ref, onUnmounted, computed, watch, nextTick } from 'vue'
  import { useRouter } from 'vue-router'
  import videojs from 'video.js'
  import 'video.js/dist/video-js.css'
  import api from '../api'
  import SearchInput from '../components/SearchInput.vue'
  import { formatDuration } from '../utils.js'

  const props = defineProps({
    videoId: String,
    dir: String,
    playlistId: String
  })

  const router = useRouter()
  const videoPlayer = ref(null)
  const player = ref(null)
  const videoData = ref(null)
  const playlistTitle = ref('')
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
    const current = [...chapters.value].reverse().find(c => c.start_time <= currentTime.value)
    return current ? current.title : ''
  })

  // Playlist Sidebar Logic
  const playlistVideos = ref([])
  const autoPlay = ref(false)
  const isShuffled = ref(false)
  const shuffledVideos = ref([])

  const displayVideos = computed(() => {
    return isShuffled.value ? shuffledVideos.value : playlistVideos.value
  })

  const currentVideoIndex = computed(() => {
    return displayVideos.value.findIndex(v => v.id === props.videoId || v.filename === props.videoId)
  })

  const toggleShuffle = () => {
    isShuffled.value = !isShuffled.value
    if (isShuffled.value) {
      shuffledVideos.value = [...playlistVideos.value].sort(() => Math.random() - 0.5)
    }
  }

  const handleVideoEnd = () => {
    localStorage.removeItem(`video-progress-${props.videoId}`)
    if (autoPlay.value) {
      const nextIndex = currentVideoIndex.value + 1
      if (nextIndex < displayVideos.value.length) {
        const nextVideo = displayVideos.value[nextIndex]
        router.push({
          name: 'Video',
          params: { videoId: nextVideo.id || nextVideo.filename, playlistId: props.playlistId },
          query: { dir: props.dir }
        })
      }
    }
  }

  const loadVideoData = async () => {
    if (!props.playlistId || !props.dir) return
    if (player.value) player.value.pause()
    console.log('[loadVideoData] props.playlistId, props.dir = ', props.playlistId, props.dir)
    try {
      const response = await api.getPlaylistDetails(props.playlistId, props.dir)
      playlistVideos.value = response.data.videos.map((v, i) => ({ ...v, originalIndex: i }))
      playlistTitle.value = response.data.title || props.playlistId

      const found = playlistVideos.value.find(v => v.id === props.videoId || v.filename === props.videoId)
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
  }

  const initPlayer = data => {
    if (!videoPlayer.value) return
    console.log('[initPlayer] videoPlayer.value = ', videoPlayer.value)
    console.log('[initPlayer] data = ', data)
    const newPlayer = !player.value

    const src = api.getFileUrl(data.path)
    console.log('[initPlayer] src = ', src)
    if (player.value) {
      player.value.poster(api.getFileUrl(videoData.value.thumbnail))
      player.value.src([
        {
          src: src,
          type: 'video/mp4'
        }
      ])

      console.log('[initPlayer] set new poster and src', player.value)
      player.value.load()
    } else {
      player.value = videojs(videoPlayer.value, {
        fluid: false,
        controls: false, // Hide default controls
        autoplay: true,
        sources: [
          {
            src: src,
            type: 'video/mp4'
          }
        ]
      })

      console.log('[initPlayer] videoPlayer.value = ', videoPlayer.value)
      console.log('[initPlayer] player.value = ', player.value)

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
      player.value.on('durationchange', () => {
        duration.value = player.value.duration()

        console.log(
          '%c [initPlayer] on durationchange ',
          'color: yellow',
          `video-progress-${props.videoId}`,
          localStorage.getItem(`video-progress-${props.videoId}`)
        )
        console.log('%c [initPlayer] on durationchange player.value.duration() = ', 'color: yellow', player.value.duration())

        const savedTime = localStorage.getItem(`video-progress-${props.videoId}`)
        if (savedTime) {
          const time = parseFloat(savedTime)
          // If within 30 seconds of end, start from beginning
          if (time < player.value.duration() - 10) player.value.currentTime(time - 10)
          if (!newPlayer) player.value.play()
        }
      })
      player.value.on('volumechange', () => {
        const vol = player.value.volume()
        volume.value = vol
        localStorage.setItem('video-volume', vol)
      })

      player.value.on('ratechange', () => (playbackRate.value = player.value.playbackRate()))

      player.value.on('ended', handleVideoEnd)
      player.value.on('fullscreenchange', () => (isFullscreen.value = player.value.isFullscreen()))

      player.value.load()
    }

    player.value.on('timeupdate', () => {
      const time = player.value.currentTime()
      currentTime.value = time
      // Save progress
      if (time > 0) localStorage.setItem(`video-progress-${props.videoId}`, time)
    })
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

  watch(() => [props.playlistId, props.dir, props.videoId], loadVideoData, { deep: true, immediate: true })

  onUnmounted(() => {
    if (player.value) {
      player.value.dispose()
    }
    if (controlsTimeout) clearTimeout(controlsTimeout)
  })
</script>

<template>
  <div class="min-h-screen text-white">
    <!-- Header -->
    <div class="sticky top-0 z-20 p-4 flex items-center gap-4 shadow-md">
      <router-link
        :to="{
          name: 'Playlist',
          params: { id: props.playlistId },
          query: { dir: props.dir }
        }"
        class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
        <i class="bi bi-arrow-left text-xl" />
        <span class="font-medium">{{ playlistTitle }}</span>
      </router-link>
      <div class="h-6 w-px bg-gray-700 mx-2" />
      <h1 class="text-lg font-semibold truncate text-gray-100 flex-1">{{ videoData?.title || videoId }}</h1>
      <div class="w-64">
        <SearchInput @search="handleSearch" />
      </div>
    </div>

    <div class="flex flex-col lg:flex-row overflow-hidden gap-9 px-7">
      <!-- Left Column: Video + Info (Scrollable) -->
      <div class="flex-1 bg-black custom-scrollbar">
        <!-- Player Section -->
        <div
          class="chapters relative aspect-video w-full border border-gray-800 rounded-xl overflow-hidden"
          @mousemove="handleMouseMove"
          @mouseleave="showControls = false">
          <div class="absolute inset-0 rounded-lg">
            <video
              v-if="videoData"
              ref="videoPlayer"
              class="video-js h-full rounded-lg"
              :poster="api.getFileUrl(videoData.thumbnail)"
              preload="auto"
              autoplay
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
                    <i
                      v-if="!isPlaying"
                      class="bi bi-play-fill text-3xl" />
                    <i
                      v-else
                      class="bi bi-pause-fill text-3xl" />
                  </button>

                  <!-- Volume -->
                  <div class="flex items-center gap-2 group/vol">
                    <button
                      @click="volume === 0 ? player.volume(1) : player.volume(0)"
                      class="hover:text-blue-400 transition-colors">
                      <i
                        v-if="volume === 0"
                        class="bi bi-volume-mute text-xl" />
                      <i
                        v-else
                        class="bi bi-volume-up text-xl" />
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
                    class="text-sm text-gray-100 border-l border-gray-800 hover:bg-gray-8 00/90 rounded-lg px-4 py-1 cursor-pointer"
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
                    <i
                      v-if="!isFullscreen"
                      class="bi bi-fullscreen text-xl" />
                    <i
                      v-else
                      class="bi bi-fullscreen-exit text-xl" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Info Section (Below player) -->
        <div class="p-8">
          <h2 class="text-2xl font-bold mb-4 text-white">{{ videoData?.title }}</h2>
          <div class="flex items-center gap-6 text-gray-400 mb-6 text-sm border-b border-gray-800 pb-4">
            <span class="flex items-center gap-2">
              <i class="bi bi-person" />
              <a
                :href="videoData?.uploader_url ?? videoData?.channel_url"
                target="_blank"
                rel="noreferrer">
                {{ videoData?.uploader }}
              </a>
            </span>
            <span class="flex items-center gap-2">
              <i class="bi bi-calendar" />
              {{ formatDate(videoData?.upload_date) }}
            </span>
          </div>
          <div class="prose prose-invert max-w-none whitespace-pre-wrap text-gray-300">
            {{ videoData?.description }}
          </div>
        </div>
      </div>

      <div class="lg:w-96 flex flex-col gap-6">
        <!-- Chapters Sidebar (Fixed Right) -->
        <div
          v-if="chapters && chapters.length > 0 && chaptersVisible"
          class="chapters bg-linear-to-b from-gray-900/95 to-transparent border border-gray-600 overflow-y-auto flex-shrink-0 custom-scrollbar rounded-xl">
          <div class="p-4 border-b border-gray-700 font-semibold bg-gray-900/95 sticky top-0 z-10 flex items-center justify-between">
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
              <div class="font-mono inline-block p-1 mt-1 bg-black/90 text-gray-400 font-medium group-hover:text-blue-300 rounded-sm">
                {{ formatTime(chapter.start_time) }}
              </div>
            </li>
          </ul>
        </div>

        <!-- Playlist Sidebar (Fixed Right, below chapters or standalone) -->
        <div
          class="playlist-sidebar lg:w-96 bg-linear-to-b from-gray-900/95 to-transparent border border-gray-600 overflow-hidden flex-shrink-0 custom-scrollbar rounded-xl flex flex-col"
          :class="{ 'mt-4': chapters && chapters.length > 0 && chaptersVisible }">
          <div class="p-4 border-b border-gray-700 font-semibold bg-gray-900/95 flex items-center justify-between sticky top-0 z-10">
            <span>Playlist</span>
            <div class="flex items-center gap-2">
              <button
                @click="toggleShuffle"
                class="p-2 rounded hover:bg-gray-700 transition-colors"
                :class="{ 'text-blue-400': isShuffled, 'text-gray-400': !isShuffled }"
                title="Shuffle">
                <i class="bi bi-shuffle" />
              </button>
              <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  v-model="autoPlay"
                  class="rounded bg-gray-700 border-gray-600 text-blue-600 focus:ring-blue-500" />
                Auto-play
              </label>
            </div>
          </div>
          <div class="overflow-y-auto custom-scrollbar flex-1">
            <router-link
              v-for="video in displayVideos"
              :key="video.originalIndex"
              :to="{
                name: 'Video',
                params: { videoId: video.id || video.filename, playlistId: props.playlistId },
                query: { dir: props.dir }
              }"
              class="flex gap-3 p-3 hover:bg-gray-700/50 transition-colors border-b border-gray-700/30 last:border-0 group"
              :class="{ 'bg-blue-900/20 border-l-2 border-l-blue-500': (video.id || video.filename) === videoId }">
              <div class="w-24 aspect-video bg-gray-800 rounded overflow-hidden flex-shrink-0 relative">
                <img
                  v-if="video.thumbnail"
                  :src="api.getFileUrl(video.thumbnail)"
                  class="w-full h-full object-cover" />
                <div
                  v-else
                  class="w-full h-full flex items-center justify-center text-gray-500">
                  <i class="bi bi-play-circle" />
                </div>
                <div class="absolute bottom-0.5 right-0.5 bg-black/80 text-white text-[10px] px-1 rounded font-mono">
                  {{ formatDuration(video.duration) }}
                </div>
              </div>
              <div class="flex-1 min-w-0 flex flex-col justify-center">
                <div
                  class="text-sm font-medium group-hover:text-blue-300 transition-colors"
                  :class="{ 'text-blue-400': (video.id || video.filename) === videoId, 'text-gray-200': (video.id || video.filename) !== videoId }">
                  {{ video.title }}
                </div>
                <div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
                  <span
                    v-if="video.uploader"
                    class="truncate max-w-[100px]">
                    {{ video.uploader }}
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
