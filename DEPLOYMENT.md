# Deployment Guide

This guide will help you deploy the Algebra I Regents Practice Web App to Vercel or Netlify.

## Prerequisites

1. A GitHub account
2. Your code pushed to a GitHub repository
3. A Vercel or Netlify account

## Option 1: Deploy to Vercel (Recommended)

Vercel is the company behind Next.js and provides the best integration.

### Steps:

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Sign in to Vercel**
   - Go to [https://vercel.com](https://vercel.com)
   - Sign in with your GitHub account

3. **Import your project**
   - Click "Add New Project"
   - Select your GitHub repository
   - Vercel will automatically detect Next.js settings

4. **Configure (if needed)**
   - Framework Preset: Next.js (auto-detected)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
   - Install Command: `npm install` (default)

5. **Deploy**
   - Click "Deploy"
   - Wait for the build to complete (usually 1-2 minutes)
   - Your app will be live at `https://your-project-name.vercel.app`

6. **Custom Domain (Optional)**
   - Go to Project Settings > Domains
   - Add your custom domain
   - Follow the DNS configuration instructions

### Environment Variables

This project doesn't require any environment variables in Phase 1.

## Option 2: Deploy to Netlify

### Steps:

1. **Push your code to GitHub** (same as above)

2. **Sign in to Netlify**
   - Go to [https://netlify.com](https://netlify.com)
   - Sign in with your GitHub account

3. **Import your project**
   - Click "Add new site" > "Import an existing project"
   - Choose GitHub and select your repository

4. **Configure build settings**
   - Build command: `npm run build`
   - Publish directory: `.next`

5. **Add Next.js plugin**
   - In the Netlify dashboard, go to "Plugins"
   - Search for "Next.js" and install the "Essential Next.js Plugin"

6. **Deploy**
   - Click "Deploy site"
   - Your app will be live at `https://your-site-name.netlify.app`

## Post-Deployment Checklist

- [ ] Test all features on the live site
- [ ] Test on mobile devices
- [ ] Test drawing tool functionality
- [ ] Verify localStorage persistence works
- [ ] Test quiz completion flow
- [ ] Check results page analytics
- [ ] Verify calculator button opens Desmos

## Continuous Deployment

Both Vercel and Netlify support automatic deployments:

- **Automatic**: Every push to `main` branch triggers a new deployment
- **Preview**: Pull requests get their own preview URLs

## Analytics Setup (Optional)

### Google Analytics

1. Get your Google Analytics tracking ID
2. Add to `app/layout.tsx`:
```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID`}></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'YOUR_GA_ID');
          `
        }} />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

### Vercel Analytics

1. Go to your project on Vercel
2. Click "Analytics" tab
3. Enable Vercel Analytics (free tier available)

## Performance Optimization

The app is already optimized with:
- Next.js Image Optimization
- Static generation where possible
- Lazy loading
- Minimal bundle size

## Troubleshooting

### Build fails on Vercel/Netlify

**Problem**: TypeScript errors
**Solution**: Run `npm run build` locally first to catch errors

**Problem**: Missing dependencies
**Solution**: Ensure all dependencies are in `package.json`, not just devDependencies

### localStorage not working

**Problem**: localStorage is undefined
**Solution**: Already handled with `typeof window !== 'undefined'` checks

### Images not loading

**Problem**: Question images don't appear
**Solution**:
1. Ensure images are in `public/images/` directory
2. Update image paths in `app/quiz/page.tsx`
3. Use relative paths: `/images/question-1.png`

## Support

For deployment issues:
- Vercel: [https://vercel.com/docs](https://vercel.com/docs)
- Netlify: [https://docs.netlify.com](https://docs.netlify.com)
