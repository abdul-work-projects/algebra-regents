# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Algebra I Regents Practice App - a Next.js web application for students to practice Algebra I Regents exam questions with drawing tools, calculator integration, and performance analytics. Uses Supabase for database, auth, and image storage.

## Commands

```bash
npm run dev       # Start development server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
npm start         # Start production server
```

No test framework is currently configured.

## Architecture

### Tech Stack
- Next.js 16 (App Router) + TypeScript + React 19
- Supabase (PostgreSQL + Auth + Storage)
- Tailwind CSS
- KaTeX for math rendering

### Directory Structure
```
app/                    # Next.js pages
  admin/                # Protected admin dashboard (login + question CRUD)
  quiz/page.tsx         # Main quiz interface (complex state management)
  results/page.tsx      # Score analytics and question review
components/             # Reusable UI components
  DrawingCanvas.tsx     # Two-layer canvas (image + drawing)
  ExplanationSlider.tsx # Math rendering with KaTeX
  MathText.tsx          # KaTeX wrapper component
lib/                    # Core business logic
  supabase.ts           # All database queries and image upload
  types.ts              # TypeScript interfaces (Question, QuizSession, QuizResult)
  results.ts            # Scoring logic, raw-to-scaled score mapping
  storage.ts            # localStorage utilities for session persistence
  auth.ts               # Supabase auth helpers
supabase/               # Database schema and migrations
  setup.sql             # Initial schema (run in Supabase SQL Editor)
  migrations/           # Incremental migrations (idempotent)
```

### Data Flow
- Student quiz state persisted to localStorage (survives refresh)
- Questions fetched from Supabase `questions` table
- Images stored in Supabase Storage buckets (question-images, reference-images, explanation-images, answer-images)
- Admin authentication via Supabase Auth with RLS policies (public read, authenticated write)

### Key Types (lib/types.ts)
- `Question`: Quiz question with text/images, 4 answers, explanation, topics, points
- `QuizSession`: Client-side state (answers, drawings as base64, times, review marks)
- `QuizResult`: Calculated score, topic accuracy breakdown, per-question results

## Database

Run `supabase/setup.sql` for initial setup. Migrations in `supabase/migrations/` are incremental and safe to re-run.

Single table: `questions` with columns for text/images, answers (TEXT[]), correct_answer (1-4), explanation, topics (TEXT[]), points, display_order.

## Math Support

Uses KaTeX for rendering. Inline: `$expression$`, Display: `$$expression$$`. See `QUESTION-TEXT-GUIDE.md` for LaTeX examples.

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
