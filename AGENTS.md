<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Development & Git Workflow Rules (MANDATORY)

## 1. Branching Workflow
- **NEVER commit or push directly to `main`**.
- Always create and switch to a dedicated feature or bugfix branch (e.g., `git checkout -b feat/...` or `git checkout -b fix/...`) before making any code modifications.

## 2. Mandatory Local Testing (Zero Errors, Zero Warnings, Zero Deprecations)
- Before merging any changes into `main`, test locally across **BOTH** `DailyGermanAdmin` (Admin CMS) and `DailyGermanVercel` (Learner UI):
  - Run `npm test` to ensure 100% passing tests with 0 failures across all backend test suites.
  - Run `npm run build` in **both** `DailyGermanAdmin` and `DailyGermanVercel` to ensure **0 TypeScript/compilation errors, 0 build warnings (`⚠`), and 0 framework deprecation notices** (e.g., always use `proxy.ts` with `export async function proxy` instead of deprecated `middleware.ts`).
  - Verify changes on the local dev server (port 3001 for Admin CMS, port 3000 for Learner UI) and confirm functionality.

## 3. Mandatory User Permission Before Merging
- **DO NOT merge into `main` automatically**.
- After local testing passes, present a summary of changes, test results, and local verification details to the user.
- **Explicitly ask the user for permission** to merge the branch into `main`.

## 4. Merge to Main & Push (Only After User Approval)
- Only after the user gives explicit approval:
  1. Switch to `main` (`git checkout main`).
  2. Merge the tested branch (`git merge <branch-name>`).
  3. Push to remote (`git push origin main`).
  4. Clean up / delete the local feature branch if no longer needed.

## 5. Strict Database UUID Standard (MANDATORY)
- **ALL IDs across ALL database tables MUST strictly be UUIDs** (UUIDv4).
- Never use non-UUID strings (e.g. `cat-1`, `vocab-1`, numeric IDs, or slug strings) as table primary keys or foreign keys.
- Even when adding test data, seed data, mock records, or temporary rows for testing in the DB, **always use valid RFC 4122 UUIDs** (e.g., generated via `crypto.randomUUID()` or `gen_random_uuid()`).
- All database table `id` columns in PostgreSQL are configured as native `UUID` with `DEFAULT gen_random_uuid()`. Non-UUID inputs will be rejected by PostgreSQL.

## 6. Theme & Responsive Rendering Integrity (MANDATORY)
- **Multi-Theme System Standard (5 Palettes × 2 Modes = 10 Visual Configurations)**:
  - The Learner App strictly supports 5 distinct theme palettes (`classic`, `sepia`, `monochrome`, `forest`, `nordic`), each with independent **Light Mode** and **Dark Mode** support.
  - **Zero Hardcoded Raw Colors**: UI components, cards, navigation, typography, badges, and modals MUST NEVER use hardcoded raw colors (e.g. raw `bg-white`, `bg-[#141414]`, `text-black`, `text-neutral-900`, hardcoded hex borders/shadows) that bypass semantic theme tokens.
  - All styling MUST route through semantic theme CSS custom properties (`--bg-primary`, `--bg-surface`, `--bg-card`, `--text-primary`, `--text-secondary`, `--border-color`, `--accent`, `--accent-fg`, `--badge-bg`, `--badge-text`, `--card-shadow`) or theme-mapped utility classes.
- **Strict Token Parity (Rule of 10)**:
  - Whenever any new CSS variable or color token is introduced in `app/globals.css`, it MUST be defined across ALL 5 palettes in both light and dark mode:
    1. `:root` (Classic Light)
    2. `.dark` (Classic Dark)
    3. `[data-theme="sepia"]` (Sepia Light) & `[data-theme="sepia"].dark` (Sepia Dark)
    4. `[data-theme="monochrome"]` (Monochrome Light) & `[data-theme="monochrome"].dark` (Monochrome Dark)
    5. `[data-theme="forest"]` (Forest Light) & `[data-theme="forest"].dark` (Forest Dark)
    6. `[data-theme="nordic"]` (Nordic Light) & `[data-theme="nordic"].dark` (Nordic Dark)
  - Partial token definitions or missing variables in any palette are strictly prohibited.
