import type { VercelRequest, VercelResponse } from '@vercel/node'

const PLATFORM_RULES: Record<string, {
  nameCleanup: RegExp
  labelDefault: string
  extractUsername?: (url: string) => string | null
}> = {
  'instagram.com': {
    nameCleanup: /\s*[\(\|@•·–—-]\s*(Instagram|Photos? and Videos?|on Instagram|photos et vidéos).*$/i,
    labelDefault: 'Instagram',
    extractUsername: (url) => url.match(/instagram\.com\/([^/?#]+)/)?.[1] || null,
  },
  'vimeo.com': {
    nameCleanup: /\s*[\(\|·–—-]\s*Vimeo.*$/i,
    labelDefault: 'Vimeo',
  },
  'behance.net': {
    nameCleanup: /\s*[\(\|·–—-]\s*Behance.*$/i,
    labelDefault: 'Behance',
  },
  'twitter.com': {
    nameCleanup: /\s*[\(\|·–—-]\s*(Twitter|X).*$/i,
    labelDefault: 'Twitter',
    extractUsername: (url) => url.match(/twitter\.com\/([^/?#]+)/)?.[1] || null,
  },
  'x.com': {
    nameCleanup: /\s*[\(\|·–—-]\s*(Twitter|X).*$/i,
    labelDefault: 'X',
    extractUsername: (url) => url.match(/x\.com\/([^/?#]+)/)?.[1] || null,
  },
  'linkedin.com': {
    nameCleanup: /\s*[\(\|·–—-]\s*LinkedIn.*$/i,
    labelDefault: 'LinkedIn',
  },
  'tiktok.com': {
    nameCleanup: /\s*[\(\|·–—-]\s*TikTok.*$/i,
    labelDefault: 'TikTok',
    extractUsername: (url) => url.match(/tiktok\.com\/@([^/?#]+)/)?.[1] || null,
  },
}

const SOCIAL_DOMAINS = [
  'instagram.com',
  'vimeo.com',
  'behance.net',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'tiktok.com',
  'youtube.com',
  'soundcloud.com',
  'flickr.com',
  'tumblr.com',
]

function extractMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`, 'i'),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match?.[1]?.trim() || null
}

function extractSocialLinks(html: string, sourceUrl: string): { label: string; url: string }[] {
  const links: { label: string; url: string }[] = []
  const seen = new Set<string>()

  const hrefRegex = /href=["']([^"']+)["']/gi
  let match
  while ((match = hrefRegex.exec(html)) !== null) {
    const href = match[1]
    for (const domain of SOCIAL_DOMAINS) {
      if (href.includes(domain) && !href.includes(new URL(sourceUrl).hostname)) {
        // Normalize URL
        let url = href
        if (!url.startsWith('http')) {
          try { url = new URL(url, sourceUrl).href } catch { continue }
        }
        const key = url.replace(/\/+$/, '').toLowerCase()
        if (seen.has(key)) continue
        seen.add(key)

        const rule = PLATFORM_RULES[domain]
        links.push({ label: rule?.labelDefault || domain.split('.')[0], url })
      }
    }
  }

  return links
}

function detectPlatform(url: string): { domain: string; rule: typeof PLATFORM_RULES[string] } | null {
  try {
    const hostname = new URL(url).hostname.replace('www.', '')
    for (const [domain, rule] of Object.entries(PLATFORM_RULES)) {
      if (hostname.includes(domain)) return { domain, rule }
    }
  } catch {}
  return null
}

function cleanName(raw: string, platform: ReturnType<typeof detectPlatform>): string {
  let name = raw.trim()
  if (platform?.rule.nameCleanup) {
    name = name.replace(platform.rule.nameCleanup, '')
  }
  // Generic cleanup for common patterns
  name = name.replace(/\s*[\|–—-]\s*(Portfolio|Official|Website|Home|Accueil).*$/i, '')
  return name.trim()
}

function getHostLabel(url: string): string {
  try {
    const h = new URL(url).hostname.replace('www.', '')
    return h.includes('.') ? h : 'Portfolio'
  } catch {
    return 'Portfolio'
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body || {}
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' })

  // Validate URL
  let normalizedUrl: string
  try {
    normalizedUrl = url.startsWith('http') ? url : `https://${url}`
    new URL(normalizedUrl)
  } catch {
    return res.status(400).json({ error: 'Invalid URL' })
  }

  const platform = detectPlatform(normalizedUrl)

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 6000)

    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
      },
    })
    clearTimeout(timeout)

    const html = await response.text()

    // Extract data
    const rawName = extractMeta(html, 'og:title') || extractTitle(html) || ''
    const name = cleanName(rawName, platform)
    let image_url = extractMeta(html, 'og:image') || extractMeta(html, 'twitter:image') || ''
    const description = extractMeta(html, 'og:description') || extractMeta(html, 'description') || ''
    const siteName = extractMeta(html, 'og:site_name') || ''
    const locale = extractMeta(html, 'og:locale') || ''

    // Resolve relative image URL
    if (image_url && !image_url.startsWith('http')) {
      try { image_url = new URL(image_url, normalizedUrl).href } catch {}
    }

    // Build links
    const links: { label: string; url: string }[] = []

    // Source link first
    const sourceLabel = platform?.rule.labelDefault || (siteName || getHostLabel(normalizedUrl))
    links.push({ label: sourceLabel, url: normalizedUrl })

    // Social links found on the page (skip for social platforms themselves)
    if (!platform) {
      const socialLinks = extractSocialLinks(html, normalizedUrl)
      for (const sl of socialLinks) {
        if (!links.some((l) => l.url === sl.url)) links.push(sl)
      }
    }

    // Location (best effort from locale)
    let location = ''
    if (locale) {
      const parts = locale.split('_')
      if (parts.length > 1) {
        const country = parts[1]?.toUpperCase()
        if (country && country !== 'US' && country !== 'EN') location = country
      }
    }

    const platformLabel = platform?.rule.labelDefault || (siteName || 'Portfolio')

    return res.status(200).json({
      name,
      image_url,
      notes: description.slice(0, 500),
      location,
      links,
      platform: platformLabel,
    })
  } catch {
    // On error, return minimal data with just the URL
    return res.status(200).json({
      name: '',
      image_url: '',
      notes: '',
      location: '',
      links: [{ label: platform?.rule.labelDefault || 'Lien', url: normalizedUrl }],
      platform: platform?.rule.labelDefault || 'Lien',
    })
  }
}
