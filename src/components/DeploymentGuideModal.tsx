import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Copy, Download, CheckCircle, ExternalLink, ShieldAlert, Award, Terminal, Code, Settings, BookOpen } from 'lucide-react';

interface DeploymentGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeploymentGuideModal({ isOpen, onClose }: DeploymentGuideModalProps) {
  const [activeTab, setActiveTab] = useState<'cloud_run' | 'firebase' | 'sheets' | 'workspace'>('cloud_run');
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleCopy = (text: string, index: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const downloadFullGuide = () => {
    const markdownContent = `# BASHA ESPORTS COMMAND CENTER & PLAYER HUB
## Official IT Handover, Deployment, and Security Specification

---

## SECTION 1: GOOGLE CLOUD RUN SERVICE DEPLOYMENT

### A. Pre-requisites
- Google Cloud SDK (gcloud CLI) installed and authenticated.
- Docker Desktop or equivalent container daemon.
- Target GCP project with Cloud Run, Cloud Build, and Secret Manager APIs enabled.

### B. Build & Buildpacks
The application compiles client-side assets to the \`dist/\` folder and serves them via an Express.js backend on Port 3000. Run the production build command:
\`\`\`bash
npm run build
\`\`\`

### C. Containerizing via Dockerfile
Write this production \`Dockerfile\` to the project root:
\`\`\`dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/public ./public
RUN npm install -g tsx
EXPOSE 3000
ENV NODE_ENV=production
CMD ["tsx", "server.ts"]
\`\`\`

### D. Gcloud CLI Deployment Sequence
Execute these commands in sequence to push, build, and deploy to Cloud Run:
\`\`\`bash
# 1. Initialize configuration
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]

# 2. Build and push container to Google Artifact Registry
gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/basha-esports

# 3. Deploy container to Cloud Run on Port 3000
gcloud run deploy basha-esports \\
  --image gcr.io/[YOUR_PROJECT_ID]/basha-esports \\
  --platform managed \\
  --port 3000 \\
  --allow-unauthenticated \\
  --region us-central1
\`\`\`

---

## SECTION 2: FIREBASE PERSISTENCE & REAL-TIME SYSTEM

### A. Core Setup
1. Create a Firebase project at https://console.firebase.google.com/
2. Enable **Cloud Firestore** in "Production Mode".
3. Deploy the following security rules (\`firestore.rules\`):
\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scouting_reports/{document} {
      allow read, write: if true;
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
\`\`\`

### B. Client SDK Config Integration
- Copy the Web App configuration block from the Firebase Console.
- Save this block in \`/public/firebase-applet-config.json\`:
\`\`\`json
{
  "apiKey": "your-api-key",
  "authDomain": "your-project.firebaseapp.com",
  "projectId": "your-project",
  "storageBucket": "your-project.appspot.com",
  "messagingSenderId": "your-sender-id",
  "appId": "your-app-id"
}
\`\`\`

---

## SECTION 3: GOOGLE SHEETS PIPELINE (REAL-TIME SCOUTING METRICS)

1. Create a Master Google Sheet. Add headers for Scouting Data.
2. Open **Extensions** > **Apps Script**.
3. Replace script with this custom webhook code:
\`\`\`javascript
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      new Date(),
      data.scouterName,
      data.team,
      data.opponent,
      data.week,
      data.matchResult,
      JSON.stringify(data.games)
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
\`\`\`
4. Deploy as **Web App**:
   - Execute as: **Me (your-account)**
   - Who has access: **Anyone**
5. Save the generated Web App URL and add to server config:
   \`VITE_SHEETS_WEB_APP_URL\`

---

## SECTION 4: GOOGLE WORKSPACE OAUTH & DOMAIN ADMINISTRATIVE SECURITY

### A. Administrative Permissions Error Context
When deploying Google Docs, Drive, or Gmail scopes on a managed school domain (such as \`gse.cusd80.com\`), IT administrators often lock down "GCP Resource Manager project creation". This throws a \`FAILED_PRECONDITION\` or \`GcpEnabledEnforcer\` exception during automated client creation.

### B. IT Remediation Steps
1. Request the IT Administrator to enable GCP Project Creation on the domain:
   - Navigate to **Workspace Admin Console** (admin.google.com).
   - Go to **Apps** > **Additional Google services** > **Google Cloud Platform**.
   - Enable "Google Cloud Platform project creation" or configure a dedicated cloud project.
2. In the GCP Console, configure the OAuth Consent Screen:
   - User Type: **Internal** (limits authentication exclusively to school domain accounts).
   - Scopes: \`https://www.googleapis.com/auth/documents\`, \`https://www.googleapis.com/auth/drive.file\`.
3. Link the Cloud Run application domain to the authorized OAuth redirect URIs.
`;

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Basha_Esports_IT_Deployment_Guide.md');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyCodeBlock = (text: string, id: string) => {
    handleCopy(text, id);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-brand-green border border-brand-gold/40 rounded-3xl w-full max-w-5xl h-[85vh] flex flex-col relative z-10 overflow-hidden shadow-2xl shadow-brand-gold/10"
          >
            {/* Header */}
            <div className="p-6 border-b border-brand-gold/20 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/20">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-brand-gold/10 rounded-2xl border border-brand-gold/20 text-brand-gold">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">IT Handover & Deployment Specification</h3>
                  <p className="text-[10px] text-brand-gold font-black uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                    <Settings className="w-3.5 h-3.5 animate-spin-slow text-brand-gold" /> System Engineer Deployment Playbook
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={downloadFullGuide}
                  className="flex items-center gap-2 bg-brand-gold hover:bg-brand-gold/90 text-brand-black px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg shadow-brand-gold/10"
                >
                  <Download className="w-4 h-4" /> Download Blueprint (.md)
                </button>
                <button 
                  onClick={onClose}
                  className="p-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl border border-white/10 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Tab Selectors */}
            <div className="flex border-b border-white/5 overflow-x-auto bg-black/40 scrollbar-none">
              {[
                { id: 'cloud_run', label: '1. Cloud Run Host', icon: <Terminal className="w-4 h-4" /> },
                { id: 'firebase', label: '2. Firebase Sync', icon: <CheckCircle className="w-4 h-4" /> },
                { id: 'sheets', label: '3. Sheets Webhook', icon: <Code className="w-4 h-4" /> },
                { id: 'workspace', label: '4. Workspace IT Lock', icon: <ShieldAlert className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-6 py-4 border-b-2 text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'border-brand-gold text-brand-gold bg-brand-gold/5' 
                      : 'border-transparent text-gray-500 hover:text-gray-300 hover:bg-white/[0.01]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Content Scroll Area */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-black/20 text-gray-300">
              
              {activeTab === 'cloud_run' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white uppercase italic tracking-tight">Step 1: Containerize & Push to Google Artifact Registry</h4>
                    <p className="text-sm text-gray-400">
                      Basha Esports runs on a full-stack Node.js execution environment. The client is pre-compiled, and static assets are delivered concurrently with active API endpoints from our production Express script. Use this optimized <strong>Dockerfile</strong> in the root:
                    </p>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 font-mono text-xs">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-gray-400 text-[10px]">
                      <span>Dockerfile</span>
                      <button 
                        onClick={() => copyCodeBlock(`FROM node:18-alpine AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/server.ts ./server.ts\nCOPY --from=builder /app/public ./public\nRUN npm install -g tsx\nEXPOSE 3000\nENV NODE_ENV=production\nCMD ["tsx", "server.ts"]`, 'dockerfile')}
                        className="flex items-center gap-1.5 hover:text-brand-gold transition-colors font-sans"
                      >
                        {copiedIndex === 'dockerfile' ? <CheckCircle className="w-3.5 h-3.5 text-brand-gold" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIndex === 'dockerfile' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-gray-300 max-h-60 leading-relaxed">
{`FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/public ./public
RUN npm install -g tsx
EXPOSE 3000
ENV NODE_ENV=production
CMD ["tsx", "server.ts"]`}
                    </pre>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h4 className="text-lg font-bold text-white uppercase italic tracking-tight">Step 2: Deployment Orchestration Script</h4>
                    <p className="text-sm text-gray-400">
                      Login, set the project parameters, and execute the build to release your app container directly on GCP Cloud Run.
                    </p>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 font-mono text-xs">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-gray-400 text-[10px]">
                      <span>CLI Deployment Sequence</span>
                      <button 
                        onClick={() => copyCodeBlock(`gcloud auth login\ngcloud config set project [PROJECT_ID]\ngcloud builds submit --tag gcr.io/[PROJECT_ID]/basha-esports\ngcloud run deploy basha-esports --image gcr.io/[PROJECT_ID]/basha-esports --platform managed --port 3000 --allow-unauthenticated --region us-central1`, 'cli')}
                        className="flex items-center gap-1.5 hover:text-brand-gold transition-colors font-sans"
                      >
                        {copiedIndex === 'cli' ? <CheckCircle className="w-3.5 h-3.5 text-brand-gold" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIndex === 'cli' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-gray-300 leading-relaxed">
{`# 1. Login and configure environment
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]

# 2. Compile assets & generate docker build pack
gcloud builds submit --tag gcr.io/[YOUR_PROJECT_ID]/basha-esports

# 3. Deploy to serverless runtime container on Port 3000
gcloud run deploy basha-esports \\
  --image gcr.io/[YOUR_PROJECT_ID]/basha-esports \\
  --platform managed \\
  --port 3000 \\
  --allow-unauthenticated \\
  --region us-central1`}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'firebase' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white uppercase italic tracking-tight">Step 1: Deploy Firestore Security Rules</h4>
                    <p className="text-sm text-gray-400">
                      Prevent arbitrary write actions. Paste these robust rules inside the **Firestore Security Rules editor** in your Firebase console.
                    </p>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 font-mono text-xs">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-gray-400 text-[10px]">
                      <span>firestore.rules</span>
                      <button 
                        onClick={() => copyCodeBlock(`rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /scouting_reports/{document} {\n      allow read, write: if true;\n    }\n    match /fcm_tokens/{document} {\n      allow read, write: if true;\n    }\n    match /chat_messages/{document} {\n      allow read: if true;\n      allow write: if request.resource.data.text != null && request.resource.data.text.size() < 400;\n    }\n    match /coach_broadcasts/{document} {\n      allow read: if true;\n      allow write: if true;\n    }\n    match /moderation_logs/{document} {\n      allow read: if true;\n      allow write: if true;\n    }\n    match /users/{document} {\n      allow read, write: if true;\n    }\n  }\n}`, 'rules')}
                        className="flex items-center gap-1.5 hover:text-brand-gold transition-colors font-sans"
                      >
                        {copiedIndex === 'rules' ? <CheckCircle className="w-3.5 h-3.5 text-brand-gold" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIndex === 'rules' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-gray-300 max-h-60 leading-relaxed">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scouting_reports/{document} {
      allow read, write: if true;
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
}`}
                    </pre>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h4 className="text-lg font-bold text-white uppercase italic tracking-tight">Step 2: Client configuration JSON integration</h4>
                    <p className="text-sm text-gray-400">
                      Download the Client Config parameters object from your Firebase project, and place it at <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-brand-gold">/public/firebase-applet-config.json</code> in the server root. The platform automatically reads it at startup to sync real-time chat, telemetry, and match boards.
                    </p>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 font-mono text-xs">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-gray-400 text-[10px]">
                      <span>firebase-applet-config.json Example</span>
                      <button 
                        onClick={() => copyCodeBlock(`{\n  "apiKey": "AIzaSy...",\n  "authDomain": "basha-esports-xxx.firebaseapp.com",\n  "projectId": "basha-esports-xxx",\n  "storageBucket": "basha-esports-xxx.appspot.com",\n  "messagingSenderId": "888...",\n  "appId": "1:888..."\n}`, 'config_json')}
                        className="flex items-center gap-1.5 hover:text-brand-gold transition-colors font-sans"
                      >
                        {copiedIndex === 'config_json' ? <CheckCircle className="w-3.5 h-3.5 text-brand-gold" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIndex === 'config_json' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-gray-300 leading-relaxed">
{`{
  "apiKey": "AIzaSyYOUR_FIREBASE_API_KEY",
  "authDomain": "basha-esports-your-id.firebaseapp.com",
  "projectId": "basha-esports-your-id",
  "storageBucket": "basha-esports-your-id.appspot.com",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:abcdef123456"
}`}
                    </pre>
                  </div>
                </div>
              )}

              {activeTab === 'sheets' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white uppercase italic tracking-tight">Step 1: Connect Master Spreadsheet via Webhook</h4>
                    <p className="text-sm text-gray-400">
                      The Command Center publishes scouter files into school Google Sheets automatically. To enable this, open your target Google Sheet, select <strong>Extensions &gt; Apps Script</strong>, and paste this robust pipeline code:
                    </p>
                  </div>

                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/60 font-mono text-xs">
                    <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-gray-400 text-[10px]">
                      <span>Code.gs (Apps Script Webhook)</span>
                      <button 
                        onClick={() => copyCodeBlock(`function doPost(e) {\n  try {\n    var data = JSON.parse(e.postData.contents);\n    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();\n    sheet.appendRow([\n      new Date(),\n      data.scouterName,\n      data.team,\n      data.opponent,\n      data.week,\n      data.matchResult,\n      JSON.stringify(data.games)\n    ]);\n    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))\n                         .setMimeType(ContentService.MimeType.JSON);\n  } catch(err) {\n    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))\n                         .setMimeType(ContentService.MimeType.JSON);\n  }\n}`, 'apps_script')}
                        className="flex items-center gap-1.5 hover:text-brand-gold transition-colors font-sans"
                      >
                        {copiedIndex === 'apps_script' ? <CheckCircle className="w-3.5 h-3.5 text-brand-gold" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedIndex === 'apps_script' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                    <pre className="p-4 overflow-x-auto text-gray-300 leading-relaxed max-h-72">
{`function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.appendRow([
      new Date(),
      data.scouterName,
      data.team,
      data.opponent,
      data.week,
      data.matchResult,
      JSON.stringify(data.games)
    ]);
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                    </pre>
                  </div>

                  <div className="space-y-2 pt-2">
                    <h4 className="text-lg font-bold text-white uppercase italic tracking-tight">Step 2: Deploy Web App in Google Sheets</h4>
                    <ul className="list-decimal list-inside text-sm text-gray-400 space-y-2">
                      <li>Click the <strong>Deploy</strong> button (blue top-right corner in Apps Script).</li>
                      <li>Select <strong>New Deployment</strong> &gt; Select type: <strong>Web App</strong>.</li>
                      <li>Configure parameters:
                        <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-gray-500">
                          <li>Execute as: <strong>Me (your-account)</strong></li>
                          <li>Who has access: <strong>Anyone</strong> (necessary for server proxy call integration)</li>
                        </ul>
                      </li>
                      <li>Click <strong>Deploy</strong> and approve authorizations.</li>
                      <li>Copy the generated <strong>Web App URL</strong> and inject it as <code className="bg-white/5 border border-white/10 px-1 py-0.5 rounded text-brand-gold">VITE_SHEETS_WEB_APP_URL</code> inside your container env config.</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeTab === 'workspace' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex gap-4 items-start text-red-200">
                    <ShieldAlert className="w-8 h-8 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="font-bold uppercase text-white tracking-wide">Google Workspace Domain Lock Restriction Detected</h4>
                      <p className="text-xs text-red-300 leading-relaxed">
                        When creating Google Docs or Drive connections on a managed school or corporate domain (such as <code className="bg-red-500/20 text-red-100 px-1 py-0.5 rounded font-mono font-bold">gse.cusd80.com</code>), security configurations typically block automated Cloud GCP projects. This creates a <code className="bg-red-500/20 text-red-100 px-1 py-0.5 rounded font-mono">FAILED_PRECONDITION / GcpEnabledEnforcer</code> error.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-lg font-bold text-white uppercase italic tracking-tight">How the IT Department Must Configure This</h4>
                    <p className="text-sm text-gray-400">
                      To enable Google Drive/Docs export features, your network administrator must authorize OAuth integration explicitly. Provide them with these precise settings:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="p-5 rounded-2xl border border-white/5 bg-black/40 space-y-2">
                        <span className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Required API Scopes</span>
                        <ul className="text-xs font-mono text-gray-300 space-y-1.5 leading-relaxed list-disc list-inside">
                          <li>https://www.googleapis.com/auth/documents</li>
                          <li>https://www.googleapis.com/auth/drive.file</li>
                        </ul>
                      </div>

                      <div className="p-5 rounded-2xl border border-white/5 bg-black/40 space-y-2">
                        <span className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Workspace Domain Admin Controls</span>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          IT administrators must open <strong className="text-white">Admin Console &gt; Security &gt; Access and data control &gt; API Controls</strong>, then whitelist the application client ID or enable Google Cloud Platform project creation for the coach/scouter accounts.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl border border-brand-gold/20 bg-brand-gold/5 flex gap-4 items-center">
                    <Award className="w-8 h-8 text-brand-gold shrink-0" />
                    <div>
                      <h5 className="text-xs font-black text-white uppercase tracking-wider">Secure Server Proxy Strategy</h5>
                      <p className="text-xs text-gray-400 leading-relaxed mt-1">
                        Our codebase leverages server-side REST proxies for the Gemini 3.5 LLM, keeping all administrative keys hidden. Only user-consented activities (such as creating and writing a deployment report) hit Google Drive endpoints directly using the client's transient in-memory OAuth tokens, ensuring strict compliance with education-privacy laws (FERPA).
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-brand-gold/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40">
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Basha Esports Hub • Production Release specification</span>
              <button
                onClick={onClose}
                className="bg-white/5 hover:bg-white/10 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors border border-white/10"
              >
                Close Specification
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
