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

  const fallback = {
    name: '',
    image_url: '',
    notes: '',
    location: '',
    links: [{ label: 'Source', url }],
    pins: [],
    platform: 'Unknown',
    suggested_disciplines: [] as string[],
    suggested_tags: [] as string[],
  }

  // 1. Try to fetch the page
  let extracted: string | null = null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
      },
      redirect: 'follow',
    })
    clearTimeout(timeout)
    const html = await response.text()
    extracted = extractRelevantContent(html, url)
  } catch (fetchErr: any) {
    // Page inaccessible — on tentera Claude avec l'URL seule
    extracted = `URL: ${url}\n\nLe site n'a pas pu être récupéré (erreur: ${fetchErr.message}). Déduis le maximum depuis la structure de l'URL seule.`
  }

  // 2. Analyze with Claude + enrich with web search
  try {
    const analysis = await analyzeWithClaude(extracted, url)
    const enriched = await enrichWithWebSearch(analysis, url)
    filterLogoImage(enriched)
    return res.status(200).json(enriched)
  } catch (claudeErr: any) {
    return res.status(200).json({
      ...fallback,
      _debug_error: claudeErr?.message || String(claudeErr),
      _debug_stack: claudeErr?.stack?.slice(0, 500) || '',
    })
  }
}

// ─── Extract relevant content from HTML ───
function extractRelevantContent(html: string, url: string): string {
  // Extraire les meta tags
  const metas: string[] = []
  const metaRegex = /<meta[^>]*>/gi
  let match
  while ((match = metaRegex.exec(html)) !== null) {
    metas.push(match[0])
  }

  // Extraire le <title>
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  const title = titleMatch?.[1]?.trim() || ''

  // Extraire tous les liens <a href>
  const links: string[] = []
  const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
  while ((match = linkRegex.exec(html)) !== null && links.length < 50) {
    const href = match[1]
    const text = match[2].replace(/<[^>]*>/g, '').trim()
    if (href && (href.startsWith('http') || href.startsWith('/'))) {
      links.push(`${text} → ${href}`)
    }
  }

  // Extraire du texte visible (body, limité)
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)
  let bodyText = ''
  if (bodyMatch) {
    bodyText = bodyMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000)
  }

  // Assembler le contexte pour Claude (max ~6000 chars)
  return [
    `URL: ${url}`,
    `Title: ${title}`,
    `Meta tags:\n${metas.join('\n')}`,
    `Links found:\n${links.slice(0, 30).join('\n')}`,
    `Body text (truncated):\n${bodyText}`,
  ].join('\n\n').slice(0, 6000)
}

