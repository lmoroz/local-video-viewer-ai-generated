const formatDuration = seconds => {
  if (!seconds) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}ч ${m.toString().padStart(2, '0')}м ${s.toString().padStart(2, '0')}с`
  }
  if (m > 0) {
    return `${m.toString().padStart(2, '0')}м ${s.toString().padStart(2, '0')}с`
  }
  return `${s.toString().padStart(2, '0')}с`
}

const trimText = (text, len = 55) => {
  return text.length > len ? text.slice(0, len - 1) + ' …' : text
}

const formatDescription = text => {
  if (!text) return ''
  const matches = text.match(/(https?:\/\/\S+)/g)
  if (!matches) return text
  Array.from(matches).forEach(linkUrl => {
    const linkText = trimText(linkUrl)
    text = text.replace(linkUrl, `<a href="${linkUrl}" target="_blank" rel="noopener" class="text-blue-700">${linkText}</a>`)
  })
  return text.replace(/\n/g, '<br>')
}
const formatTime = seconds => {
  if (!seconds && seconds !== 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  if (m > 0) return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `0:${s.toString().padStart(2, '0')}`
}

const formatDate = dateStr => {
  if (!dateStr || dateStr.length !== 8) return dateStr
  const y = dateStr.substring(0, 4)
  const m = dateStr.substring(4, 6)
  const d = dateStr.substring(6, 8)
  return `${d}.${m}.${y}`
}

const sortVideos = (videos, sortBy) => {
  const sorted = [...videos]
  switch (sortBy) {
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
      return sorted.sort((a, b) => (a.originalIndex || 0) - (b.originalIndex || 0))
  }
}

export { formatDuration, formatDescription, formatTime, formatDate, sortVideos }