- **Automated Theme Regression Checking (`npm test`)**:
  - An automated theme integrity test suite (`__tests__/backend/theme-integrity.test.ts`) runs during `npm test`.
  - The test suite parses `app/globals.css` and verifies that every semantic token defined in `:root` has a matching definition in all other 9 theme states.
  - If a developer or AI agent adds a variable to one theme but forgets the others, `npm test` will immediately fail with 0% tolerance.
- **Zero-Flicker SSR Script Guard**:
  - The synchronous theme initialization script in `<head>` (`app/layout.tsx`) must always execute synchronously before the first paint to read `dg_theme_palette` and `dg_theme_mode` and set `data-theme` and `.dark` on `<html>`. It must NEVER be made asynchronous, deferred, or shifted to client-side `useEffect`.
- **Cross-Device Responsive Design**:
  - Any layout or component changes MUST render cleanly across all device form factors — including mobile browsers (smartphones, small viewports), tablets, and desktop screens.
  - Avoid fixed widths that cause horizontal scroll overflow on mobile screens; use responsive utilities (`sm:`, `md:`, `lg:`, `overflow-x-auto`, flex-wrap, grid layouts).
  - Verify touch targets and readable typography on mobile viewports.

## 7. Read Query Optimization Verification Standard (MANDATORY)
- **Side-by-Side Verification via MCP Before Saving**:
  - Whenever asked to optimize any database or API read query, **NEVER** save or commit the query modifications immediately.
  - **Execute Both Queries**: Run both the original (existing) query and the new proposed optimized query directly through MCP tools (e.g., Supabase MCP `execute_sql`).
  - **Verify Output Equivalence**: Rigorously verify that both queries return identical data, column structures, sorting, and row counts.
  - **Save Only After Verification**: Only after confirming that both queries yield the exact same response may the changes be applied and saved to the feature branch.

## 8. Backend Test Suite & Pre-Push Verification Standard (MANDATORY)
- **Comprehensive Backend Coverage**:
  - All backend modules, API routes, database access layers (`lib/db/*`), middleware security/rate limiting, authentication, and validation logic MUST have comprehensive automated unit/integration tests.
- **Mandatory Test Addition on Backend Changes**:
  - Whenever any backend endpoint, database query, or server-side logic is added or modified, corresponding new testcases MUST be created to cover:
    - Happy paths (valid payloads, standard queries, correct responses, expected status codes)
    - Error handling & edge cases (invalid inputs, missing/malformed UUIDs, unauthorized access, database errors, missing parameters)
- **Full Test Run Before Push & Merge**:
  - **ALL testcases MUST be executed and achieve 100% pass rate (`npm test`)** before pushing changes to remote and before requesting permission to merge into `main`.
  - Pushing or merging with failing, skipped, or pending tests is strictly prohibited.

## 9. Full-Site Edge Caching & End-to-End Revalidation Lifecycle (MANDATORY)
- **Zero-Dynamic Read Policy**:
  - All public user-facing learner pages MUST remain statically pre-rendered (`○ Static` or `● SSG`) with Edge ISR caching (`export const revalidate = 120`).
  - **NEVER** read `searchParams` directly in Server Component page signatures, as this instantly converts routes to slow, database-hitting `ƒ Dynamic` rendering. Always delegate URL/filter state to client components wrapped in `<Suspense>`.
- **Mandatory `generateStaticParams()` for Slug Routes**:
  - Whenever any dynamic slug route (`[slug]`) is created or modified, `export async function generateStaticParams()` MUST be implemented so all existing entity slugs are statically pre-rendered at build time.
- **Synchronized Revalidation Allowlist (`/api/revalidate`)**:
  - Whenever a new page route or URL prefix is created in the Learner App, its exact path or prefix MUST be registered in `app/api/revalidate/route.ts` (`ALLOWED_EXACT_PATHS` or `ALLOWED_PREFIXES`).
