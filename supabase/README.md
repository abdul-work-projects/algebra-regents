# Supabase Database Setup

This folder contains all SQL scripts for setting up and migrating the database.

## Structure

```
supabase/
├── setup.sql              # Full database setup for new installations
├── migrations/            # Incremental migrations for existing databases
│   ├── 00001_add_question_text.sql
│   ├── 00002_add_answer_images.sql
│   └── 00003_add_display_order.sql
└── README.md
```

## New Installation

If you're setting up a fresh database, run only the setup script:

```sql
-- Run in Supabase SQL Editor
-- Copy and paste contents of: supabase/setup.sql
```

## Existing Database

If you have an existing database and need to apply updates, run the migrations in order:

1. **00001_add_question_text.sql** - Adds `question_text` column for text-based questions
2. **00002_add_answer_images.sql** - Adds `answer_image_urls` column and storage bucket for answer images
3. **00003_add_display_order.sql** - Adds `display_order` column for custom question ordering

Only run migrations that haven't been applied yet. Each migration is idempotent (safe to run multiple times).

## Migration History

| Migration | Description |
|-----------|-------------|
| 00001 | Add question_text column, make question_image_url nullable |
| 00002 | Add answer_image_urls column, create answer-images storage bucket |
| 00003 | Add display_order column for drag-and-drop reordering |
