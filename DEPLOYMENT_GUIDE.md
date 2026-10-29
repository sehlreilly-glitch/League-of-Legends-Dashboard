# IT Deployment Blueprint & Architecture Specification
**Application Name:** Basha Esports Command Center & Player Hub  
**Target Environment:** Node.js v18+ / Dockerized Container (Google Cloud Run, AWS ECS, or Azure Container Apps)  
**Database/Backend Services:** Firebase Firestore, Google Sheets API, Google Gemini API  

This document serves as the official blueprint and systems handoff specification for the IT and Systems Engineering department to transition the **Basha Esports Command Center** into production.

---

## 1. Executive Architecture Overview

The system is engineered as a high-density, real-time, full-stack esports analytics platform using a **monolithic backend + Vite SPA middleware pattern**.

```
                   ┌──────────────────────────────────────────────┐
                   │               Client Browser                 │
                   └──────────────────────┬───────────────────────┘
                                          │
                                          ▼ HTTPS / WSS
                   ┌──────────────────────────────────────────────┐
                   │             Production Nginx Proxy           │
                   └──────────────────────┬───────────────────────┘
                                          │
                                          ▼ Port 3000 (Internal)
                   ┌──────────────────────────────────────────────┐
                   │             Node.js Express Server           │
                   └──────┬──────────────────┬─────────────────┬──┘
                          │                  │                 │
                          ▼ (HTTPS Client)   ▼ (SDK REST)      ▼ (Admin SDK)
               ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
               │  Google Gemini   │ │  Google Sheets   │ │ Firebase/Firestore│
               │   API (v1beta)   │ │  Web App URL     │ │ Real-Time Engine │
               └──────────────────┘ └──────────────────┘ └──────────────────┘
```

- **Frontend Interface:** Single-page application built on React 19, TypeScript, and styled using Tailwind CSS v4.
- **Backend Service:** Express server (v4) hosting proxy endpoints for Google Gemini LLM API operations, Firebase Administrative operations, and static file delivery.
- **Data Persistence Strategy:** Dual-hybrid configuration. Critical scouting reports, real-time channels, and logs persist via Firebase Firestore. Simple client configurations fallback elegantly to `localStorage`.

---

## 2. Infrastructure Requirements

### A. Compute Hosting
- **Runtime Environment:** Node.js v18 or newer.
- **Server Frame:** Node Express server configured to listen on interface `0.0.0.0` and port `3000`.
- **Recommended Container Configuration:** 
  - CPU: 1 vCPU (minimum)
  - Memory: 1 GB RAM (minimum)
  - Auto-scaling rules: Scale from 0 to 5 container instances based on CPU utilization.

### B. Network & Security Settings
- **Port Allocation:** Port `3000` is the single externally bound port.
- **Transport Security:** Must terminate SSL/TLS at the reverse proxy layer (e.g., Cloudflare, Cloud Run HTTPS frontend, Nginx ingress) before passing unencrypted HTTP requests to Node.js on port `3000`.
- **Cors Policy:** The Express application restricts traffic based on relative routing paths, protecting internal APIs (`/api/*`) from unauthorized external domains.

---

## 3. Environment Configuration & External API Keys

Create a production `.env` file in the root execution directory. Ensure these variables are populated securely:

```env
# Server Mode Configuration
# Options: 'internal' (Default Player Hub) or 'public' (Command Center Spectator view)
VITE_APP_MODE=internal

# Google Gemini Large Language Model API Key
# This secret MUST reside exclusively on the server-side env and never compile into client-side JS bundles.
GEMINI_API_KEY=AIzaSyYourSecretGeminiAPIKeyHere

# Google Sheets Spreadsheet Synchronizer URL
# The Web App URL generated from the Google Apps Script deployment.
VITE_SHEETS_WEB_APP_URL=https://script.google.com/macros/s/.../exec
```

---

## 4. Google Workspace & Sheets Integration Setup

For real-time player data and performance indicators to write/read from school spreadsheets:

1. **Spreadsheet Target:** Create a master Google Sheet containing tabs for `Scouting Data` and `Team Metrics`.
2. **Deploy Google Apps Script:**
   - From the Google Sheet toolbar, select **Extensions** > **Apps Script**.
   - Paste the Google Sheet proxy script (handling `doPost` and `doGet` requests) to parse JSON scouting schemas.
   - Click **Deploy** > **New Deployment**.
   - Select type **Web App**.
   - Configure Access: Set **"Execute as: Me"** and **"Who has access: Anyone"** (to allow the server proxy to securely communicate without leaking spreadsheet workspace tokens).
   - Copy the generated Web App URL and populate `VITE_SHEETS_WEB_APP_URL` in the environment configuration.

---

## 5. Firebase Real-Time Engine Provisioning

The real-time team chat, coach broadcasts, and scouting logs are backed by Firebase.

1. **Database Setup:**
   - Create a Google Firebase Project via [Firebase Console](https://console.firebase.google.com/).
   - Provision a **Cloud Firestore** database instance. Select production mode and deploy the security rules listed below.
2. **Client Config Injection:**
   - Download the Firebase Web SDK config object from your project settings.
   - Save the config structure directly in `/public/firebase-applet-config.json` in the root folder of the web server. The app automatically detects this file and upgrades the runtime engine from offline mode to live synchronization.

### Recommended Firestore Security Rules (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scouting_reports/{document} {
      allow read, write: if true; // Lock down to authenticated user tokens if Auth is implemented
    }
    match /fcm_tokens/{document} {
      allow read, write: if true;
    }
    match /chat_messages/{document} {
      allow read: if true;
      allow write: if request.resource.data.text != null && request.resource.data.text.size() < 400;
    }
    match /coach_broadcasts/{document} {
      allow read: if true;
      allow write: if true;
    }
    match /moderation_logs/{document} {
      allow read: if true;
      allow write: if true;
    }
    match /users/{document} {
      allow read, write: if true;
    }
  }
}
```

---

## 6. Docker Containerization & Compilation

A standard multi-stage `Dockerfile` is recommended for high-performance deployment:

```dockerfile
# Stage 1: Build the Static React Assets
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve via Express Server
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/public ./public

# Install TypeScript runtime execution dependencies
RUN npm install -g tsx

EXPOSE 3000
ENV NODE_ENV=production
CMD ["tsx", "server.ts"]
```

---

## 7. IT Handover Verification Checklist

Before opening the portal to players, coaches, and administrators, verify the following:

- [ ] **Port Ingress:** Server successfully responds to external requests on port `3000` via secure reverse proxy TLS.
- [ ] **Static Assets Routing:** Main SPA index page and CSS/JS assets successfully load in client browsers.
- [ ] **Google Gemini Endpoint Proxy:** Navigating to the Thumbnail Generator and clicking "AI Suggest" generates an on-brand title and color preset without exposing `GEMINI_API_KEY` to client console network inspector.
- [ ] **Real-time Synchronization:** Send a message in the player chat or post a coach broadcast. Ensure it is written to Firestore and displays dynamically in other open tabs.
- [ ] **Spreadsheet Pipeline:** Export match analytics to Google Sheets, verifying that row counts increase under the administrator dashboard.
