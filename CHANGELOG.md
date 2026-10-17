# Daily German Admin CMS — Comprehensive Feature Reference & Changelog (`DailyGermanAdmin`)

> **LLM Context Guide**: This document serves two purposes:
> 1. **Complete System & Feature Reference (Section 1)**: Gives any AI agent or engineer immediate, complete architectural context across the Admin CMS (`e:\DailyGermanAdmin`), Learner App (`e:\DailyGermanVercel`), and Supabase backend (`wivtdopwvgefybojakuo`).
> 2. **Chronological Merge Changelog (Section 2)**: Documents every merge to `main` with exact database migrations, API routes, UI components, design invariants, and test suites.
>
> **Mandatory Rule (`AGENTS.md` Rule 14)**: Every merge to `main` MUST append a detailed entry in Section 2 and update Section 1 if architectural capabilities change.

---

## 1. Complete System Architecture & Admin CMS Feature Catalog

### 1.1 Dual-Repository Topology
| Repository | Local Path | Dev Port | Purpose |
| :--- | :--- | :--- | :--- |
| **Admin CMS (`DailyGermanAdmin`)** | `e:\DailyGermanAdmin` | `3001` | Role-gated Content Management System for curriculum CRUD, audio/PDF uploads, user management, suggestions moderation, and on-demand Learner cache invalidation. |
| **Learner App (`DailyGermanVercel`)** | `e:\DailyGermanVercel` | `3000` | Public-facing German learning platform (A1–B2, Goethe Exam Prep, Medical German) with Edge ISR caching (`revalidate = 120`). |
| **Supabase Backend** | Project ID `wivtdopwvgefybojakuo` | Cloud | PostgreSQL database (strict RFC 4122 UUID PKs/FKs, RLS enforced via `public.is_admin()`), Supabase Auth, and Supabase Storage buckets. |

---

### 1.2 Admin Authentication, RBAC & Security Architecture
- **Cookie-Verified Admin Auth (`lib/auth/verify-admin.ts`, `middleware.ts`)**:
  - Every `/api/admin/*` route calls `verifyAdminRequest()` to validate the Supabase session and confirm `user_roles.role === 'admin'`.
  - Database-level Row Level Security (RLS) policies on all content tables enforce `public.is_admin()` on `INSERT`, `UPDATE`, `DELETE` operations.
- **On-Demand Learner Edge Cache Revalidation (`lib/revalidate-learner.ts`)**:
  - Every mutation endpoint (`POST`, `PUT`, `PATCH`, `DELETE`) invokes `await revalidateLearnerPaths([...])`, which sends a non-blocking signed webhook (`x-revalidation-secret`) to `DailyGermanVercel` (`POST /api/revalidate`) to immediately invalidate affected static/ISR pages and memory caches.

---

### 1.3 Admin CMS Modules & API Routes

1. **Vocabulary & Categories (`/vocabulary`, `/api/admin/vocabulary`, `/api/admin/vocabulary/categories`)**:
   - Full CRUD + bulk ordering for German–English–Malayalam vocabulary items and categories across A1–B2.
2. **Verbs (`/verbs`, `/api/admin/verbs`)**:
   - Full CRUD for German verb conjugations (`Präsens`, `Perfekt`, `Präteritum`), level tagging, and example sentences.
3. **Grammar Topics, Videos/PDFs & Workouts (`/grammar`, `/api/admin/grammar`, `/api/admin/grammar/videos`, `/api/admin/grammar/upload-pdf`, `/api/admin/grammar/exercises`)**:
   - **Grammar Topics**: Level-filtered topics (`A1`–`B2`) with Markdown reference tables, Malayalam explanations, and example sentences.
   - **Grammar Videos & Study Notes PDFs (`public.grammar_videos`)**:
     - Supports **4 combinations** per resource item:
       1. **Video Only**: YouTube URL present (`video_url`), no PDF (`pdf_url = null`).
       2. **PDF Only**: PDF uploaded/linked (`pdf_url`), `video_url` stored as `""` (empty string) to satisfy PostgreSQL `NOT NULL` while satisfying `grammar_videos_media_check`.
       3. **Both Video & PDF**: Both `video_url` and `pdf_url` present on the same lesson item.
       4. **Neither**: Topic has 0 attached items (or validation rejects empty items with `400 Bad Request`).
     - **Direct PDF Upload (`POST / DELETE /api/admin/grammar/upload-pdf`)**:
       - Validates `application/pdf` MIME type / `.pdf` extension and max 15 MB size.
       - Uploads to Supabase Storage bucket `grammar-pdfs` under `grammar/<uuid>.pdf` (`Cache-Control: 31536000`).
       - Deleting a PDF or deleting a `grammar_videos` row (`deleteGrammarVideo` in `lib/db/content.ts`) automatically deletes the underlying file from `grammar-pdfs` storage so zero orphaned files remain.
   - **Grammar Exercises (Workouts)**: Multiple-choice, fill-in-the-blank, and sentence-reordering exercises per topic.
