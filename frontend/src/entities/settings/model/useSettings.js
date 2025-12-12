import { useStorage } from '@vueuse/core'

export const settings = useStorage('lvp-settings', {
    volume: 1,
    lastPath: '',
    history: [],
    autoPlay: false
})

export const sortingOptions = useStorage('lvp-sorting-options', {})

export const videoProgress = useStorage('lvp-progress', {})

export const viewOptions = useStorage('lvp-view-options', {
    playlistSort: 'default',
    videoGroup: 'none',
    searchSort: 'default',
    searchGroup: 'none'
})
