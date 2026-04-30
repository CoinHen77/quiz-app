## Quiz App

Kahoot-style live multiplayer quiz app built with Next.js 14, Socket.IO, and Firebase Firestore.

## Development

Copy `.env.example` to `.env.local` and fill in values, then:

```bash
npm run dev        # starts Next.js (port 3000) + Socket.IO server (port 3001)
npm run dev:next   # Next.js only
npm run dev:server # Socket.IO server only
```

## Environment Variables

| Variable | Where set | Description |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Netlify dashboard / `.env.local` | Firebase web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Netlify dashboard / `.env.local` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Netlify dashboard / `.env.local` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Netlify dashboard / `.env.local` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Netlify dashboard / `.env.local` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Netlify dashboard / `.env.local` | Firebase app ID |
| `HOST_PASSWORD` | Netlify dashboard / `.env.local` | Password for /host routes |
| `NEXT_PUBLIC_SOCKET_URL` | Netlify dashboard / `.env.local` | Socket.IO server URL |

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full deployment instructions.
