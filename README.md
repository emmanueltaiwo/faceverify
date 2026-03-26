# FaceVerify

Real-time face verification in the browser: webcam, MediaPipe Face Landmarker, and guided steps (look straight, turn head, open mouth, blink).

## Stack

- Next.js (App Router), TypeScript, Tailwind CSS  
- [Motion](https://motion.dev/) for UI animation  
- [@mediapipe/tasks-vision](https://www.npmjs.com/package/@mediapipe/tasks-vision) (Face Landmarker, model loaded from Google’s CDN)

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). **Allow camera access** when prompted.

## Scripts

| Command | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |

## Notes

- Requires a modern browser with HTTPS or `localhost` (camera APIs).  
- The WASM bundle for MediaPipe is loaded from the jsDelivr CDN; the `.task` model is loaded from Google’s storage URL configured in `lib/mediapipe.ts`.