4. **Reading (`/reading`, `/api/admin/reading`)**:
   - Manages reading topics, multi-paragraph passages, translations, and comprehension questions.
5. **Listening (`/listening`, `/api/admin/listening`, `/api/admin/listening/upload-audio`)**:
   - Manages listening topics, audio tracks uploaded to `listening-audio` bucket (with automatic storage cleanup on deletion), transcripts, and questions.
6. **Speaking (`/speaking`, `/api/admin/speaking`)**:
   - Manages speaking topics and structured dialogue turns (`speaker`, `german`, `english`, `malayalam`).
7. **Writing (`/writing`, `/api/admin/writing`)**:
   - Manages writing topics and structured prompt/sample sections.
8. **Goethe Exam Prep (`/goethe`, `/api/admin/goethe`)**:
   - Manages official-format exam practice sets across `Lesen`, `Hören`, `Schreiben`, and `Sprechen`.
9. **Medical German (`/medical`, `/api/admin/medical`, `/api/admin/medical/upload-audio`)**:
   - Manages medical categories, hospital vocabulary (with word & sentence audio uploaded to `medical-audio` bucket and auto-deleted on record deletion), and doctor–patient dialogues.
10. **Registered Users Management (`/users`, `/api/admin/users`)**:
    - Lists all `auth.users` accounts via Supabase Service Role API, supports banning/unbanning users, and permanently deleting accounts.
11. **Learner Suggestions & Feedback Moderation (`/suggestions`, `/api/admin/suggestions`)**:
    - Views, filters, updates status (`pending`, `reviewed`, `implemented`, `archived`), and deletes learner feedback submitted via `/contact`.

12. **Sprechen Café Voice Moderation & Stealth Listen-In (`/voice-moderation`, `lib/voice/moderation-engine.ts`)**:
    - **Reported Conversations & Audio Evidence Review (`public.voice_reports`)**: Plays recorded `.webm` conversation audio from `recording_url` (Cloudflare R2) with a synchronized **Speaker Attribution Timeline** (`findActiveSpeakersAtSecond`) highlighting which exact speaker's mic was active at every second, plus 1-click Ban (`public.blacklisted_users`), Mark Reviewed, and Delete actions.
    - **Stealth Listen-In (`moderation:listener`)**: Allows Admin to silently join any active voice group in `public.voice_groups` with hidden role `moderation:listener` (`hidden: true, canPublish: false, canSubscribe: true`), invisible to learners and guests while monitoring live audio, per-speaker volume meters, Force-Mute, Kick, and Dissolve Group controls.

---

## 2. Chronological Merge Changelog

### [2026-10-13] — Admin Voice Moderation, Audio Evidence Player & Stealth Listen-In Console (`feat/admin-voice-moderation`)

#### Summary
- Built `/voice-moderation` (`app/voice-moderation/page.tsx`) and `lib/voice/moderation-engine.ts` (`AdminStealthListener`, `findActiveSpeakersAtSecond`, `formatReportDuration`).
- Added `Voice Rooms` (`/voice-moderation`) link to `components/AdminHeader.tsx`.
### [2026-10-17] — Goethe Redemittel & Universal Exam Matrix Manager (`/exam-templates`) (`feat/goethe-exam-templates-matrix`)

#### Summary
Built administrative control panel for the Goethe Redemittel & Universal Exam Matrix (`/exam-templates`), enabling administrators to manage official Goethe Schreiben and Sprechen templates across levels A1, A2, B1, and B2. Supports full CRUD operations, trilingual model answer editing (German, English, and Malayalam), CEFR connector tagging, and instant on-demand Edge cache invalidation (`revalidateLearnerPaths`) targeting `/tools/exam-templates`.

