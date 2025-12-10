<script setup>
  import { ref, onUnmounted, watch, nextTick } from 'vue'
  import videojs from 'video.js'
  import 'video.js/dist/video-js.css'
  import api from '@/api'
  import { formatTime } from '@/utils'
  import { settings, videoProgress } from '@/composables/useSettings'

  const props = defineProps({
    videoData: {
      type: Object,
      required: true
    },
    chapters: {
      type: Array,
      default: () => []
    },
    currentChapterName: {
      type: String,
      default: ''
    }
  })

  const emit = defineEmits(['timeupdate', 'durationchange', 'ended', 'play', 'pause', 'fullscreenchange', 'toggleChapters'])

  const videoPlayer = ref(null)
  const player = ref(null)
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const volume = ref(1)
  const isFullscreen = ref(false)
  const showControls = ref(false)
  const playbackRate = ref(1)
  const showSpeedMenu = ref(false)
  const customSpeed = ref(1)
  const hoverTime = ref(null)
  const hoverPosition = ref(0)
  let controlsTimeout = null

  const restoreVideoProgress = () => {
    const id = props.videoData.id || props.videoData.filename
    const savedTime = videoProgress.value[id]
    if (savedTime) {
      console.log('%c[VideoPlayer] restoreVideoProgress', 'color: yellow', id, savedTime)
      const time = parseFloat(savedTime)
      const newDuration = player.value.duration()
      // If within 30 seconds of end, start from beginning
      if (time < newDuration - 10) player.value.currentTime(time - 10)
    }
  }

  const playerOnDurationchange = () => {
    duration.value = player.value.duration()
    console.log('%c[VideoPlayer] playerOnDurationchange', 'color: yellow', props.videoData.id, duration.value)
    emit('durationchange', duration.value)
    restoreVideoProgress()
  }
  const playerOnVolumeChange = () => {
    const vol = player.value.volume()
    volume.value = vol
    settings.value.volume = vol
  }
  const playerOnRatechange = () => (playbackRate.value = player.value.playbackRate())
  const playerOnTimeupdate = () => {
    const time = player.value.currentTime()
    currentTime.value = time
    // Save progress
    if (time > 0) {
      const id = props.videoData.id || props.videoData.filename
      videoProgress.value[id] = time
    }
    emit('timeupdate', time)
  }

  const initPlayer = () => {
    if (!videoPlayer.value) return

    const src = api.getFileUrl(props.videoData.path)
    // Dispose existing player if any (though usually we reuse or component is remounted)
    if (player.value) {
      player.value.poster(api.getFileUrl(props.videoData.thumbnail))
      player.value.src([
        {
          src: src,
          type: 'video/mp4'
        }
      ])

      console.log('[initPlayer] set new poster and src', player.value)
      player.value.load()
      player.value.play()
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

      // Restore volume
      if (settings.value.volume !== undefined) {
        const vol = parseFloat(settings.value.volume)
        player.value.volume(vol)
        volume.value = vol
      } else {
        volume.value = player.value.volume()
        settings.value.volume = volume.value
      }

      // Event Listeners
      player.value.on('play', () => {
        isPlaying.value = true
        emit('play')
      })

      player.value.on('pause', () => {
        isPlaying.value = false
        emit('pause')
      })

      player.value.on('ended', () => emit('ended'))

      player.value.on('durationchange', playerOnDurationchange)
      player.value.on('volumechange', playerOnVolumeChange)
      player.value.on('ratechange', playerOnRatechange)
      player.value.on('timeupdate', playerOnTimeupdate)
      player.value.on('fullscreenchange', () => {
        isFullscreen.value = player.value.isFullscreen()
        emit('fullscreenchange', isFullscreen.value)
      })
    }
  }

  const togglePlay = () => {
    if (player.value) {
      if (player.value.paused()) player.value.play()
      else player.value.pause()
    }
  }

  const toggleFullscreen = () => {
    if (player.value) {
      if (player.value.isFullscreen()) player.value.exitFullscreen()
      else player.value.requestFullscreen()
    }
  }

  const onVolumeChange = e => {
    const val = parseFloat(e.target.value)
    if (player.value) player.value.volume(val)
  }

  const setPlaybackRate = rate => {
    if (player.value) {
      player.value.playbackRate(rate)
      showSpeedMenu.value = false
    }
  }

  const applyCustomSpeed = () => {
    const rate = parseFloat(customSpeed.value)
    if (!isNaN(rate) && rate > 0) setPlaybackRate(rate)
  }

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

  const handleMouseMove = () => {
    showControls.value = true
    if (controlsTimeout) clearTimeout(controlsTimeout)
    controlsTimeout = setTimeout(() => {
      if (isPlaying.value) showControls.value = false
    }, 3000)
  }

  const getChapterAtTime = time => {
    if (!props.chapters.length) return null
    return [...props.chapters].reverse().find(c => c.start_time <= time)
  }

  const seekTo = time => {
    if (player.value) {
      player.value.currentTime(time)
      player.value.play()
    }
  }

  // Expose seekTo for parent if needed (e.g. from chapters sidebar)
  defineExpose({ seekTo })

  watch(
    () => props.videoData,
    newData => {
      if (newData) {
        nextTick(() => {
          initPlayer()
        })
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (player.value) {
      player.value.dispose()
    }
    if (controlsTimeout) clearTimeout(controlsTimeout)
  })
</script>

<template>
  <div
    class="chapters relative aspect-video w-full border border-gray-800 rounded-xl overflow-hidden"
    @mousemove="handleMouseMove"
    @mouseleave="showControls = false">
    <div class="absolute inset-0 rounded-lg">
      <video
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
              class="text-sm text-gray-100 border-l border-gray-800 hover:bg-gray-800/90 rounded-lg px-4 py-1 cursor-pointer"
              @click="emit('toggleChapters')">
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
</template>

<style scoped>
  .video-js {
    width: 100%;
    height: 100%;
  }

  .video-js :deep(.vjs-tech) {
    object-fit: contain;
  }

  .video-js :deep(.vjs-big-play-button) {
    display: none;
  }
</style>
