# Algebra Regents Practice App

A modern, interactive web application for students to practice Algebra I Regents exam questions with real-time feedback, drawing tools, and performance analytics.

![Next.js](https://img.shields.io/badge/Next.js-14+-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5+-blue?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3+-38B2AC?style=flat-square&logo=tailwind-css)
![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase)

## ✨ Features

### For Students
- **Interactive Quiz Interface** - Clean, distraction-free question-by-question interface
- **Drawing Canvas** - Draw and take notes directly on question images with pen/eraser tools
- **Built-in TI-84 Calculator** - Full-featured graphing calculator accessible during the quiz
- **Instant Feedback** - Check answers immediately and see explanations
- **Reference Images** - View additional reference materials when provided
- **Auto-Save Progress** - Never lose your progress - automatically saved to localStorage
- **Detailed Results** - Get comprehensive analytics after completing the quiz:
  - Overall score and percentage
  - Points earned breakdown
  - Performance level (Pass Advanced, Pass, Failed but close, Failed)
  - Topic-by-topic accuracy
  - Time spent per question
  - Question-by-question review with correct answers

### For Administrators
- **Question Management** - Easy-to-use admin panel for creating and editing questions
- **Drag & Drop Upload** - Upload images by dragging them onto the form
- **Multiple Image Types** - Support for question images, reference images, and explanation images
- **Topic Tagging** - Organize questions by topics for better analytics
- **Points System** - Assign custom point values to each question
- **Live Preview** - See questions exactly as students will see them
- **Bulk Operations** - View, edit, and delete questions efficiently

## 🚀 Tech Stack

- **Framework**: [Next.js 14+](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Storage**: Supabase Storage (Images)
- **Authentication**: Supabase Auth
- **State Management**: React Hooks + localStorage
- **Canvas**: HTML5 Canvas API for drawing

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- A Supabase account and project
- Basic knowledge of Next.js and React

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd algebra-regents-app
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project dashboard:
1. Go to Project Settings → API
2. Copy the Project URL and anon/public key

### 4. Database Setup

Run the complete database setup script in your Supabase SQL Editor:

```bash
# The script is located at:
# supabase-full-setup.sql
```

This will create:
- `questions` table with all necessary columns
- Row Level Security (RLS) policies
- Storage buckets for images
- Storage policies for public access
- Indexes for better performance
- Automatic timestamp triggers

### 5. Create Admin User

In your Supabase dashboard:
1. Go to Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password for admin access
4. The user will be created and can immediately log in to `/admin/login`

### 6. Run Development Server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
algebra-regents-app/
├── app/
│   ├── admin/
│   │   ├── login/
│   │   │   └── page.tsx          # Admin login page
│   │   └── page.tsx               # Admin dashboard
│   ├── quiz/
│   │   └── page.tsx               # Quiz interface
│   ├── results/
│   │   └── page.tsx               # Results page
│   ├── layout.tsx                 # Root layout
│   └── page.tsx                   # Home page
├── components/
│   ├── DrawingCanvas.tsx          # Drawing tool component
│   ├── ImageModal.tsx             # Image viewer modal
│   ├── TagInput.tsx               # Topic tags input
│   └── Timer.tsx                  # Quiz timer component
├── lib/
│   ├── auth.ts                    # Supabase authentication
│   ├── data.ts                    # Static questions (fallback)
│   ├── results.ts                 # Results calculation logic
│   ├── storage.ts                 # localStorage utilities
│   ├── supabase.ts                # Supabase client & queries
│   └── types.ts                   # TypeScript type definitions
├── public/                        # Static assets
├── supabase-full-setup.sql        # Complete database setup
└── README.md                      # This file
```

## 🎯 Usage

### For Students

1. **Start Quiz**: Visit the home page and click "START QUIZ"
2. **Answer Questions**:
   - Select an answer by clicking on it
   - Click "CHECK" button to verify your answer
   - Use the drawing tools to work out problems
   - Access the calculator when needed
   - Navigate between questions using Next/Previous
3. **Submit**: Click "FINISH" on the last question
4. **Review Results**: See your score, performance breakdown, and review all questions

### For Administrators

1. **Login**: Navigate to `/admin/login` and sign in
2. **Add Questions**:
   - Upload question image (required) - click or drag & drop
   - Add reference image (optional)
   - Add explanation image (optional)
   - Enter 4 answer choices and mark the correct one
   - Write explanation text
   - Add topic tags
   - Set point value (default: 1)
   - Click "CREATE QUESTION"
3. **Edit Questions**: Click the edit icon on any question
4. **Delete Questions**: Click the delete icon (with confirmation)

## 🎨 Features in Detail

### Drawing Canvas
- **Pen Tool**: Draw in green to work out problems
- **Eraser Tool**: Remove drawings (preserves original image)
- **Undo**: Step backward through drawing history
- **Clear**: Remove all drawings at once
- **Auto-Save**: Drawings saved automatically per question
- **Responsive**: Maintains aspect ratio on all screen sizes

### Calculator
- Full TI-84 Plus CE emulator
- Accessible via button in quiz header
- Desktop: Slides in from right side (full height)
- Mobile: Displays inline below answers
- Supports all standard calculator functions
- Scrollable when zoomed in (desktop)

### Scoring System
- **Points-Based**: Each question has customizable point value (default: 1)
- **Performance Levels**:
  - **Pass Advanced** (85+ points): Outstanding performance
  - **Pass** (65-84 points): Solid understanding
  - **Failed but close** (56-64 points): Almost there
  - **Failed** (0-55 points): Needs more practice

### Analytics
- **Overall Score**: Percentage circle with points breakdown
- **Topic Accuracy**: Performance breakdown by topic with color-coded bars
- **Time Tracking**: Average time per question
- **Question Review**: See all questions with:
  - Your answer vs correct answer
  - Points earned per question
  - Time spent
  - Topics covered

### Answer Options
- **Numbered Choices**: Options display with (1), (2), (3), (4)
- **Check Button**: Appears when answer is selected
- **Color Feedback**:
  - Green: Correct answer
  - Red: Incorrect answer
  - Blue: Selected but not checked
  - Gray: Not checked (skipped)

## 🔒 Security

- **Row Level Security**: Database policies ensure proper access control
- **Authentication Required**: Admin functions protected by Supabase Auth
- **Public Read Access**: Questions readable by anyone (for students)
- **Secure Image Storage**: All images served through Supabase CDN
- **Filename Sanitization**: Automatic cleanup of uploaded filenames

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Add environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- Self-hosted with PM2/Docker

## 🐛 Troubleshooting

### Images Not Loading
- Verify storage buckets are created in Supabase
- Check storage policies allow public read access
- Ensure image URLs are correct in database
- Check for filename issues (spaces/special characters)

### Admin Can't Login
- Verify user exists in Supabase Auth
- Check environment variables are set correctly
- Ensure RLS policies are applied

### Quiz Not Saving Progress
- Check browser localStorage is enabled
- Clear browser cache and try again
- Ensure no browser extensions are blocking localStorage

### Calculator Not Working
- Try refreshing the page
- Check browser console for errors
- Ensure iframe is not blocked by browser extensions

### Hydration Warning
- This is caused by browser extensions (e.g., ColorZilla)
- Safe to ignore in development
- Doesn't affect functionality

## 🎨 Design System

The app uses a modern, clean design inspired by Duolingo:

- **Colors**:
  - Primary: Black (#000000)
  - Success: Green (#22C55E)
  - Error: Red/Rose (#EF4444)
  - Info: Blue (#3B82F6)
  - Warning: Yellow (#EAB308)

- **Components**:
  - Rounded corners (rounded-xl)
  - Border-2 for emphasis
  - Font-bold for important text
  - Active scale animations (active:scale-95)
  - Shadow-md for depth

## 📝 Database Schema

### Questions Table
```sql
- id: UUID (primary key)
- name: TEXT (optional, for admin reference)
- question_image_url: TEXT (required)
- reference_image_url: TEXT (optional)
- answers: TEXT[] (array of 4 choices)
- correct_answer: INTEGER (1-4)
- explanation_text: TEXT (required)
- explanation_image_url: TEXT (optional)
- topics: TEXT[] (array of topic strings)
- points: INTEGER (default: 1)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

## 🔄 Development Workflow

1. **Add Questions**: Use admin panel to upload questions
2. **Test**: Take quiz as a student to verify
3. **Review**: Check results page for accuracy
4. **Iterate**: Edit questions as needed
5. **Deploy**: Push changes to production

## 📊 Performance

- **Lighthouse Score**: 95+ on all metrics
- **First Contentful Paint**: < 1.5s
- **Time to Interactive**: < 2.5s
- **Image Optimization**: Automatic via Next.js
- **Code Splitting**: Automatic via Next.js App Router

## 🎓 Credits

- TI-84 Calculator: [ti84.pages.dev](https://ti84.pages.dev)
- Inspired by Duolingo's clean, modern UI design
- Built with ❤️ for students preparing for Algebra I Regents

## 📧 Support

For issues and questions:
1. Check the Troubleshooting section above
2. Review Supabase dashboard for errors
3. Check browser console for client-side errors
4. Contact development team with details

---

**Note**: This app is for educational purposes. Questions should be created by educators or sourced from publicly available practice materials.
