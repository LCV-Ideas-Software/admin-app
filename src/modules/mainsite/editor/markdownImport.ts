import { marked } from 'marked'
import DOMPurify from 'dompurify'

export type MarkdownImportResult = {
  html: string
  title: string | null
}

const FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/

function stripFrontmatter(md: string): string {
  return md.replace(FRONTMATTER_RE, '')
}

const TRAILING_SIGNATURE_RE = /^\s*\*\*[^*\n]+\*\*\s*$/

function stripTrailingSignature(md: string): string {
  const lines = md.split(/\r?\n/)
  let i = lines.length - 1
  while (i >= 0 && lines[i].trim() === '') i--
  if (i < 0) return md
  if (!TRAILING_SIGNATURE_RE.test(lines[i])) return md
  lines.splice(i, lines.length - i)
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop()
  }
  return lines.join('\n')
}

function extractFirstH1(md: string): { title: string | null; body: string } {
  const lines = md.split(/\r?\n/)
  let i = 0
  while (i < lines.length && lines[i].trim() === '') i++
  if (i >= lines.length) return { title: null, body: md }

  const match = lines[i].match(/^#\s+(.+?)\s*#*\s*$/)
  if (!match) return { title: null, body: md }

  const title = match[1].trim()
  lines.splice(i, 1)
  while (i < lines.length && lines[i].trim() === '') {
    lines.splice(i, 1)
  }
  return { title, body: lines.join('\n') }
}

function preprocessMarkdown(md: string): string {
  let processed = md
  processed = processed.replace(/^(#{1,6})\s/gm, '### ')
  processed = processed.replace(/!\[([^\]]*)\]\([^)]+\)/g, '\n🖼️ *[Imagem não importada: $1]*\n')
  return processed
}

function postprocessHtml(html: string): string {
  let processed = html
  processed = processed.replace(/<p[^>]*>(?:<br\s*\/?>|&nbsp;|\s)*<\/p>\s*/gi, '')
  processed = processed.replace(/<p>/g, '<p style="text-align: justify; text-indent: 1.5rem">')
  processed = processed.replace(/<p style="text-align: justify; text-indent: 1.5rem">(\s*)🖼️/g, '<p style="text-align: justify">$1🖼️')
  processed = processed.replace(/<h3>/g, '<h3 style="text-align: left">')
  return processed
}

export function convertMarkdownToFormattedHtml(rawMd: string): MarkdownImportResult {
  if (!rawMd || !rawMd.trim()) {
    return { html: '', title: null }
  }

  const withoutFrontmatter = stripFrontmatter(rawMd)
  const withoutSignature = stripTrailingSignature(withoutFrontmatter)
  const { title, body } = extractFirstH1(withoutSignature)
  const prepared = preprocessMarkdown(body)
  const rawHtml = marked.parse(prepared, { async: false }) as string
  const formatted = postprocessHtml(rawHtml)
  const sanitized = DOMPurify.sanitize(formatted, {
    ADD_ATTR: ['style'],
  })

  return { html: sanitized, title }
}