#### Database & Schema (`public.goethe_exam_templates`)
- Table `goethe_exam_templates`: Native RFC 4122 UUID primary keys, composite index on `(level, module_type, order_index)`, and strict `is_admin()` RLS policies on mutations (`INSERT`, `UPDATE`, `DELETE`).
- Query functions added to `lib/db/content.ts`: `getGoetheExamTemplates(level?, moduleType?)`, `mutateGoetheExamTemplate(item)`, and `deleteGoetheExamTemplate(id)`.

#### Files Added / Modified in `DailyGermanAdmin`
- `types/index.ts`: Added `GoetheExamTemplate` interface.
- `lib/db/content.ts`: Added template queries and mutation methods.
- `app/api/admin/exam-templates/route.ts` *(NEW)*: GET, POST, and DELETE endpoints with automatic learner cache revalidation.
- `components/ExamTemplatesManager.tsx` *(NEW)*: Full administrative management interface with level/module filters, trilingual textareas, and live learner tool links.
- `app/exam-templates/page.tsx` *(NEW)*: Admin route rendering `ExamTemplatesManager`.
- `components/AdminHeader.tsx`: Added `Exam Templates` navigation link with `FileText` icon to desktop specialty navigation and mobile drawer.
- `__tests__/backend/api-admin-exam-templates.test.ts` *(NEW)*: 5 unit tests covering GET, POST, DELETE, validation, and revalidation callouts (100% pass rate).

### [2026-10-13] — Goethe Mock Exam Simulator Admin CRUD & Question Bank (`feat/mock-exam-admin-crud`)

#### Summary
Built administrative control panel for the Goethe Mock Exam Simulator (`/mock`), enabling administrators to manage mock exam configurations (level, passing score, duration, question count) and the authentic Goethe question banks (Teils 1–3, reading passages, multiple choice / Richtig/Falsch options, correct answer keys, and dual Malayalam/English diagnostic explanations). Integrated on-demand edge ISR cache invalidation (`revalidateLearnerPaths`) targeting `/mock` and `/mock/[slug]`.

#### Database & Models (`mock_exams` & `mock_exam_questions`)
- Models added to `types/index.ts`: `MockExam`, `MockExamOption`, and `MockExamQuestion`.
- Database query functions added to `lib/db/content.ts`: `getMockExams()`, `getMockQuestions(examId?)`, `saveMockExam()`, `deleteMockExam()`, `saveMockQuestion()`, and `deleteMockQuestion()`.

#### Files Added / Modified in `DailyGermanAdmin`
- `types/index.ts`: Added `MockExam`, `MockExamOption`, and `MockExamQuestion` interfaces.
- `lib/db/content.ts`: Added mock exam and question query and mutation methods.
- `app/api/admin/mock-list/route.ts` *(NEW)*: GET endpoint fetching exam sets and questions.
- `app/api/admin/mock/route.ts` *(NEW)*: POST and DELETE endpoints for mock exam records with automatic learner cache revalidation.
- `app/api/admin/mock/questions/route.ts` *(NEW)*: POST and DELETE endpoints for questions in the question bank.
- `app/mock/page.tsx` *(NEW)*: Complete two-tab Admin interface (`Mock Exam Sets` and `Question Bank`) with filter-by-exam dropdown, passage and options editor, and Malayalam explanation fields.
- `app/page.tsx`: Added `Goethe Mock Simulator` metrics card to dashboard.
- `components/AdminHeader.tsx`: Added `Mock Exams` navigation link with `Sparkles` icon to desktop Specialty dropdown and mobile menu drawer.
- `__tests__/backend/api-admin-mock-exams.test.ts` *(NEW)*: Comprehensive backend tests covering GET, POST, DELETE, missing field validation, and learner cache revalidation triggers.

### [2026-10-13] — Full 400-Question Goethe Mock Exam Bank Completed (100 Questions Each for A1, A2, B1, B2) (`feat/scale-mock-questions-bank-400`)