// ─── Analyze with Claude API ───
async function analyzeWithClaude(content: string, originalUrl: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not set')
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: `Tu es un assistant qui analyse des pages web pour extraire des informations sur des artistes/créatifs.

Analyse le contenu suivant et retourne UNIQUEMENT un JSON valide (pas de markdown, pas de backticks, pas de texte avant ou après).

Contenu de la page :
---
${content}
---

URL source : ${originalUrl}

Détermine :
1. **C'est quoi cette page ?** Un profil artiste, une page projet/œuvre, un article, un portfolio ?
2. **Qui est l'artiste principal ?** (le créateur, pas la galerie ni la plateforme)
3. **Si c'est une page projet/œuvre** : quel est le nom du projet ? (ça deviendra un "pin")

Retourne ce JSON :
{
  "name": "Nom de l'artiste (propre, sans suffixes plateforme)",
  "image_url": "URL de l'image la plus représentative (og:image ou autre), URL absolue",
  "notes": "Description courte de l'artiste ou du projet, 1-2 phrases max, en français si possible",
  "location": "Ville, Pays si trouvable (sinon chaîne vide)",
  "platform": "Nom de la plateforme ou 'Portfolio' si site perso",
  "page_type": "profile | project | article | other",
  "project_name": "Nom du projet si page_type=project, sinon null",
  "links": [
    {"label": "Nom plateforme", "url": "URL source"},
    ...autres liens sociaux/portfolio trouvés sur la page
  ],
  "suggested_disciplines": ["parmi: Photographe, Réalisateur, Writer, Artiste visuel, Net Art"],
  "suggested_tags": ["tags pertinents déduits du contenu, max 5"]
}

RÈGLES :
- Retourne UNIQUEMENT le JSON, rien d'autre
- Si tu ne trouves pas une info, mets une chaîne vide ou un array vide
- Les URLs dans links doivent être absolues
- Pour image_url, privilégie og:image
- Pour les liens sociaux, ne mets que ceux que tu trouves réellement dans le contenu
- suggested_disciplines : déduis du contenu (photo, vidéo, texte, art numérique, net art...)
- suggested_tags : déduis du style, medium, thèmes (ex: "generative art", "landscape", "AI art")
- Le lien source (${originalUrl}) doit TOUJOURS être dans links`,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Anthropic API ${response.status}: ${errorBody.slice(0, 300)}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text || '{}'

  // Parser le JSON (nettoyer les éventuels backticks)
  const clean = text.replace(/```json\s*|```\s*/g, '').trim()
  let parsed
  try {
    parsed = JSON.parse(clean)
  } catch {
    throw new Error('Failed to parse Claude response')
  }

  // Transformer en format attendu par le frontend
  const result = {
    name: parsed.name || '',
    image_url: parsed.image_url || '',
    notes: parsed.notes || '',
    location: parsed.location || '',
    platform: parsed.platform || 'Unknown',
    links: Array.isArray(parsed.links) ? parsed.links : [{ label: 'Source', url: originalUrl }],
    pins: [] as { label: string; url: string }[],
    page_type: parsed.page_type || 'other',
    project_name: parsed.project_name || null,
    suggested_disciplines: Array.isArray(parsed.suggested_disciplines) ? parsed.suggested_disciplines : [],
    suggested_tags: Array.isArray(parsed.suggested_tags) ? parsed.suggested_tags : [],
  }

  // Si c'est une page projet, ajouter comme pin au lieu de lien principal
  if (parsed.page_type === 'project' && parsed.project_name) {
    result.pins = [{ label: parsed.project_name, url: originalUrl }]
    // Retirer l'URL source des links puisqu'elle est dans pins
    result.links = result.links.filter((l: { url: string }) => l.url !== originalUrl)
    // Ajouter le site racine comme lien portfolio si pas déjà là
    try {
      const rootUrl = new URL(originalUrl).origin
      if (!result.links.some((l: { url: string }) => l.url.startsWith(rootUrl))) {
        result.links.unshift({ label: 'Portfolio', url: rootUrl })
      }
    } catch { /* ignore */ }
  }

  return result
}

// ─── Filter out platform logo images ───
const LOGO_PATTERNS = [
  'instagram.com/static',
  'instagram.com/images',
  'cdninstagram.com',
  'static.cdninstagram.com',
  'scontent.cdninstagram.com',
  'facebook.com',
  'vimeo.com/webmaster',
  'behance.net/img',
  'static.xx.fbcdn',
  'twimg.com/profile_banners',
  'pbs.twimg.com/profile_images',
  'abs.twimg.com',
  '/favicon',
  '/logo',
  '/brand',
  'placeholder',
  'default_profile',
]

function filterLogoImage(result: any) {
  if (result.image_url && LOGO_PATTERNS.some((p) => result.image_url.includes(p))) {
    result.image_url = ''
  }
}

// ─── Enrich with web search (pass 2) ───
async function enrichWithWebSearch(
  initialResult: any,
  originalUrl: string
): Promise<any> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || !initialResult.name) return initialResult

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Tu es un assistant de recherche pour un curateur d'art.

J'ai identifié un artiste nommé "${initialResult.name}" depuis l'URL ${originalUrl}.

Voici ce que je sais déjà :
- Nom : ${initialResult.name}
- Localisation : ${initialResult.location || 'inconnue'}
- Notes : ${initialResult.notes || 'aucune'}
- Disciplines : ${(initialResult.suggested_disciplines || []).join(', ') || 'inconnues'}
- Liens trouvés : ${(initialResult.links || []).map((l: any) => l.url).join(', ')}

Fais une recherche web en cherchant '${initialResult.name}' ET '${initialResult.name} artist' ET '${initialResult.name} photographer/director/writer' pour maximiser les chances de trouver le bon profil.

Trouve :
1. Son site web personnel/portfolio (PAS des pages de galeries tierces)
2. Ses réseaux sociaux (Instagram, Vimeo, Behance, Twitter/X, LinkedIn)
3. Sa localisation (ville, pays)
4. Un email de contact si public
5. Une courte bio (2-3 phrases)
6. Des disciplines/tags plus précis

