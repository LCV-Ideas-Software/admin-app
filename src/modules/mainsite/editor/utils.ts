export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

export const formatImageUrl = (url: string): string => {
  if (!url) return ''
  const driveRegex = /(?:file\/d\/|open\?id=|uc\?id=)([a-zA-Z0-9_-]+)/
  const match = url.match(driveRegex)
  if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`
  return url
}

export const isYoutubeUrl = (url: string): boolean =>
  /(?:youtube\.com|youtu\.be)\//i.test(url)