# Git Setup Guide

This guide will help you set up Git and push your project to GitHub.

## Initial Git Setup

### 1. Initialize Git Repository

```bash
cd algebra-regents-app
git init
```

### 2. Add All Files

```bash
git add .
```

### 3. Make Initial Commit

```bash
git commit -m "Initial commit: Algebra I Regents Practice App MVP"
```

## Create GitHub Repository

### Option A: Using GitHub Website

1. Go to [https://github.com/new](https://github.com/new)
2. Fill in repository details:
   - **Repository name**: `algebra-regents-app` (or your preferred name)
   - **Description**: "Algebra I Regents Practice Web App - MVP"
   - **Visibility**: Private (recommended) or Public
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"
4. Copy the repository URL (should look like: `https://github.com/yourusername/algebra-regents-app.git`)

### Option B: Using GitHub CLI

```bash
# Install GitHub CLI if you haven't: https://cli.github.com/
gh repo create algebra-regents-app --private --source=. --remote=origin --push
```

## Connect to GitHub (If using Option A)

```bash
# Add remote repository
git remote add origin https://github.com/yourusername/algebra-regents-app.git

# Push code
git branch -M main
git push -u origin main
```

## Verify Upload

```bash
git remote -v
# Should show:
# origin  https://github.com/yourusername/algebra-regents-app.git (fetch)
# origin  https://github.com/yourusername/algebra-regents-app.git (push)
```

## Making Changes

### After editing files:

```bash
# Check what changed
git status

# Add specific files
git add filename.tsx

# Or add all changes
git add .

# Commit with a message
git commit -m "Description of changes"

# Push to GitHub
git push
```

## Useful Git Commands

### Check status
```bash
git status
```

### View commit history
```bash
git log --oneline
```

### Create a new branch
```bash
git checkout -b feature/new-feature
```

### Switch branches
```bash
git checkout main
```

### Merge a branch
```bash
git checkout main
git merge feature/new-feature
```

### Undo last commit (keep changes)
```bash
git reset --soft HEAD~1
```

### Discard all local changes
```bash
git reset --hard HEAD
```

## Branch Strategy

For this project, we recommend a simple strategy:

- **main**: Production-ready code
- **develop**: Development branch (optional)
- **feature/***: Feature branches (optional)

### Example workflow:

```bash
# Create feature branch
git checkout -b feature/add-new-questions
# Make changes...
git add .
git commit -m "Add 10 new questions"
git push -u origin feature/add-new-questions
# Create pull request on GitHub
# Merge to main
```

## Collaborating

If transferring ownership to client:

### Transfer Repository Ownership

1. Go to repository settings on GitHub
2. Scroll to "Danger Zone"
3. Click "Transfer ownership"
4. Enter recipient's GitHub username
5. Follow prompts to complete transfer

### Add Collaborator

1. Go to repository settings on GitHub
2. Click "Collaborators"
3. Click "Add people"
4. Enter their GitHub username
5. They'll receive an invitation email

## .gitignore

The project already includes a `.gitignore` file that excludes:
- `node_modules/`
- `.next/`
- `.env*.local`
- Build files
- System files

**Important**: Never commit:
- `node_modules/` (always in .gitignore)
- `.env` files with secrets
- Build output
- Large files (>100MB)

## Git Best Practices

1. **Commit often**: Small, focused commits
2. **Write clear messages**: Describe what and why
3. **Pull before push**: `git pull` before `git push`
4. **Test before commit**: Make sure code works
5. **Don't commit secrets**: No API keys, passwords, etc.

### Good commit messages:
```bash
git commit -m "Add drawing tool undo functionality"
git commit -m "Fix timer reset bug on question change"
git commit -m "Update styling for mobile responsiveness"
git commit -m "Add 20 new Algebra questions"
```

### Bad commit messages:
```bash
git commit -m "fix"
git commit -m "updates"
git commit -m "asdf"
git commit -m "changes"
```

## GitHub Features to Use

### Issues
Track bugs and feature requests:
- Go to "Issues" tab
- Click "New issue"
- Describe the problem/feature

### Pull Requests
For code review workflow:
- Create feature branch
- Push changes
- Open pull request
- Review and merge

### Releases
Tag stable versions:
```bash
git tag -a v1.0.0 -m "MVP Release"
git push origin v1.0.0
```

## Troubleshooting

### Authentication Issues

**HTTPS (recommended):**
- Use Personal Access Token instead of password
- Create at: Settings > Developer settings > Personal access tokens

**SSH:**
```bash
# Generate SSH key
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add to GitHub: Settings > SSH and GPG keys
```

### Large Files

If you accidentally commit a large file:
```bash
# Remove from Git but keep locally
git rm --cached large-file.png
git commit -m "Remove large file"
git push
```

### Merge Conflicts

```bash
# Pull latest changes
git pull
# Git will mark conflicts in files
# Edit files to resolve conflicts
git add .
git commit -m "Resolve merge conflicts"
git push
```

## Next Steps

After setting up Git:
1. Push to GitHub ✓
2. Set up Vercel/Netlify deployment (see DEPLOYMENT.md)
3. Connect deployment to GitHub for auto-deploy
4. Add question data (see ADDING_QUESTIONS.md)

## Resources

- [GitHub Docs](https://docs.github.com)
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Desktop](https://desktop.github.com) - GUI alternative
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