IMPORTANT pour le nom :
- Le username n'est PAS forcément le vrai nom de l'artiste
- Cherche le VRAI nom complet (avec tirets, accents, majuscules correctes)
- Par exemple 'gerardjanclaes' → pourrait être 'Gerard Jan-Claes'
- Corrige le nom si la recherche web révèle une orthographe différente

Retourne UNIQUEMENT un JSON valide (pas de markdown, pas de backticks) :
{
  "name": "Nom CORRIGÉ avec la bonne orthographe trouvée sur le web (sinon garder l'original)",
  "location": "Ville, Pays",
  "email": "email si trouvé publiquement, sinon chaîne vide",
  "notes": "Bio courte et pertinente, en français, 2-3 phrases max",
  "image_url": "URL d'une photo de l'artiste ou de son travail si trouvée (PAS de data:uri)",
  "additional_links": [
    {"label": "Portfolio", "url": "https://..."},
    {"label": "Instagram", "url": "https://instagram.com/..."},
    {"label": "Vimeo", "url": "https://vimeo.com/..."}
  ],
  "suggested_disciplines": ["parmi: Photographe, Réalisateur, Writer, Artiste visuel, Net Art"],
  "suggested_tags": ["tags pertinents, max 5"]
}

RÈGLES :
- Retourne UNIQUEMENT le JSON
- Ne mets dans additional_links QUE des liens vérifiés (que tu as trouvés via la recherche)
- Ne mets PAS de liens que tu inventes ou devines
- Ne duplique PAS les liens déjà connus
- Si tu ne trouves pas une info, mets une chaîne vide ou un array vide
- Préfère les sources officielles (site de l'artiste) aux sources tierces (galeries)

IMPORTANT pour l'image :
- Cherche une photo portrait ou une image représentative du TRAVAIL de l'artiste
- Cherche '${initialResult.name} artist portrait' ou '${initialResult.name} artwork'
- L'URL doit être une vraie image (terminant par .jpg, .png, .webp ou hébergée sur un CDN d'images)
- NE PAS retourner de logos de plateformes (Instagram, Vimeo, etc.)
- NE PAS retourner de data:uri ou base64
- Préfère les images depuis le site officiel de l'artiste ou des galeries reconnues`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Enrichment API error:', response.status, errText.slice(0, 200))
      return initialResult
    }

    const data = await response.json()

    // Extraire le texte de la réponse (peut contenir tool_use et text blocks)
    const textBlocks = (data.content || [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')

    // Chercher le JSON dans la réponse
    const jsonMatch = textBlocks.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return initialResult

    const clean = jsonMatch[0].replace(/```json\s*|```\s*/g, '').trim()
    const enriched = JSON.parse(clean)

    // Merger : les données enrichies complètent (ne remplacent pas) les données initiales
    return {
      ...initialResult,
      name: enriched.name || initialResult.name,
      location: enriched.location || initialResult.location || '',
      email: enriched.email || initialResult.email || '',
      notes: enriched.notes || initialResult.notes || '',
      image_url:
        enriched.image_url && !enriched.image_url.startsWith('data:')
          ? enriched.image_url
          : initialResult.image_url || '',
      suggested_disciplines:
        enriched.suggested_disciplines?.length > 0
          ? enriched.suggested_disciplines
          : initialResult.suggested_disciplines || [],
      suggested_tags:
        enriched.suggested_tags?.length > 0
          ? enriched.suggested_tags
          : initialResult.suggested_tags || [],
      // Merger les liens : garder les existants + ajouter les nouveaux sans doublons
      links: mergeLinks(initialResult.links || [], enriched.additional_links || []),
    }
  } catch (err: any) {
    console.error('Enrichment error:', err?.message)
    return initialResult
  }
}

// ─── Merge links without duplicates ───
function mergeLinks(
  existing: { label: string; url: string }[],
  additional: { label: string; url: string }[]
): { label: string; url: string }[] {
  const merged = [...existing]
  const existingUrls = new Set(
    existing.map((l) => {
      try {
        return new URL(l.url).hostname + new URL(l.url).pathname.replace(/\/$/, '')
      } catch {
        return l.url
      }
    })
  )

  for (const link of additional) {
    try {
      const key = new URL(link.url).hostname + new URL(link.url).pathname.replace(/\/$/, '')
      if (!existingUrls.has(key)) {
        merged.push(link)
        existingUrls.add(key)
      }
    } catch { /* skip invalid URLs */ }
  }

  return merged
}
