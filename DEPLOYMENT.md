# Deployment Guide

## Part 1: Firebase

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and create a new project
2. Disable Google Analytics (not needed for this project)
3. Click **Build → Firestore Database → Create database**
4. Choose **Start in production mode**, pick a region close to your event
5. Go to **Project Settings** (gear icon) → **Your apps** → Web app icon (`</>`)
6. Register the app with any nickname — do **not** enable Firebase Hosting
7. Copy the `firebaseConfig` values into your env vars (see table in README)
8. Go to **Firestore → Rules tab**, paste the contents of `firestore.rules`, and publish
9. The empty `quizzes` collection will appear automatically after the first write

## Part 2: Fly.io (Socket.IO server)

1. Install the Fly CLI: https://fly.io/docs/hands-on/install-flyctl/
2. Sign up / log in: `flyctl auth login`
3. From the `server/` directory:
   ```bash
   cd server
   flyctl launch        # follow prompts, choose a region close to your players
   flyctl secrets set HOST_PASSWORD=your-password
   ```
4. Note the assigned URL (e.g., `https://quiz-server.fly.dev`) — this becomes `NEXT_PUBLIC_SOCKET_URL`
5. Update the CORS `allowedOrigins` array in `server/src/index.ts` — replace `your-app.netlify.app` with your real Netlify domain, then redeploy:
   ```bash
   flyctl deploy
   ```

## Part 3: Netlify (Next.js frontend)

1. Sign up at [netlify.com](https://netlify.com) with GitHub
2. Click **Add new site → Import an existing project** → connect your GitHub repo
3. Build settings auto-detect from `netlify.toml` — no changes needed
4. Go to **Site settings → Environment variables** and add:

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_FIREBASE_API_KEY` | From Firebase Project Settings → Your apps |
   | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | From Firebase Project Settings → Your apps |
   | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | From Firebase Project Settings → Your apps |
   | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | From Firebase Project Settings → Your apps |
   | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | From Firebase Project Settings → Your apps |
   | `NEXT_PUBLIC_FIREBASE_APP_ID` | From Firebase Project Settings → Your apps |
   | `HOST_PASSWORD` | Same value set on Fly.io |
   | `NEXT_PUBLIC_SOCKET_URL` | Your Fly.io server URL (e.g., `https://quiz-server.fly.dev`) |

5. Click **Deploy site**
6. Note your assigned URL (e.g., `https://your-app.netlify.app`)
7. Go back and update the CORS config in `server/src/index.ts` with your real Netlify URL, then redeploy the Fly.io server

## CORS configuration (server/src/index.ts)

Once you know your Netlify domain, update `allowedOrigins`:

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-app.netlify.app',   // ← replace with your real domain
  /\.netlify\.app$/,                 // covers deploy previews automatically
]
```
