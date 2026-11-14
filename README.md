
# mufi_frontend
=======
# ESTATIQ AI — Real Estate Valuation Web Client

Modern React 19 + Vite web application for the **ESTATIQ AI** property valuation platform. Features an interactive 3D luxury villa scene, multi-step property wizard, dynamic distribution analytics, side-by-side model comparison, and CSV batch import/export.

## 🚀 Features

- **Interactive 3D Experience**: Three.js isometric house with real-time architectural lighting.
- **5-Step Valuation Wizard**: Step-by-step property configuration with live validation.
- **Quick Compare**: Side-by-side comparison between Linear Regression and Decision Tree models.
- **Exploratory Data Analytics**: Interactive Recharts histograms, correlation matrices, and scatter plots.
- **CSV Data Hub**: Import custom datasets or export predictions complying with the 12-feature schema.

## 🛠️ Local Development

```bash
npm install
npm run dev
```

App runs on `http://localhost:5173` (or port configured by Vite).

## 🔧 Environment Variables

Create `.env` based on `.env.example`:

```env
# URL of your deployed backend API (Render, Railway, or local)
VITE_API_URL="https://your-backend.onrender.com"
```

## 🌐 Deploy to Vercel

1. Import this repository into [Vercel](https://vercel.com).
2. Framework preset: **Vite**.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Set the `VITE_API_URL` environment variable pointing to your deployed backend URL.
>>>>>>> f3fda24 (Initial commit: ESTATIQ AI Frontend Web Client)
