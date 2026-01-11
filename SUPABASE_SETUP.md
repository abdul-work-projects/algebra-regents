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
- Row Level Security policies for the questions table
- Storage bucket RLS policies for authenticated uploads
- Automatic timestamp triggers

**Important:** The SQL script includes storage bucket policies. Make sure to create the storage buckets (Step 3) BEFORE running the schema if you encounter policy errors, OR run the schema twice (once before creating buckets, once after).

### If You Already Have the Questions Table

If you've already set up the database before and need to add the `name` field:

1. Go to SQL Editor in Supabase
2. Run the migration script:
   ```sql
   ALTER TABLE questions ADD COLUMN IF NOT EXISTS name TEXT;
   ```
3. This adds the optional name field without affecting existing data

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

## Step 5: Create Admin User

To upload questions, you need to create an admin user account:

1. In your Supabase dashboard, click "Authentication" in the left sidebar
2. Click "Users" tab
3. Click "Add user" → "Create new user"
4. Fill in the user details:
   - Email: Your admin email (e.g., admin@yourdomain.com)
   - Password: Choose a strong password
   - Auto Confirm User: ✓ Yes (check this box)
5. Click "Create user"

**Important:** Save these credentials securely - you'll need them to log in to the admin panel.

### Alternative: Sign up via the app (Optional)

If you want to enable user registration through the app:

1. In Supabase dashboard, go to "Authentication" → "Providers"
2. Enable "Email" provider
3. Configure email templates if desired
4. Create a signup page in your app (not included in MVP)

## Step 6: Test the Integration

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000)

3. Click "Admin Login" in the top right

4. Log in with your admin credentials (created in Step 5)

5. Try uploading a test question:
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

### Error: "StorageApiError: new row violates row-level security policy"

This is the most common error when uploading images. It means the storage buckets don't have the correct RLS policies.

**Solution:**

1. Make sure you created all three storage buckets (question-images, reference-images, explanation-images)
2. Go back to SQL Editor in Supabase dashboard
3. Run this SQL to add the storage policies:

```sql
-- Allow public read access
CREATE POLICY "Public read access for question-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'question-images');

CREATE POLICY "Public read access for reference-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'reference-images');

CREATE POLICY "Public read access for explanation-images"
ON storage.objects FOR SELECT
USING (bucket_id = 'explanation-images');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload question-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'question-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload reference-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'reference-images' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can upload explanation-images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'explanation-images' AND auth.role() = 'authenticated');
```

4. Click "Run"
5. Try uploading again

**Alternative:** Re-run the entire `supabase-schema.sql` file - it includes these policies.

### Error: "Failed to upload question image"

- Check that you created all three storage buckets
- Make sure the buckets are set to "Public"
- Verify your environment variables are correct
- Make sure you're logged in as an authenticated user

### Error: "Error fetching questions"

- Check that you ran the SQL schema successfully
- Verify your environment variables are correct
- Check the browser console for detailed error messages

### Cannot login / "Invalid login credentials"

- Verify you created the admin user in Supabase dashboard
- Check that "Auto Confirm User" was enabled when creating the user
- Make sure you're using the correct email and password
- Try resetting the password in Supabase dashboard: Authentication → Users → Click user → Reset Password

### Redirected to login when trying to upload questions

- This is expected behavior - you must be logged in
- Make sure you created an admin user (Step 5)
- The RLS policies require authentication for INSERT/UPDATE/DELETE operations

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