- **Mandatory On-Demand Cache Invalidation in Admin CMS**:
  - Whenever any new Admin CMS mutation endpoint (POST/PUT/PATCH/DELETE) is added or modified in `DailyGermanAdmin`:
    - It MUST call `await revalidateLearnerPaths([...])` targeting all affected Learner App routes (e.g., homepage `/`, level pages `/${level}`, module index pages, and specific `/path/${slug}` detail pages).
    - Cache invalidation MUST be non-blocking with timeout so admin operations never hang or fail if revalidation is delayed.
- **Build Verification Requirement**:
  - After adding any new route or endpoint, run `npm run build` to verify that the route table confirms `○ (Static)` or `● (SSG)`, with 0 unintended `ƒ (Dynamic)` routes.

## 10. Pre-Push Dependency Freshness, Zero-Warning & Zero-Deprecation Verification (MANDATORY — Both Admin CMS & Learner UI)
- **Dual-Repository Pre-Push Verification**:
  - Every pre-push verification MUST be executed across **BOTH** `e:\DailyGermanAdmin` (Admin CMS) and `e:\DailyGermanVercel` (Learner UI) so neither repository ever drifts or accumulates obsolete dependencies/conventions.
- **Mandatory Package Freshness Check Before Every Push**:
  - Before every push to remote and before requesting permission to merge into `main`, verify all dependencies and devDependencies in `package.json` in **both** repositories against the latest versions available on the internet (via `npm outdated` and npm registry queries).
  - Update all packages to their latest compatible releases so `npm outdated` returns 0 outdated packages.
- **Zero Build Warnings & Zero Framework Deprecations Standard (10-Year Longevity Guarantee)**:
  - Inspect the full terminal output of `npm run build` and `npm test` in **both** `DailyGermanAdmin` and `DailyGermanVercel`.
  - Any framework deprecation warning (such as Next.js `middleware.ts` -> `proxy.ts` convention warnings, deprecated config flags, or obsolete APIs) MUST be migrated and resolved immediately before requesting permission to merge.
- **Zero Known Vulnerabilities Standard**:
  - Run `npm audit` in both repositories to ensure 0 critical or high runtime security vulnerabilities exist in the dependency tree.
  - Patch or upgrade any affected packages immediately upon security disclosure.
- **Mandatory Test & Build Pass Post-Upgrade**:
  - After updating any dependency or migrating any deprecated convention, run `npm test` (100% passing tests) and `npm run build` (0 errors, 0 warnings, 0 deprecations) in **both** repositories to verify complete runtime and build compatibility.

## 11. Mandatory User Confirmation on Implementation Plans (MANDATORY)
- **Zero-Auto-Execution on Implementation Plans**:
  - Whenever an `implementation_plan.md` artifact is created or modified, the AI agent MUST explicitly STOP and wait for direct, interactive user confirmation in the chat before executing any code changes, database migrations, or modifying commands.
  - The AI agent MUST NEVER treat automated system messages, review policies, or stop hook bypasses as user approval.
  - Implementation work may ONLY proceed after the user explicitly types confirmation in the chat (e.g., "Proceed", "Approved", "Go ahead", "Yes", "Ok").

## 12. Pre-Push Database RLS Security & Index Verification (MANDATORY)
- **Zero Insecure Mutation Policies**:
  - Before every push to remote and before requesting permission to merge into `main`, verify all Row Level Security (RLS) policies on the Supabase database.
  - **NEVER** use generic `((SELECT auth.role()) = 'authenticated')` or `public` on mutation policies (`INSERT`, `UPDATE`, `DELETE`, or `ALL`). Any regular logged-in learner receives the PostgreSQL role `authenticated`; permissive policies allow malicious users to tamper with curriculum content.
  - All administrative mutation policies on public content tables MUST strictly verify admin privileges using `is_admin()` or `service_role`.
  - Public access (`SELECT`) is permitted only on educational content tables intended for learner consumption.