#### Summary
- **Bank Scaled to 400 Authentic, Copyright-Free Questions**:
  - Expanded the question bank to exactly **100 questions per CEFR level ($4 \times 100 = 400$ total in DB)** in Supabase (`wivtdopwvgefybojakuo`):
    - **Level A1 (100 Questions)**: 30 Qs $\times$ Richtig/Falsch (Teil 1), 35 Qs $\times$ Website A/B (Teil 2), 35 Qs $\times$ Richtig/Falsch (Teil 3).
    - **Level A2 (100 Questions)**: 25 Qs $\times$ 3-Choice (Teil 1), 25 Qs $\times$ 3-Choice Floor Guides (Teil 2), 25 Qs $\times$ 3-Choice Emails (Teil 3), 25 Qs $\times$ 4-Choice Classifieds with *Keine Anzeige passt* (Teil 4).
    - **Level B1 (100 Questions)**: 24 Qs $\times$ Richtig/Falsch Travel & Lifestyle Blogs (Teil 1), 18 Qs $\times$ 3-Choice Press Articles (Teil 2), 21 Qs $\times$ 4-Choice Community Board Ads with *Keine Anzeige passt* (Teil 3), 21 Qs $\times$ Ja/Nein Youth Forum Debates (Teil 4), 16 Qs $\times$ 3-Choice Facility House Regulations (Teil 5).
    - **Level B2 (100 Questions)**: 27 Qs $\times$ 4-Choice Forum Commenter Matching (Teil 1), 24 Qs $\times$ Text-Gap Cohesion Sentence Insertion (Teil 2), 18 Qs $\times$ 3-Choice Analytical & Scientific Reports (Teil 3), 18 Qs $\times$ 3-Choice Multi-Section Heading Matching (Teil 4), 13 Qs $\times$ Administrative Examination & Study Statutes Matching (Teil 5).
- **Passage-Grouped Randomizer Engine (`lib/mock/randomizer.ts`)**:
  - Automatically clusters questions by `passage_title` using `groupQuestionsByPassage()` so that reading passages stay 100% cohesive and intact during random selection.
  - Dynamically extracts authentic official Goethe quotas on every learner session:
    - **A1**: 15 Questions (5 + 5 + 5)
    - **A2**: 20 Questions (5 + 5 + 5 + 5)
    - **B1**: 30 Questions (6 + 6 + 7 + 7 + 4)
    - **B2**: 30 Questions (9 + 6 + 6 + 6 + 3)
- **100% Integrity & Copyright Compliance (`AGENTS.md` Rule 16)**:
  - 400 unique RFC 4122 UUIDs with zero duplicate questions across the entire database.
  - 100% transposed real-world scenarios with authentic German CEFR grammar and zero verbatim matches to official Goethe Modellsätze.
  - Comprehensive dual diagnostic explanations (`explanation_english` and `explanation_malayalam`) for every single question.
- **Verification & Zero Regressions**:
  - `DailyGermanVercel`: 181/181 passing unit/integration tests across 21 test suites; static build clean (598 static routes generated, 0 warnings).
  - `DailyGermanAdmin`: 136/136 passing unit/integration tests across 16 test suites; build clean (29 static/dynamic routes, 0 warnings).

### [2026-10-13] — Level A2 Question Bank Scaled to 100 Authentic Questions (`feat/scale-mock-questions-bank-400`)

