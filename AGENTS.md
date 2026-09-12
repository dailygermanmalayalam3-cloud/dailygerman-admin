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

## 3. Merge to Main & Push
- Only after local testing passes:
  1. Switch to `main` (`git checkout main`).
  2. Merge the tested branch (`git merge <branch-name>`).
  3. Push to remote (`git push origin main`).
  4. Clean up / delete the local feature branch if no longer needed.