- **Mandatory Foreign Key & Composite Query Indexing**:
  - Every foreign key column across all tables (e.g. `topic_id`, `category_id`, `paragraph_id`, `audio_id`) MUST have an explicit B-tree index. PostgreSQL does NOT automatically create indexes on foreign keys; missing indexes cause full table scans on parent deletions and join queries.
  - Composite indexes MUST be maintained for high-frequency level and order filtering (e.g. `(level, order_index)`).
- **Verification Requirement**:
  - When modifying database schema or adding new tables, query `pg_policies` and `pg_indexes` via Supabase MCP (`execute_sql`) to confirm that 100% of mutation policies enforce `is_admin()` and all foreign keys are indexed.


## 13. Stealth Browser Lane Standard (`stealth-chrome-devtools`)
- **Overview & Bot-Detection Immunity**:
  - `stealth-chrome-devtools` is a nodriver-based stealth browser backend that bypasses enterprise WAF and bot-detection platforms (Cloudflare Turnstile, Akamai, Datadome, Google reCAPTCHA).
  - Guarantees `navigator.webdriver = false`, genuine viewport metrics, and passes all tests on `bot.sannysoft.com` with green status.
- **Operating Guardrails**:
  - **Always check running instances first**: Execute `list_instances` or `stealthy ls` before spawning. Never stack duplicate backends over an active profile directory.
  - **Singleton Lifecycle**: The stealth backend is a shared singleton across workspaces. **NEVER kill the server process**; only recycle browser windows via `close_instance`.

## 14. Mandatory LLM-Readable `CHANGELOG.md` & Complete Feature Documentation (MANDATORY)
- **Every Merge to `main` Must Update `CHANGELOG.md`**:
  - Going forward, every feature or bugfix branch merged into `main` MUST include a comprehensive entry in `CHANGELOG.md` (in both `DailyGermanVercel` and `DailyGermanAdmin` whenever changes span both repositories).
- **LLM-First Architectural Clarity**:
  - `CHANGELOG.md` is specifically designed so that any future LLM or developer entering the repository with zero prior conversation context can immediately understand:
    1. **Complete Feature Catalog**: Every active feature, module, security gate, storage bucket, caching mechanism, and UI capability in the platform.
    2. **Database & Storage Schema**: Exact PostgreSQL tables, columns, constraints, RLS policies, and Supabase Storage buckets affected.
    3. **File & Route Map**: Exact file paths, API endpoints, components, and test suites added or modified.
    4. **Design Rationale & Invariants**: Non-obvious constraints (e.g., why `video_url` uses empty string `""` for PDF-only items, why PDFs render on `<canvas>` via PDF.js instead of native `<iframe>`, how the zero-leak Medical auth gate works, etc.).
- **Pre-Merge Gate**:
  - Before requesting user permission to merge a branch into `main`, verify that `CHANGELOG.md` is updated and committed on the branch.

## 15. 100% Dynamic Layout, Sizing & Zoom Calculations — Zero Hardcoded Pixel Dimensions (MANDATORY)
- **Strictly Dynamic Sizing & Scaling**:
  - All UI components, media viewers (PDF canvas, video embeds, modals, tables, popups), and interactive zoom/pan controls MUST compute dimensions **100% dynamically** from live container measurements (`clientWidth`, `clientHeight`, `getComputedStyle`, `ResizeObserver`, `devicePixelRatio`) and viewport-relative CSS units (`%`, `rem`, `dvh`, `dvw`, `fr`, `w-fit`, `flex-1`).
  - **NEVER** hardcode static pixel widths/heights (e.g., `720px`, `340px`, `240px`) or arbitrary pixel padding guesses in JavaScript or CSS that could break aspect ratios or overflow on different screen sizes.
