import DOMPurify from 'dompurify'
import { Marked } from 'marked'

const markdown = new Marked({
  gfm: true,
  breaks: true,
  renderer: {
    html: () => '',
  },
})

const SAFE_IMAGE_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i
const SCHEME_RE = /^[a-z][a-z0-9+.-]*:/i

function isSafeUrl(value, { image = false } = {}) {
  const url = String(value || '').trim()
  if (!url) return false
  if (image && SAFE_IMAGE_DATA_URL.test(url)) return true

  if (!SCHEME_RE.test(url)) return true

  try {
    const { protocol } = new URL(url)
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:'
  } catch {
    return false
  }
}

function hardenUrls(root) {
  root.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href')
    if (!isSafeUrl(href)) {
      anchor.removeAttribute('href')
      return
    }

    if (/^https?:/i.test(href.trim())) {
      anchor.setAttribute('target', '_blank')
      anchor.setAttribute('rel', 'noopener noreferrer')
    }
  })

  root.querySelectorAll('img[src]').forEach((image) => {
    if (!isSafeUrl(image.getAttribute('src'), { image: true })) {
      image.remove()
    }
  })
}

export function renderMarkdown(value) {
  const unsafeHtml = markdown.parse(value || '')
  const cleanHtml = DOMPurify.sanitize(unsafeHtml, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: ['iframe', 'object', 'embed', 'script', 'style'],
    FORBID_ATTR: ['srcdoc'],
  })

  const template = document.createElement('template')
  template.innerHTML = cleanHtml
  hardenUrls(template.content)
  return template.innerHTML
}
