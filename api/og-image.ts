import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { url } = req.body || {}
  if (!url || typeof url !== 'string') return res.status(400).json({ error: 'url required' })

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
    })
    clearTimeout(timeout)

    const html = await response.text()

    // 1. Try og:image
    let imageUrl = extractMeta(html, 'og:image')
    // 2. Try twitter:image
    if (!imageUrl) imageUrl = extractMeta(html, 'twitter:image')
    // 3. Try first relevant <img>
    if (!imageUrl) imageUrl = extractRelevantImg(html)

    // Resolve relative URLs
    if (imageUrl && !imageUrl.startsWith('http')) {
      try {
        imageUrl = new URL(imageUrl, url).href
      } catch {}
    }

    return res.status(200).json({ imageUrl: imageUrl || null })
  } catch {
    return res.status(200).json({ imageUrl: null })
  }
}

function extractMeta(html: string, property: string): string | null {
  // Match both property="og:image" and name="twitter:image"
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

function extractRelevantImg(html: string): string | null {
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi
  let match
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1]
    if (/profile|avatar|photo|portrait|headshot|thumb/i.test(match[0])) {
      return src
    }
  }
  return null
}
