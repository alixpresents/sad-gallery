# SAD PICTURES GALLERY — Talent Board
## Architecture & Claude Code Prompts

---

## Stack
- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS
- **Backend:** Supabase (project `devis-alix` existant)
- **Auth:** Supabase Auth (même auth que DevisProd)
- **Deploy:** Vercel (nouveau projet, même GitHub org)
- **Table:** `public.spg_artists` (voir `spg-migration-001-artists.sql`)
- **⚠️  Pas "talents"** — ce nom est déjà pris par sadOS

## Structure fichiers cible

```
sad-gallery/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
├── .env                    # VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   └── supabase.ts    # client Supabase
│   ├── hooks/
│   │   ├── useTalents.ts  # CRUD + realtime subscription
│   │   └── useAuth.ts     # login/session
│   ├── components/
│   │   ├── Layout.tsx      # header + nav
│   │   ├── TalentCard.tsx
│   │   ├── TalentModal.tsx
│   │   ├── KanbanView.tsx
│   │   ├── ListView.tsx
│   │   ├── GalleryView.tsx
│   │   ├── QuickStatus.tsx
│   │   ├── TagInput.tsx
│   │   ├── LinkChip.tsx
│   │   ├── Avatar.tsx
│   │   └── Pill.tsx
│   ├── types/
│   │   └── talent.ts
│   └── styles/
│       └── index.css
```

---

## PROMPT 1 — Scaffolding + Auth

```
Tu vas créer un projet Vite + React + TypeScript + Tailwind pour une webapp "SAD PICTURES GALLERY — Talent Board".

1. Initialise le projet avec :
   - vite, react, react-dom, typescript
   - tailwindcss, postcss, autoprefixer
   - @supabase/supabase-js

2. Configure Tailwind avec le preset dark, font Inter (via Google Fonts dans index.html)

3. Crée src/lib/supabase.ts :
   - Lit VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY depuis import.meta.env
   - Exporte le client createClient()

4. Crée src/hooks/useAuth.ts :
   - Hook qui gère session Supabase (onAuthStateChange)
   - Expose: session, user, signIn(email, password), signOut, loading
   - Login par email/password (pas de magic link)

5. Crée src/App.tsx :
   - Si pas de session → affiche un formulaire de login minimaliste (dark, centré)
   - Si session → affiche "<h1>Talent Board</h1>" placeholder
   - Style sadOS : bg-[#050505], text white, font Inter

6. vercel.json : rewrites SPA standard (/* → /index.html)

7. .env.example avec les deux variables VITE_SUPABASE_*

NE crée PAS encore les composants métier. Juste le scaffold + auth.
```

---

## PROMPT 2 — Types + Hook CRUD

```
Dans le projet sad-gallery existant :

1. Crée src/types/talent.ts avec ce type :

interface Talent {
  id: string
  created_at: string
  updated_at: string
  name: string
  status: 'discovered' | 'to_contact' | 'contacted' | 'confirmed'
  disciplines: string[]
  tags: string[]
  image_url: string
  location: string
  email: string
  notes: string
  added_at: string
  last_contact: string | null
  data: {
    links: { label: string; url: string }[]
    pins: { label: string; url: string }[]
  }
}

type TalentInsert = Omit<Talent, 'id' | 'created_at' | 'updated_at'>

2. Crée src/hooks/useTalents.ts :
   - Charge tous les artists au mount (select * from spg_artists order by created_at desc)
   - Expose: artists, loading, error
   - upsert(artist): insert ou update (upsert sur id)
   - remove(id): delete par id
   - changeStatus(id, status): update partiel
   - Realtime: subscribe au channel 'spg_artists' pour INSERT/UPDATE/DELETE
     et met à jour le state local automatiquement
   - NE PAS utiliser service_role key côté client, on a RLS avec anon key

NE modifie PAS App.tsx ni aucun composant existant.
```

---

## PROMPT 3 — Composants UI (Board + List + Gallery)

