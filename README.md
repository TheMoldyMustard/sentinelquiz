# SentinelQuiz

**Security-First Personal Quiz Engine & Learning Accelerator**

A mobile-optimized PWA that transforms LLM-generated JSON into a high-retention quiz experience. Dual-mode architecture (Identification + Multiple Choice) with a zero-trust import pipeline.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), Tailwind CSS, Framer Motion |
| Database | Supabase (PostgreSQL + RLS) |
| Validation | Zod (`safeParse`) |
| Sanitization | DOMPurify |
| Hosting | Vercel |

---

## Getting Started

### 1. Clone & Install

```bash
git clone https://github.com/your-org/sentinelquiz
cd sentinelquiz
npm install
```

### 2. Configure Supabase

```bash
cp .env.example .env.local
```

Fill in your Supabase project URL and anon key from the [Supabase Dashboard](https://app.supabase.com) → Settings → API.

### 3. Run the Migration

In the Supabase SQL editor, run:

```
supabase/migrations/001_initial.sql
```

This creates:
- `quiz_sessions` — stores imported item sets per user
- `quiz_results` — stores completed run results
- RLS policies: `auth.uid() = user_id` on both tables

### 4. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## JSON Import Format

SentinelQuiz accepts a specific JSON schema. Every field is validated via Zod and sanitized via DOMPurify before entering the quiz engine.

```json
[
  {
    "question": "What OSI layer does TLS operate on?",
    "answer": "Presentation Layer (Layer 6)",
    "distractors": [
      "Transport Layer (Layer 4)",
      "Session Layer (Layer 5)",
      "Application Layer (Layer 7)"
    ]
  }
]
```

**Rules:**
- Root element must be an array
- Each item requires: `question` (string), `answer` (string), `distractors` (array of exactly 3 strings)
- Max 500 items per import
- All HTML/script tags are stripped automatically

### Generating quiz JSON with an LLM

```
Generate a quiz JSON array about [topic].
Each item must have:
- "question": a clear question string
- "answer": the single correct answer
- "distractors": exactly 3 plausible wrong answers

Respond ONLY with valid JSON, no markdown, no preamble.
```

---

## Scoring Algorithm

```
S = (B × M) - P
```

| Variable | Value | Description |
|----------|-------|-------------|
| B | 100 | Base points |
| M | 1.0 | Identification mode multiplier |
| M | 0.5 | Multiple Choice mode multiplier |
| P | 25 | Hint penalty (per hint used) |

---

## Finite State Machine

```
idle ──START──► answering
answering ──USE_HINT──► hint_used
answering / hint_used ──SUBMIT_ANSWER──► correct | incorrect
correct | incorrect ──NEXT──► answering | complete
complete ──RESET──► idle
```

---

## Architecture

```
sentinelquiz/
├── app/
│   ├── page.tsx              # Import + mode selection
│   ├── quiz/page.tsx         # Quiz session runner
│   ├── layout.tsx            # Root layout + PWA metadata
│   └── globals.css           # Design system + animations
├── components/
│   ├── ImportModule.tsx      # JSON security firewall UI
│   ├── QuizEngine.tsx        # FSM-driven quiz orchestrator
│   ├── IdentificationMode.tsx # Free-recall typing mode
│   ├── MultipleChoiceMode.tsx # 4-option selection mode
│   └── ScoreDisplay.tsx      # End-of-session results
├── lib/
│   ├── fsm.ts                # Pure FSM reducer + selectors
│   ├── sanitize.ts           # DOMPurify wrapper (SSR-safe)
│   ├── schemas/quiz.ts       # Zod validation schema
│   └── supabase/
│       ├── client.ts         # Browser client
│       └── server.ts         # Server client (SSR)
├── types/quiz.ts             # All TypeScript types
└── supabase/migrations/
    └── 001_initial.sql       # DB schema + RLS policies
```

---

## Deploy to Vercel

```bash
npx vercel deploy
```

Set environment variables in the Vercel project settings:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Security Notes

- **XSS**: All imported content is HTML-stripped before use in state
- **RLS**: Every DB row is isolated by `auth.uid() = user_id`
- **CSP**: Strict Content-Security-Policy headers set in `next.config.ts`
- **HSTS**: Strict-Transport-Security enabled for production
- **Auth**: Magic Link / Social Login via Supabase Auth (no passwords stored)