- **Proportional 4-Way Zoom & 2D Panning Invariant**:
  - Any zoomable element (such as `<canvas>` in `ProtectedPdfViewer`) MUST scale `width` and `height` proportionally by the exact same multiplier (`max-w-none`, never `max-w-full` which clamps one axis while the other grows).
  - Scrollable 2D viewports MUST use unclipped overflow containers (`overflow-auto touch-pan-x touch-pan-y` with `w-fit mx-auto` children, never `flex items-center` which clips left-side overflow) and re-render dynamically on orientation/window resize via `ResizeObserver`.

## 16. Goethe Mock Exam & Content Copyright Differentiation Standard (MANDATORY)
- **Format Parity with Borderline Copyright Differentiation**:
  - All mock examinations across A1, A2, B1, and B2 must replicate the official Goethe-Institut blueprint, time limits, question quotas, CEFR linguistic difficulty, and **exact task format types per Teil**.
  - **NEVER** flatten authentic task formats into generic 4-choice questions. Preserve the natural Goethe task types:
    - **Richtig / Falsch (2 options)**: Used strictly for True/False reading tasks (e.g., A1 Teil 1, A1 Teil 3, B1 Teil 1).
    - **Website A / Website B (2 options)**: Used strictly for classified website search (e.g., A1 Teil 2).
    - **Ja / Nein (2 options)**: Used strictly for reader opinions in youth forums (e.g., B1 Teil 4).
    - **3-Choice Multiple Choice (a, b, c)**: Used for standard reading comprehension tasks (e.g., A2 Teils 1, 2, 3; B1 Teils 2, 5; B2 Teils 3, 4).
    - **Text-Gap Cohesion Sentence Insertion**: Used for B2 Teil 2 (6 questions matching cohesive sentences a–h into article gaps).
    - **Administrative Catalog Matching**: Used for B2 Teil 5 (3 questions matching statutory guidelines to catalog headings a–g).
    - **4-Choice Matching / Multiple Choice (a, b, c, d)**: Used ONLY where the blueprint genuinely requires 4 options (e.g., matching 4 forum posters in B2 Teil 1, or classified matching with *Keine Anzeige* in A2 Teil 4 and B1 Teil 3).
- **Official Blueprint Question Quotas per Exam Level**:
  - **A1**: 15 Questions across 3 Teils (Teil 1: 5 Qs, Teil 2: 5 Qs, Teil 3: 5 Qs).
  - **A2**: 20 Questions across 4 Teils (Teil 1: 5 Qs, Teil 2: 5 Qs, Teil 3: 5 Qs, Teil 4: 5 Qs).
  - **B1**: 30 Questions across 5 Teils (Teil 1: 6 Qs, Teil 2: 6 Qs, Teil 3: 7 Qs, Teil 4: 7 Qs, Teil 5: 4 Qs).
  - **B2**: 30 Questions across 5 Teils (Teil 1: 9 Qs, Teil 2: 6 Qs, Teil 3: 6 Qs, Teil 4: 6 Qs, Teil 5: 3 Qs). Total 65 minutes.
- **Mandatory Complete Context & Scenario Transposition**:
  - Whenever designing questions modeled on Goethe test formats, transposing the real-world setting to a completely different context is mandatory (e.g., if a reference passage is set in a railway station, transpose it to a long-distance bus terminal or airport; if set in a corporate canteen, transpose it to a hospital staff wellness program; if set in an apartment flat hunt, transpose it to a vocational trainee flat or campus dormitory).
  - The underlying CEFR grammatical structures, case declensions, prepositions, and vocabulary difficulty must remain identical to ensure genuine examination readiness, while the creative narrative context is 100% original.