#### Summary
- **Level A2 Question Bank Scaled to 100 Questions**:
  - Expanded Level A2 from 20 to **100 authentic, copyright-free questions** in the Supabase database across Teils 1, 2, 3, and 4:
    - **Teil 1 (25 Questions, 3-Choice)**: Informative magazine and news reports (workplace ergonomics in clinics, Westend community library modernization, Münster bicycle commuting revolution, Nuremberg apprentice-run gastronomy restaurant, Dresden repair café initiative).
    - **Teil 2 (25 Questions, 3-Choice)**: Everyday floor directories and guides (Bürgerpark sports center, Alster-Galerie shopping mall, central city hall and registry citizen bureau, university campus center, central train station service building).
    - **Teil 3 (25 Questions, 3-Choice)**: Detailed personal emails (Miriam's Cologne media trainee shared flat, Julian's advertising internship in Leipzig, Katja's farm holiday in the Bavarian Allgäu, Felix's new Munich apartment, Sandra's Salzburg hotel receptionist position).
    - **Teil 4 (25 Questions, 4-Choice with *Keine Anzeige passt*)**: Bulletin board classified ads (pet sitting, home painting, language courses, math/English tutoring, bicycle repair, gardening, DIY woodwork, Thai cooking, window cleaning).
- **Zero Duplicates & Full Integrity**:
  - Verified 100 unique RFC 4122 UUIDs with 0 duplicate entries.
  - Complete dual English and Malayalam diagnostic explanations for all 100 questions.
- **Passage-Grouped Randomizer Engine Active**:
  - The learner interface dynamically selects exactly **20 cohesive questions** (5 + 5 + 5 + 5) from the 100-question pool on every test run, keeping reading passages strictly clustered.

---

### [2026-10-13] — Level A1 Question Bank Scaled to 100 Authentic Questions (`feat/scale-mock-questions-bank-400`)

#### Summary
- **Level A1 Question Bank Scaled to 100 Questions**:
  - Expanded Level A1 from 15 to **100 authentic, copyright-free questions** in the Supabase database across Teils 1, 2, and 3:
    - **Teil 1 (30 Questions, Richtig/Falsch)**: Short private and semi-formal emails and messages (birthday parties, doctor appointments, moving help, language tandems, football tickets, bakeries, lost keys, car TÜV inspection, concert tickets, apartment water shutoffs).
    - **Teil 2 (35 Questions, Website A/B)**: Daily situations matched to dual website options (city bicycles, evening German courses, dog-friendly hotels, vegetarian cookbooks, children's cinema, beginner swimming, night trains, van rentals, museum nights, guitar lessons, express dry cleaning, vocabulary apps, lake camping, Saturday yoga, organic veggie boxes, ski rentals, online exam prep, English tours, laptop repairs, sushi workshops, late-night pizza, secondhand washing machines, 24h vet clinics, instant passport photos, nursing German, Mother's Day flowers, piano tuning, children's swim badges, Sunday flea markets, student WG flat-shares).
    - **Teil 3 (35 Questions, Richtig/Falsch)**: Public signs and notices (supermarket cash/card counters, fitness gym hygiene, tram track replacement buses, university cafeteria hours, eye doctor waiting rooms, bank ATMs, park barbecue zones, train quiet zones, holiday dental clinics, mall elevators, 24h pharmacy bells, bus front-boarding rules, zoo animal feeding bans, library Wi-Fi, hotel check-out times, laundry tokens, playground dog bans, museum flash bans, train bicycle tickets, office kitchen dishwashers, cloakrooms, parking pay-stations, citizen bureau appointments, 24/7 book return drops, table reservations, parcel pick-up IDs, water slides, ICE bistros, waste separation bins, emergency dental hotlines).
- **Zero Duplicates & Full Integrity**:
  - Verified 100 unique RFC 4122 UUIDs with 0 duplicate entries.
  - Complete dual English and Malayalam diagnostic explanations for all 100 questions.
- **Passage-Grouped Randomizer Engine Active**:
  - The learner interface dynamically selects exactly **15 cohesive questions** (5 + 5 + 5) from the 100-question pool on every test run, keeping reading passages strictly clustered.

---

### [2026-10-13] — Goethe-Format B2 5-Teil Blueprint Completion to 30 Questions (`feat/complete-goethe-b2-30-questions`)

#### Summary
- **Goethe-Zertifikat B2 Reading Examination Blueprint Completion**:
  - Restored full compliance with the official 5-Teil, 30-question, 65-minute Goethe B2 Reading blueprint by authoring and inserting the missing 9 questions (advancing B2 question bank from 21 to 30 questions):
    - **Teil 2 (Q10–Q15 — 6 Questions)**: Cohesion sentence insertion into text gaps of a feature article (*Die Renaissance moderner Holzarchitektur in europäischen Großstädten*). Tests B2 sentence connectives, causal relationships, and cross-sentence pronouns.
    - **Teil 5 (Q28–Q30 — 3 Questions)**: Administrative catalog matching for statutory regulations (*Ausbildungs- & Prüfungsordnung der Europäischen Akademie für Erneuerbare Energien*). Tests formal nominal style and legal terminology across § 14, § 15, and § 16.
- **Copyright Differentiation & Linguistic Grounding**:
  - 100% original, copyright-differentiated scenarios, entities, and phrasing.
  - Complete dual English and Malayalam diagnostic explanations for all new questions.
- **Rule 16 Invariant Updated**:
  - Updated Rule 16 in `AGENTS.md` across both repositories documenting the exact 5-Teil, 30-question B2 format and quotas for A1 (15 Qs), A2 (20 Qs), B1 (30 Qs), and B2 (30 Qs).
- **Database & Metadata Updated**:
  - Updated `public.mock_exams` for B2 (`44444444-aaaa-4444-8444-444444444444`) setting `total_questions = 30`.

---

### [2026-10-13] — Authentic Goethe Examination Task Format Fidelity Restoration (`fix/authentic-goethe-question-formats`)

#### Summary
- **Restoration of Authentic Goethe Examination Task Types**:
  - Restored true-to-exam question format mechanisms across all 86 questions while preserving 100% original, copyright-differentiated scenarios:
    - **Richtig / Falsch (2 options)**: Restored for A1 Teil 1 (5 Qs), A1 Teil 3 (5 Qs), and B1 Teil 1 (6 Qs).
    - **Website A / Website B (2 options)**: Restored for A1 Teil 2 (5 Qs).
    - **Ja / Nein (2 options)**: Restored for B1 Teil 4 (7 Qs reader forum).
    - **3-Choice Multiple Choice (a, b, c)**: Restored for A2 Teils 1, 2, 3 (15 Qs), B1 Teils 2 & 5 (10 Qs), and B2 Teils 3 & 4 (12 Qs).
    - **4-Choice Matching (a, b, c, d)**: Preserved for B2 Teil 1 (9 Qs matching 4 forum posters) and classified matching with *Keine Anzeige* in A2 Teil 4 (5 Qs) and B1 Teil 3 (7 Qs).
- **Rule 16 Policy Invariant Updated**:
  - Refined **Rule 16** in both `DailyGermanVercel/AGENTS.md` and `DailyGermanAdmin/AGENTS.md` to forbid flattening authentic exam task formats into generic 4-choice questions, enforcing exact blueprint format parity.
- **Verification & Production Revalidation**:
  - 100% test pass rate across both repositories (180 tests in `DailyGermanVercel`, 136 tests in `DailyGermanAdmin`).
  - Successfully revalidated Edge ISR cache across `/goethe`, `/mock`, `/mock/a1`, `/mock/a2`, `/mock/b1`, `/mock/b2`.

---

### [2026-10-13] — Goethe Mock Exam Complete Context Transposition & 4-Option Moderate Standardization (`feat/copyright-safe-goethe-mock-content`)

#### Summary
- **Universal Context & Scenario Transposition Across All 86 Questions**:
  - Transposed every reading comprehension scenario across all levels (A1, A2, B1, B2) to fresh, original real-world contexts to completely eliminate copyright and trademark liability:
    - **A1 (15 Qs)**: Transposed to weekend cycling tour meetup, dentist appointment rescheduling, long-distance coach tickets (FlixBus), weekend cooking workshops, and public pool/library/airport notices.
    - **A2 (20 Qs)**: Transposed to hospital staff wellness and nutrition initiatives, community sports & cultural center building directories, vocational trainee shared flats in Cologne, and local services classifieds.
    - **B1 (30 Qs)**: Transposed to lost camera backpack on an island ferry, zero-waste eco-districts in Freiburg, historical walking tours in Rothenburg, adult education center (VHS) courses, and youth debates on digital learning tablets.
    - **B2 (21 Qs)**: Transposed to sustainable urban mobility and car-free living, algorithmic bias and AI decision-making in corporate recruitment, and the evolution of modern co-living and flexible workplaces.
- **Strict Standardization to 4 Moderate-Difficulty Options (A, B, C, D)**:
  - Standardized 100% of questions (86/86) to exactly 4 options (`options` JSON length = 4, `correct_option_id IN ('a', 'b', 'c', 'd')`).
  - Added plausible, moderate-difficulty German distractors testing genuine linguistic and contextual comprehension rather than superficial keyword matching.
  - Synchronized complete, detailed Malayalam and English explanations for every question explaining why the correct answer is right and why the distractors are wrong.
- **Permanent Policy Rule 16 in `AGENTS.md`**:
  - Expanded **Rule 16: Goethe Mock Exam & Content Copyright Differentiation Standard** in both `DailyGermanVercel/AGENTS.md` and `DailyGermanAdmin/AGENTS.md` mandating complete context transposition and 4-option moderate-difficulty standardization for all future educational content.
- **Automated Verification & Edge Cache Revalidation**:
  - 100% pass rate across all 180 tests in `DailyGermanVercel` and 136 tests in `DailyGermanAdmin`.
  - Revalidated Edge ISR cache across `/goethe`, `/mock`, `/mock/a1`, `/mock/a2`, `/mock/b1`, `/mock/b2` on production.

### [2026-10-16] — Official Goethe Exam Pass Score & Grade Calculator Integration (`feat/goethe-exam-calculator`)

#### Summary
Documented the deployment and refinement of the official **Goethe Exam Pass Score & Grade Calculator** (`/tools/goethe-calculator`) in `DailyGermanVercel` for levels **A1, A2, B1, B2, C1, and C2**. The calculator features a 100% English interface designed for non-technical international learners, verified direct links to official Goethe-Institut regulatory PDFs returning `HTTP 200 OK` (resolving external web 404/403 blocking), official *Durchführungsbestimmungen* (DbP) regulations, sub-threshold requirements (such as A2's mandatory 45/75 written and 15/25 oral minimums), non-linear raw-to-scaled conversion tables for 30-item modules (B1/B2/C1), and C2 component multipliers. Edge cache revalidation endpoints have been synchronized.

#### Administrative & Architectural Alignment
- Synchronized revalidation prefix `/tools/` across admin invalidation workflows.
- Maintained strict token parity and dual-repository build/test compliance (193/193 tests in Learner App, 136/136 tests in Admin CMS).

---

### [2026-10-13] — Mock Exam CMS Synchronization & Authentic Question Bank Expansion (`feat/complete-authentic-goethe-question-banks`)

#### Summary
Synchronized the Mock Exam Admin CMS module (`/mock`, `/api/admin/mock`, `/api/admin/mock/questions`) with the live database schema and official Goethe-Institut examination blueprints across A1 (15 Qs), A2 (20 Qs), B1 (30 Qs), and B2 (21 Qs).

#### Key Files Added / Modified in `DailyGermanAdmin`
- `types/index.ts`: Aligned `MockExam` interface with PostgreSQL columns:
  - `section: GoetheSection` (`"Lesen" | "Hören" | "Schreiben" | "Sprechen"`)
  - `time_limit_minutes: number`
  - `passing_percentage: number`
  - `total_questions: number`
- `app/api/admin/mock/route.ts`: Fixed missing `await req.json()` body parsing in `POST` handler; triggered on-demand revalidation for `/mock` paths.
- `app/mock/page.tsx`: Updated exam form state and card rendering from obsolete `module`/`duration_minutes` to `section`/`time_limit_minutes`.
- `__tests__/backend/api-admin-mock-exams.test.ts`: 100% passing tests (6 tests) verifying CRUD and revalidation triggers.

---

### [2026-10-13] — Enforce 100% Dynamic Layout, Sizing & Zoom Calculations (`docs/dynamic-layout-rule`)

#### Summary
- Added **Rule 15** to `AGENTS.md` prohibiting hardcoded pixel dimensions/zoom values and requiring 100% dynamic, container/viewport-relative layout and scaling calculations across all components.

---

### [2026-10-12] — Grammar PDF Upload, Supabase Storage Management & 4-State Media Support (`feat/grammar-pdf-upload`)

#### Summary
Added PDF study-notes upload and management to the Grammar Admin CMS (`/grammar`), backed by the `grammar-pdfs` Supabase Storage bucket with automatic storage file cleanup on deletion. Updated `mutateGrammarVideo` and `/api/admin/grammar/videos` to support Video-only, PDF-only, or Both Video + PDF per resource item. Added `AGENTS.md` Rule 14 requiring comprehensive LLM-readable changelog updates on every merge to `main`.

#### Database & Storage Migrations (Supabase `wivtdopwvgefybojakuo`)
- **Migration `add_grammar_videos_pdf_url_and_bucket`**:
  - Added `pdf_url TEXT` to `public.grammar_videos`.
  - Created `grammar-pdfs` bucket (`public: true`, 15 MB max file size, `application/pdf` MIME type).
  - Created RLS policies `"Public read access for grammar-pdfs"` (`SELECT`) and `"Admin manage grammar-pdfs"` (`ALL` using `public.is_admin()`).
- **Migration `add_grammar_videos_media_check_constraint`**:
  - Added `CHECK` constraint `grammar_videos_media_check`: `CHECK (btrim(coalesce(video_url, '')) <> '' OR btrim(coalesce(pdf_url, '')) <> '')`.

#### Files Added / Modified in `DailyGermanAdmin`
- `types/index.ts`: Added `pdf_url?: string | null` to `GrammarVideo`.
- `app/api/admin/grammar/upload-pdf/route.ts` *(NEW)*:
  - `POST`: Verifies admin session, validates PDF file (`application/pdf` or `.pdf`, max 15 MB), uploads to `grammar-pdfs/grammar/<uuid>.pdf`, and returns `{ url, path }`.
  - `DELETE`: Verifies admin session, extracts the storage path inside `grammar-pdfs`, and deletes the file from Supabase Storage.
- `lib/db/content.ts`:
  - Updated `mutateGrammarVideo`: Validates that at least one of `video_url` or `pdf_url` is non-empty, defaults `video_url` to `""` when PDF-only, and persists `pdf_url`.
  - Updated `deleteGrammarVideo`: Queries `pdf_url` before row deletion and removes the corresponding object from `grammar-pdfs` bucket in Supabase Storage.
- `app/api/admin/grammar/videos/route.ts`:
  - Relaxed `POST` validation to require `topic_id` and at least one of `video_url` or `pdf_url` (supporting Video-only, PDF-only, and Both).
- `app/grammar/page.tsx`:
  - Added PDF file upload button (`Upload PDF File`), direct PDF URL field, `Remove PDF` action (which also cleans up Supabase Storage), and `[🎥 Video]` / `[📄 PDF Attached]` status badges in the Grammar Resources tab.
- `__tests__/backend/api-admin-grammar.test.ts`:
  - Added unit tests covering Video-only, PDF-only, Both Video + PDF, and validation failure when neither is provided.
- `AGENTS.md` & `CHANGELOG.md`:
  - Added Rule 14 (`Mandatory LLM-Readable CHANGELOG.md & Complete Feature Documentation`) and initialized this comprehensive changelog.

---

### [2026-10-17] — Goethe Exam Hub Consolidation & Writing/Speaking Guide CMS (`feat/goethe-exam-templates-matrix`)
- **Summary**:
  - Implemented the Admin CMS module for the Goethe Universal Exam Matrix and Writing & Speaking Guide at `/exam-templates`.
  - Created table `public.goethe_exam_templates` with native UUIDv4 primary keys, RLS enforcing `is_admin()`, and indexes on `(level, module_type, section)`.
  - Added CRUD endpoints at `app/api/admin/exam-templates/route.ts` with on-demand Edge revalidation.
  - Updated `revalidateLearnerPaths` calls in `/api/admin/mock`, `/api/admin/mock/questions`, and `/api/admin/exam-templates` to target the consolidated `/goethe/*` routes (`/goethe`, `/goethe/mock`, `/goethe/writing-speaking-guide`).
  - Updated learner tool preview link in `ExamTemplatesManager.tsx` to `http://localhost:3000/goethe/writing-speaking-guide`.
  - All 141 backend tests passing (100% pass rate).
- **Key Files**:
  - `app/api/admin/exam-templates/route.ts` *(NEW)*: GET, POST, DELETE with revalidation for `/goethe/writing-speaking-guide`.
  - `app/api/admin/mock/route.ts` & `app/api/admin/mock/questions/route.ts`: Updated revalidation paths to `/goethe/mock`.
  - `components/ExamTemplatesManager.tsx`: Updated live learner URL to `/goethe/writing-speaking-guide`.
  - `__tests__/backend/api-admin-exam-templates.test.ts` & `__tests__/backend/api-admin-mock-exams.test.ts`: Updated test assertions for consolidated routes (100% pass rate).
