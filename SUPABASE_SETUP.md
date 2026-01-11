# Supabase Setup Guide

This guide will help you set up Supabase for the Algebra Regents App.

## Prerequisites

- A Supabase account (free tier works fine)
- Node.js and npm installed

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the project details:
   - Name: algebra-regents-app (or any name you prefer)
   - Database Password: Choose a strong password
   - Region: Choose the region closest to you
5. Click "Create new project" and wait for it to initialize (takes 1-2 minutes)

## Step 2: Set Up the Database Schema

1. In your Supabase project dashboard, click "SQL Editor" in the left sidebar
2. Click "New Query"
3. Copy the entire contents of `supabase-schema.sql` from this project
4. Paste it into the SQL editor
5. Click "Run" to execute the SQL
6. You should see a success message

This creates:
- The `questions` table with all necessary columns
- Indexes for performance
- Row Level Security policies
- Automatic timestamp triggers

## Step 3: Set Up Storage Buckets

1. In your Supabase dashboard, click "Storage" in the left sidebar
2. Click "New bucket"
3. Create three buckets with these settings:

### Bucket 1: question-images
- Name: `question-images`
- Public bucket: ✓ Yes
- Click "Create bucket"

### Bucket 2: reference-images
- Name: `reference-images`
- Public bucket: ✓ Yes
- Click "Create bucket"

### Bucket 3: explanation-images
- Name: `explanation-images`
- Public bucket: ✓ Yes
- Click "Create bucket"

## Step 4: Configure Environment Variables

1. In your Supabase dashboard, click "Settings" (gear icon) in the left sidebar
2. Click "API" under Project Settings
3. You'll see two important values:
   - Project URL
   - anon public key

4. In your project root, copy the example env file:
   ```bash
   cp .env.local.example .env.local
   ```

5. Open `.env.local` and fill in your values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url-here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

## Step 5: Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Click "Admin Panel" in the top right

4. Try uploading a test question:
   - Upload a question image
   - Fill in 4 answers
   - Select the correct answer
   - Add explanation text
   - Add topics (e.g., "Algebra, Linear Equations")
   - Click "Upload Question"

5. If successful, you'll see a success message

6. Go back to the home page and click "Start Quiz"

7. You should see your uploaded question!

## Troubleshooting

### Error: "Failed to upload question image"

- Check that you created all three storage buckets
- Make sure the buckets are set to "Public"
- Verify your environment variables are correct

### Error: "Error fetching questions"

- Check that you ran the SQL schema successfully
- Verify your environment variables are correct
- Check the browser console for detailed error messages

### Questions not showing up

- Make sure you have at least one question uploaded
- The app falls back to static sample questions if no database questions exist
- Check the Network tab in browser dev tools to see if the API calls are succeeding

## Data Structure

### Question Table Schema

```sql
questions (
  id: UUID (primary key, auto-generated)
  question_image_url: TEXT (required)
  reference_image_url: TEXT (optional)
  answers: TEXT[] (array of 4 strings, required)
  correct_answer: INTEGER (1-4, required)
  explanation_text: TEXT (required)
  explanation_image_url: TEXT (optional)
  topics: TEXT[] (array of topic strings, required)
  created_at: TIMESTAMP (auto-generated)
  updated_at: TIMESTAMP (auto-updated)
)
```

### Storage Buckets

- `question-images`: Stores question images (main question screenshots)
- `reference-images`: Stores reference images (optional helper images)
- `explanation-images`: Stores explanation images (optional solution diagrams)

## Security Notes

The current setup uses Row Level Security (RLS) with these policies:

- **Public read access**: Anyone can view questions (for quiz functionality)
- **Authenticated write access**: Only authenticated users can create/update/delete questions

For production use, you may want to:
1. Set up Supabase Auth to restrict admin access
2. Create an admin role for managing questions
3. Add more granular permissions

## Next Steps

Once everything is working:

1. Upload all your Algebra I Regents questions using the admin panel
2. Organize questions with consistent topic tags
3. Consider adding authentication for the admin panel
4. Set up regular backups of your database

## Support

If you encounter issues:

1. Check the browser console for errors
2. Check the Supabase logs in the dashboard
3. Verify all environment variables are set correctly
4. Make sure all storage buckets are created and public