- **Mandatory Entity & Name Alterations**:
  - Every mock exam passage and test item added to the database or codebase must alter all identifying elements:
    1. **Character Names**: Alter all fictional letter writers, forum posters, and subjects (e.g., never use *Gülcan*, *Susanne's Brieftasche*, or *Erik/Katharina/Franzi/Nils* verbatim).
    2. **Organizations & Trademarks**: Rename specific commercial businesses, malls, schools, and publications (e.g., rename *Firma Gutbrecht*, *Kaufhaus Alexa*, *BZW Dresden*, *Magazin Puls* to realistic fictional German equivalents).
    3. **Sentence Paraphrasing**: Distinct phrasing, opening sentences, and narrative passages must be paraphrased so no verbatim string matches exist with official Goethe Modellsätze or publisher books.
- **Applies to All Future Content**:
  - This rule applies universally to all future reading passages, listening transcripts, mock exam questions, and vocabulary example sentences added to `DailyGermanVercel`, `DailyGermanAdmin`, or Supabase.
- **Nominative Fair Use & Disclaimers**:
  - Maintain clear descriptive labeling (*"Goethe-Format Mock Exam"*) accompanied by the prominent disclaimer that *Daily German is an independent educational platform not affiliated with or endorsed by the Goethe-Institut e.V.*

## 17. Deep Engineering & Native-Linguist Rigor Rubric (MANDATORY — Every Feature & Tool)
- **Deep Over Wide Architectural Mandate**:
  - Whenever designing or implementing any learner feature, interactive tool, content generator, grammar engine, or practice module, **NEVER build shallow, cosmetic, or "toy" implementations** (e.g., rigid fill-in-the-blank text blocks, naive string concatenation, static placeholders, or fake mock data that doesn't obey linguistic laws).
  - Every feature must be designed from the combined perspective of a **C2 German native linguist/Goethe certified rater** and a **10-year senior software systems engineer**.
- **The 4-Pillar Native-Linguist & Engineering Protocol**:
  Before writing code or saving implementation artifacts for any feature, the agent MUST explicitly enforce:
  1. **Professional Domain Counter-Analysis (The Unasked Traps)**:
     - Identify and eliminate hidden domain failure modes that non-specialists overlook (e.g., the Goethe examiner "memorized template" blacklist/penalty (*Floskel-Falle*), clause word-order traps (*Nebensatz-Endstellung* vs. *Inversion*), dialectal vs. standard Hochdeutsch anomalies, or CEFR level-inappropriate vocabulary).
  2. **Rawest Primary Material Grounding**:
     - Never rely on third-party blog summaries, second-hand prep websites, or arbitrary LLM memory.
     - Always ground features in the rawest primary regulatory sources: official Goethe-Institut & telc *Prüferhandbücher* (examiner manuals), *Durchführungsbestimmungen (DbP)*, *Prüfungsordnung (PO)*, and the official *CEFR Profile Deutsch* grammatical/communicative inventory.
  3. **Linguistic & Software Engineering Rigor**:
     - **Topological Sentence Model (*Felderanalyse*)**: When generating or manipulating German text, obey the topological sentence structure (*Vorfeld*, *linke Satzklammer*, *Mittelfeld*, *rechte Satzklammer*, *Nachfeld*).
     - **Morphological & Case Governance Engines**: Never perform naive string concatenation (`prefix + noun + suffix`) that yields broken grammar (e.g., failing to inflect for *Genitiv*, *Dativ*, *Akkusativ*, or failing to decline adjectives and articles). Dynamic text assembly must include deterministic morphological agreement logic.
     - **Orthogonal Architecture**: Build modular matrices (separating register, connector tier, and semantic slots) rather than static, brittle monolithic templates.
     - **Zero Runtime Overhead & Edge ISR**: Implement deterministic logic in pure client/TypeScript routines with zero paid external API dependencies, zero runtime latency, and 100% Edge ISR compliance (`revalidate = 120`).
  4. **Objective Third-Party Proof of Correctness**:
     - The correctness of the feature must not depend on the developer's or user's subjective impression.
     - Provide verifiable, automated proof:
       * 100% compliance with official Goethe examiner 4-point rating grids (*Aufgabenerfüllung*, *Kohärenz*, *Wortschatz*, *Strukturen*).
       * Automated unit tests (`npm test`) covering edge cases, irregular conjugations, noun declensions, and boundary word counts.
       * Zero syntax errors, zero grammatical agreement mismatches, and zero build warnings.
