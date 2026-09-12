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
- **Dark Mode & Light Mode Compatibility**:
  - Any UI modifications MUST strictly support both dark mode and light mode without visual regressions, unreadable text, broken contrast, or theme toggle flickering.
  - Always pair color classes with appropriate `dark:` variants (e.g. background, text, borders, shadows, inputs, modals, buttons).
- **Cross-Device Responsive Design**:
  - Any layout or component changes MUST render cleanly across all device form factors — including mobile browsers (smartphones, small viewports), tablets, and desktop screens.
  - Avoid fixed widths that cause horizontal scroll overflow on mobile screens; use responsive utilities (`sm:`, `md:`, `lg:`, `overflow-x-auto`, flex-wrap, grid layouts).
  - Verify touch targets and readable typography on mobile viewports.

