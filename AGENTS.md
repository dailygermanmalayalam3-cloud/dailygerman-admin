<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Development & Git Workflow Rules (MANDATORY)

## 1. Branching Workflow
- **NEVER commit or push directly to `main`**.
- Always create and switch to a dedicated feature or bugfix branch (e.g., `git checkout -b feat/...` or `git checkout -b fix/...`) before making any code modifications.

## 2. Mandatory Local Testing
- Before merging any changes into `main`, test locally:
  - Run `npm test` to ensure 100% passing tests with 0 failures across all backend test suites.
  - Run `npm run build` to ensure 0 TypeScript / compilation errors.
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

## 10. Pre-Push Dependency Freshness & Security Verification (MANDATORY)
- **Mandatory Package Freshness Check Before Every Push**:
  - Before every push to remote and before requesting permission to merge into `main`, verify all dependencies and devDependencies in `package.json` against the latest versions available on the internet (via `npm outdated` and npm registry queries).
  - Update all packages to their latest compatible releases.
- **Zero Known Vulnerabilities Standard**:
  - Run `npm audit` to ensure 0 critical or high security vulnerabilities exist in the dependency tree.
  - Patch or upgrade any affected packages immediately upon security disclosure.
- **Mandatory Test & Build Pass Post-Upgrade**:
  - After updating any dependency, run `npm test` (100% passing tests) and `npm run build` (0 TypeScript / compilation errors) to verify complete runtime and build compatibility.

## 11. Mandatory User Confirmation on Implementation Plans (MANDATORY)
- **Zero-Auto-Execution on Implementation Plans**:
  - Whenever an `implementation_plan.md` artifact is created or modified, the AI agent MUST explicitly STOP and wait for direct, interactive user confirmation in the chat before executing any code changes, database migrations, or modifying commands.
  - The AI agent MUST NEVER treat automated system messages, review policies, or stop hook bypasses as user approval.
  - Implementation work may ONLY proceed after the user explicitly types confirmation in the chat (e.g., "Proceed", "Approved", "Go ahead", "Yes", "Ok").


