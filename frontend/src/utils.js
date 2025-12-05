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

export { formatDuration, formatDescription }
