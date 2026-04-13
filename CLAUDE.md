# CampusFinder — Claude Code Instructions

## What this is
Dark-themed campus lost & found MERN SPA. React + Express + MongoDB + Groq.
Mobile-first responsive design. Full spec in `PLAN.md`. Read it before writing any code for a feature.

## Stack
- Frontend: React 18 (Vite), react-router-dom, lucide-react, CSS variables
- Backend: Node/Express, MongoDB Atlas, Groq `llama-3.1-8b-instant`
- Libs: ColorThief, nsfwjs, natural (TF-IDF), Resend mail, node-cron, cloudinary

## Hard rules
1. MERN stack — React JSX components with Vite. No vanilla HTML pages.
2. Mobile-first responsive. Every component works on 320px+ screens.
3. All user interactions = popups. Only exceptions: `/manage/:token`, `/admin`.
4. Groq calls = always async non-blocking. App works if Groq fails.
5. nsfwjs runs before every Cloudinary upload. Reject if neutral < 0.6.
6. Never expose poster contact publicly. Interest button → email to poster only.
7. Match scores shown only if > 40%.
8. Resolved strip = text-only, no images.

## Build phases (do one at a time)
1. Backend foundation — Express, DB, models, auth routes
2. Core CRUD — items POST/GET, tagger, mailer (Resend), manage token
3. Matching engine — TF-IDF scorer, topMatches, bidirectional
4. Groq — enrichment + NL search + icon selection, wired async
5. Remaining routes — resolve, interest, admin, rate limits, cron
6. Frontend — React components, pages, context, routing, responsive CSS
7. Manage + Admin pages

## Phase workflow
1. Plan phase using writing-plans skill
2. Implement using Sonnet (worker) — Opus for architecture decisions
3. Test the phase thoroughly
4. Update CRG graph (`build_or_update_graph_tool`)
5. Verify graph state (`list_graph_stats_tool`)
6. Move to next phase

## CRG-first rule
- For any file read: check CRG graph before reading raw files
- Use `get_minimal_context_tool` for targeted lookups
- Use `get_review_context_tool` before modifying files
- Use `get_architecture_overview_tool` for cross-cutting changes
- Update graph after every phase completion
- 8-49× token savings over raw file reads

## Model allocation
| Task | Model |
|---|---|
| Architecture, planning, phase design | Opus |
| Code writing, implementation, debugging | Sonnet |
| Simple lookups, file moves | Haiku |

## Dependency rules (code-graph-review)
- `routes/` → only imports `services/` and `models/`
- `services/` → only imports `models/` and npm packages
- `services/groq.js` → standalone, no cross-service imports
- `client/src/api/api.js` → only file that calls fetch
- `client/src/components/` → pure render, receive props/context
- `client/src/context/AppContext.jsx` → state owner
- No circular dependencies anywhere

## Skills to use
- `brainstorming` → before creative/design decisions
- `writing-plans` → before each phase implementation
- `ui-ux-pro-max` → for all frontend components (Phase 6-7)
- `verification-before-completion` → after each phase
- `test-driven-development` → when writing testable logic
- `requesting-code-review` → before finalizing phases

## Colours
`--bg:#1b1b1b` `--surface:#292929` `--mid:#232323` `--accent:#ffa500` `--gray:#808080`

## When stuck
Read `PLAN.md` section for that feature. Do not invent decisions not in PLAN.md.