```
Dans le projet sad-gallery, crée les composants React suivants.
Style : Tailwind CSS, esthétique sadOS (dark, Inter, neutral, épuré).

Réfère-toi au prototype dans docs/prototype-ref.jsx pour le comportement exact.

1. src/components/Pill.tsx — bouton pill toggleable
2. src/components/Avatar.tsx — image avec fallback initiales
3. src/components/LinkChip.tsx — lien cliquable (variant "link" bleu, "pin" doré)
4. src/components/QuickStatus.tsx — dropdown de changement de statut rapide
5. src/components/TagInput.tsx — input tags avec Enter + suppression
6. src/components/TalentCard.tsx — card Kanban draggable (HTML5 drag)
   - Zone haute : onClick → onEdit (ouvre modal)
   - Zone basse : liens/pins cliquables, QuickStatus, expand pins
   - e.stopPropagation() sur tous les éléments interactifs de la zone basse
7. src/components/KanbanView.tsx — 4 colonnes avec drop targets (onDragOver/onDrop)
8. src/components/ListView.tsx — table triable (nom, statut, date)
9. src/components/GalleryView.tsx — grille responsive avec image large + QuickStatus

Tous les composants prennent leurs données en props.
Le CRUD vient du hook useTalents via App.tsx.
NE modifie PAS App.tsx, hooks, ni lib.
```

---

## PROMPT 4 — Modal + App assembly

```
Dans le projet sad-gallery :

1. Crée src/components/TalentModal.tsx :
   - Modal fullscreen overlay (backdrop blur)
   - Formulaire complet : nom, image URL (avec preview Avatar), localisation, email,
     disciplines (pills toggle), tags (TagInput), statut (pills),
     liens (DynamicRows), pins (DynamicRows), notes (textarea),
     date ajout, dernier contact
   - Boutons : Supprimer (avec confirm), Annuler, Enregistrer
   - Fermeture par clic overlay ou bouton ×

2. Crée src/components/Layout.tsx :
   - Header : "SAD PICTURES" label + "Gallery · Talent Board" h1 + compteurs
   - Toolbar : toggle Board/Liste/Galerie, input recherche, pills filtres disciplines,
     pills filtres statut (visible en liste+galerie)
   - Bouton "+ Nouveau talent"

3. Assemble dans src/App.tsx :
   - useAuth pour la session
   - useTalents pour les données
   - State local : view (board/list/gallery), search, filterDisc, filterStatus,
     editing (Talent|null), showNew, sortKey, sortDir
   - Filtrage : recherche dans name + notes + tags + location
   - Tri : par name, addedAt, status
   - Passe tout aux composants enfants via props

Copie le fichier prototype dans docs/prototype-ref.jsx pour référence comportement.
NE MODIFIE PAS les composants créés au prompt 3 sauf si nécessaire pour les props.
```

---

## PROMPT 5 — OG Image scraping (API route)

```
Crée api/og-image.ts (Vercel serverless) :

- Reçoit POST { url: string }
- Fetch la page à l'URL donnée (avec timeout 5s, user-agent Chrome)
- Parse le HTML pour extraire :
  1. og:image (meta property="og:image")
  2. twitter:image
  3. Première <img> avec src contenant "profile", "avatar", "photo"
- Retourne { imageUrl: string | null }
- CORS headers pour le domaine de l'app

Côté client dans TalentModal :
- Quand un lien est ajouté et que image_url est vide,
  appelle /api/og-image avec l'URL du premier lien
- Si résultat, pré-remplis le champ image_url (l'user peut override)
- Affiche un petit spinner pendant le fetch

NE modifie RIEN d'autre que TalentModal et le nouveau fichier API.
```

---

## Env vars Vercel

```
VITE_SUPABASE_URL=https://xxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

(Mêmes valeurs que DevisProd — même projet Supabase)

---

## Deploy

1. `git init` + push sur GitHub (repo `sad-gallery`)
2. Vercel : import repo, framework preset Vite, env vars
3. Domain custom : `gallery.sad-pictures.com` (ou subdomain de ton choix)
1. Run la migration SQL (`spg-migration-001-artists.sql`) dans Supabase SQL Editor avant le premier deploy
