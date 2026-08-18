# SkillForge AI — Complete Production Deployment Guide

This guide gives step-by-step instructions to deploy **SkillForge AI**:
- **Frontend**: [Vercel](https://vercel.com) (Vite + React)
- **Backend & Worker**: [Render](https://render.com) (Node.js + Express + Prisma 7)
- **Database**: [Supabase](https://supabase.com) (PostgreSQL)

---

## 🏗️ Architecture Overview

```
┌───────────────────────────────────────┐
│          Vercel (Frontend)            │
│   https://skillforge-ai.vercel.app    │
└──────────────────┬────────────────────┘
                   │ HTTPS API Requests
                   ▼
┌───────────────────────────────────────┐
│          Render (Backend)             │
│ https://skillforge-backend.onrender.com│
└──────────────────┬────────────────────┘
                   │ Prisma ORM Connection
                   ▼
┌───────────────────────────────────────┐
│         Supabase (Database)           │
│   PostgreSQL Database on Port 6543    │
└───────────────────────────────────────┘
```

---

## Step 1: Push Your Project to GitHub

If you haven't already uploaded the project to GitHub:

1. Open your terminal in `d:\Projects\SkillForge AI`
2. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit for production deployment"
   ```
3. Create a new repository on GitHub named `SkillForge_AI` (Public or Private).
4. Link and push to GitHub:
   ```bash
   git remote add origin https://github.com/YOUR_GITHUB_USERNAME/SkillForge_AI.git
   git branch -M main
   git push -u origin main
   ```

---

## Step 2: Database Preparation (Supabase)

1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Select your project -> Go to **Project Settings** (gear icon) -> **Database**.
3. Under **Connection string** -> Select **URI** (Transaction Pooler - Port `6543`).
4. Copy your connection string:
   ```env
   postgresql://postgres.[YOUR_PROJECT_REF]:[YOUR_PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

---

## Step 3: Deploy Backend on Render

### 3.1 Create Web Service on Render
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> Select **Web Service**.
3. Connect your GitHub account and select your repository `SkillForge_AI`.

### 3.2 Configure Web Service Settings
Fill in the following fields:

| Field | Value |
|-------|-------|
| **Name** | `skillforge-backend` |
| **Region** | Select closest to your users (e.g., Singapore / Oregon) |
| **Branch** | `main` |
| **Root Directory** | `backend` *(IMPORTANT!)* |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |

### 3.3 Add Environment Variables on Render
Scroll down to **Environment Variables** -> Click **Add Environment Variable** for each:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Enables production security & cookies |
| `PORT` | `3001` | Server port |
| `DATABASE_URL` | `postgresql://postgres...` | Your Supabase connection string from Step 2 |
| `JWT_SECRET` | `your_super_secret_jwt_key_12345` | Random secure string for JWT tokens |
| `JWT_EXPIRES_IN` | `30m` | Token expiration time |
| `FRONTEND_URL` | `https://skillforge-ai.vercel.app` | You will update this after Step 4 |
| `LLM_API_KEY` | `sk-...` | *(Optional)* OpenAI/LLM API key for AI parsing |

### 3.4 Deploy Backend
Click **Create Web Service**. 
Render will build and start your Express server. Once finished, copy your Render backend URL (e.g. `https://skillforge-backend.onrender.com`).

---

## Step 4: Deploy Frontend on Vercel

### 4.1 Import Repository on Vercel
1. Log in to [Vercel Dashboard](https://vercel.com/dashboard).
2. Click **Add New...** -> Select **Project**.
3. Import your GitHub repository `SkillForge_AI`.

### 4.2 Configure Vercel Project Settings
Fill in the following fields:

| Field | Value |
|-------|-------|
| **Project Name** | `skillforge-ai` |
| **Framework Preset** | `Vite` |
| **Root Directory** | Click **Edit** -> Select `frontend` *(IMPORTANT!)* |
| **Build Command** | `npm run build` *(Auto-detected)* |
| **Output Directory** | `dist` *(Auto-detected)* |

### 4.3 Add Environment Variable on Vercel
Expand **Environment Variables** -> Add:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://skillforge-backend.onrender.com/api/v1` |

*(Replace with your actual Render backend URL from Step 3)*

### 4.4 Deploy Frontend
Click **Deploy**.
Vercel will build your React application in ~1 minute and provide your live URL (e.g., `https://skillforge-ai.vercel.app`).

---

## Step 5: Connect CORS & Final Verification

1. Go back to your [Render Dashboard](https://dashboard.render.com) -> Select `skillforge-backend` -> **Environment**.
2. Update the `FRONTEND_URL` environment variable to match your live Vercel URL:
   ```env
   FRONTEND_URL=https://skillforge-ai.vercel.app
   ```
3. Save changes. Render will automatically redeploy.

---

## 🧪 Production Verification Checklist

Open your live Vercel website in an Incognito window:

- [ ] **Register / Login**: Create a new account & log in.
- [ ] **Resume Upload**: Upload a PDF resume and check text extraction status.
- [ ] **Skills Confirm**: Add, edit, or delete skills with optimistic UI updates.
- [ ] **Target Role Selection**: Search and select a target career track.
- [ ] **Dashboard Roadmap**: View skill gap analysis, milestone phases, and traceable project/cert recommendations.

---

## 🔧 Troubleshooting Common Deployment Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| **CORS Error in Browser** | `FRONTEND_URL` mismatch on Render | Ensure `FRONTEND_URL` on Render matches your exact Vercel domain (without trailing slash). |
| **404 Page Not Found on Refresh** | Missing SPA rewrite | Ensure `frontend/vercel.json` exists with rewrite to `/index.html`. |
| **Database Connection Error** | Missing `DATABASE_URL` | Double check Supabase PgBouncer URL string in Render environment variables. |
| **Login Cookie Not Persisting** | Cross-domain cookie policy | Handled automatically by `sameSite: 'none'` + `secure: true` in production code. |
