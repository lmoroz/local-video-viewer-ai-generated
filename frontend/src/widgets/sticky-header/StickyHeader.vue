<script setup>
  import { useRouter } from 'vue-router'

  const router = useRouter()

  const props = defineProps({
    to: Object,
    toTitle: String,
    pageTitle: String,
    pageDescr: String
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
  <div
    class="sticky z-50 bg-gradient-to-r from-slate-900/50 via-gray-900/50 to-black/50 backdrop-blur-md backdrop-saturate-150 mb-6 border-b border-gray-700 flex flex-wrap items-center py-1 justify-between gap-4 px-6 top-[var(--title-bar-height)]">
    <HomeButton />
    <div class="h-8 w-px bg-gray-700 mx-2" />
    <router-link
      :to
      class="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-gray-300 hover:text-white">
      <i class="bi bi-arrow-left text-xl" />
      <span
        v-if="toTitle"
        class="font-medium">
        {{ toTitle }}
      </span>
    </router-link>
    <div class="flex flex-col flex-1 min-w-0">
      <h1 class="text-xl font-bold text-white truncate">{{ pageTitle }}</h1>
      <span
        v-if="pageDescr"
        class="text-xs text-gray-500 font-mono truncate">
        {{ pageDescr }}
      </span>
    </div>
    <div class="w-64 flex-shrink-0">
      <SearchInput @search="handleSearch" />
    </div>
  </div>
</template>

<style scoped></style>
