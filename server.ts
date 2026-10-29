import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import fs from "fs";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Firebase Admin lazily
let messaging: admin.messaging.Messaging | null = null;
let db: admin.firestore.Firestore | null = null;

function initializeFirebaseAdmin() {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: config.projectId,
        });
      }
      messaging = admin.messaging();
      db = admin.firestore();
      console.log("Firebase Admin initialized successfully");
      
      // Start listening to Firestore for notification triggers
      setupFirestoreListeners();
    } catch (err) {
      console.error("Failed to initialize Firebase Admin:", err);
    }
  } else {
    console.warn("firebase-applet-config.json not found. Backend notification triggers will be inactive.");
  }
}

/**
 * Setup real-time listeners for Firestore events that trigger notifications
 */
function setupFirestoreListeners() {
  if (!db || !messaging) return;

  // 1. New Chat Messages
  db.collection('chat_messages').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const message = change.doc.data();
        // Skip messages older than 30 seconds (prevent initial load storm)
        if (Date.now() - (message.createdAt?.toMillis?.() || 0) > 30000) return;
        
        broadcastNotification({
          title: `New Team Message from ${message.senderName}`,
          body: message.text,
          data: { type: 'chat', channelId: message.channelId }
        });
      }
    });
  });

  // 2. New Coach Messages (Broadcasts)
  db.collection('coach_broadcasts').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const broadcast = change.doc.data();
        if (Date.now() - (broadcast.createdAt?.toMillis?.() || 0) > 30000) return;

        broadcastNotification({
          title: "Message from Coach",
          body: broadcast.text,
          data: { type: 'coach_message', id: change.doc.id }
        });
      }
    });
  });

  // 3. New Report Creations
  db.collection('scouting_reports').onSnapshot(snapshot => {
    snapshot.docChanges().forEach(change => {
      if (change.type === 'added') {
        const report = change.doc.data();
        if (Date.now() - (report.createdAt?.toMillis?.() || 0) > 30000) return;

        broadcastNotification({
          title: "New Scouting Report Available",
          body: `${report.submittedBy} just added a new report for ${report.enemyTeam}`,
          data: { type: 'report', id: change.doc.id }
        });
      }
    });
  });
}

/**
 * Helper to send notification to all registered tokens
 */
async function broadcastNotification(payload: { title: string, body: string, data?: any }) {
  if (!db || !messaging) return;

  try {
    // Get all user tokens (this is a simplified example)
    const tokensSnapshot = await db.collection('fcm_tokens').get();
    const tokens = tokensSnapshot.docs.map(doc => doc.id);

    if (tokens.length === 0) return;

    const message = {
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      tokens: tokens,
    };

    const response = await messaging.sendEachForMulticast(message);
    console.log(`Successfully sent ${response.successCount} notifications`);
    
    // Clean up invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(tokens[idx]);
        }
      });
      console.log(`Cleaning up ${failedTokens.length} invalid tokens`);
      // Delete logic would go here
    }
  } catch (error) {
    console.error("Error broadcasting notification:", error);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  initializeFirebaseAdmin();

  app.use(express.json({ limit: '50mb' }));

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API route for OCR
  app.post("/api/ocr-extract", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing image data" });
      }

      const prompt = `Extract these metrics from the league scoreboard image:
        Player Names/Gamertags, Champions Played, KDA (Kills, Deaths, Assists), CS, Gold Totals.
        Return as JSON with a structure:
        {
          players: [
            { name: string, champion: string, kills: number, deaths: number, assists: number, cs: number, gold: number }
          ]
        }
        Only return the JSON.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: {
          parts: [
            { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
            { text: prompt }
          ]
        }
      });

      const text = result.text || "";
      // Basic JSON extraction (removing markdown)
      const jsonStr = text.replace(/```json\n?/, '').replace(/\n?```/, '');
      res.json(JSON.parse(jsonStr));
    } catch (error) {
      console.error("OCR Error:", error);
      res.status(500).json({ error: "Failed to extract data" });
    }
  });

  // API route for YouTube Thumbnail Concept Generation
  app.post("/api/generate-thumbnail-concept", async (req, res) => {
    try {
      const { title, streamMode, opponent, level, player, gameNumber } = req.body;
      
      const prompt = `You are an elite esports graphic designer for Basha High School Esports. 
      Design a custom, high-impact YouTube thumbnail layout concept for a League of Legends stream with these details:
      - Stream Title: "${title || ""}"
      - Stream Mode: ${streamMode || "POV"}
      - Opponent Team: "${opponent || "Opponent"}"
      - Level: "${level || "Varsity"}"
      - Basha Player / Target: "${player || ""}"
      - Game Number: "${gameNumber || "1"}"

      Analyze the match context and return a JSON structure describing the perfect high-contrast graphic theme, colors, and textual overlays. 
      Include:
      1. A custom-crafted punchy Slogan/Heading (e.g. "REILLY SHOWDOWN", "CRUSHING HAMILTON", "VARSITY GAME 1", "ELITE SCOUTING"). Keep it short (1-3 words max, uppercase) for high legibility.
      2. A perfect Subtitle (e.g. "BASHA VS HAMILTON", "GAME 1 OVERVIEW", etc.).
      3. A color theme palette: primary color (hex), accent color (hex), and secondary background accent (hex). Try to make them contrast beautifully. If the opponent is known, suggest colors that represent the clash.
      4. A brief design inspiration tip explaining the layout mood (e.g. "Cyberpunk Glow", "Metallic Gold Pride", "Industrial Grid").
      5. The exact style overlay choice: "NEON_GLOW" | "PRESTIGE_GOLD" | "GLITCH_ARCADE" | "BASHA_PRIDE".

      Return only a JSON object with this schema:
      {
        "heading": "...",
        "subtitle": "...",
        "primaryColor": "#...",
        "accentColor": "#...",
        "bgColor": "#...",
        "stylePreset": "NEON_GLOW" | "PRESTIGE_GOLD" | "GLITCH_ARCADE" | "BASHA_PRIDE",
        "designInspiration": "..."
      }
      Do not include markdown wrappers like \`\`\`json.`;

      const result = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              heading: { type: Type.STRING },
              subtitle: { type: Type.STRING },
              primaryColor: { type: Type.STRING },
              accentColor: { type: Type.STRING },
              bgColor: { type: Type.STRING },
              stylePreset: { type: Type.STRING },
              designInspiration: { type: Type.STRING }
            },
            required: ["heading", "subtitle", "primaryColor", "accentColor", "bgColor", "stylePreset", "designInspiration"]
          }
        }
      });

      const text = result.text || "";
      const jsonStr = text.replace(/```json\n?/, '').replace(/\n?```/, '').trim();
      res.json(JSON.parse(jsonStr));
    } catch (error) {
      console.error("Thumbnail Concept Generation Error:", error);
      res.status(500).json({ error: "Failed to generate thumbnail concept" });
    }
  });

  // API route to summarize IGL Notes
  app.post("/api/gemini/summarize-igl-notes", async (req, res) => {
    try {
      const { notes } = req.body;
      if (!notes) {
        return res.status(400).json({ error: "Missing notes data" });
      }

      const prompt = `Analyze the following role-specific tactical notes from a single game and synthesize them into a concise "AI Refined Summary".
      
Focus on extracting the overarching team-wide strengths and weaknesses rather than just listing individual player performance. 
Format the output professionally with bullet points for 'Team Strengths' and 'Team Weaknesses'.

Notes:
- Top: ${notes.top || ""}
- Jungle: ${notes.jungle || ""}
- Mid: ${notes.mid || ""}
- ADC: ${notes.adc || ""}
- Support: ${notes.support || ""}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert esports analyst. Take raw scouting notes and convert them into a structured, professional summary focusing on overarching tactical strengths and weaknesses for the team."
        }
      });

      res.json({ summary: response.text || "" });
    } catch (error) {
      console.error("IGL Summarization Error:", error);
      res.status(500).json({ error: "Failed to generate AI summary" });
    }
  });

  // API route for chat message moderation
  app.post("/api/gemini/moderate-chat-message", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Missing message to moderate" });
      }

      const prompt = `Analyze the following chat message from a competitive gaming environment for toxicity, "flaming", or unsportsmanlike conduct.
Message: "${message}"

Return JSON securely in this format:
{
  "isToxic": true/false,
  "reason": "Brief reason for the violation if toxic, otherwise empty string"
}
`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isToxic: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            },
            required: ["isToxic", "reason"]
          }
        }
      });

      if (response.text) {
        return res.json(JSON.parse(response.text));
      }
      res.json({ isToxic: false, reason: "" });
    } catch (error) {
      console.error("Chat Moderation Error:", error);
      res.status(500).json({ error: "Chat moderation failed" });
    }
  });

  // API route to generate Team Scouting Report
  app.post("/api/gemini/generate-team-scouting-report", async (req, res) => {
    try {
      const { reports, targetTeam } = req.body;
      if (!reports || !targetTeam) {
        return res.status(400).json({ error: "Missing reports or target team" });
      }

      const dataString = JSON.stringify(reports, null, 2);
      const prompt = `
        You are an expert League of Legends esports analyst. Process the provided scouting reports for the team "${targetTeam}".
        Analyze their IGL notes, player statistics, win rates, and objective control across these games.
        Generate a concise, elite-level scouting report.

        Data:
        ${dataString.substring(0, 15000)}

        Return JSON in this format:
        {
          "threatLevels": ["high threat string", "medium threat string"],
          "weaknesses": ["weakness 1", "weakness 2"],
          "objectivePriorities": ["priority 1", "priority 2"],
          "summary": "Overall tactical summary of the team"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              threatLevels: { type: Type.ARRAY, items: { type: Type.STRING } },
              weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
              objectivePriorities: { type: Type.ARRAY, items: { type: Type.STRING } },
              summary: { type: Type.STRING }
            },
            required: ["threatLevels", "weaknesses", "objectivePriorities", "summary"]
          }
        }
      });

      if (response.text) {
        return res.json(JSON.parse(response.text));
      }
      res.json(null);
    } catch (error) {
      console.error("Team Scouting Report Error:", error);
      res.status(500).json({ error: "Failed to generate team scouting report" });
    }
  });

  // API route to generate Match Prep Insights
  app.post("/api/gemini/generate-match-prep-insights", async (req, res) => {
    try {
      const { reports, myTeam, enemyTeam } = req.body;
      if (!reports || !myTeam || !enemyTeam) {
        return res.status(400).json({ error: "Missing required match prep parameters" });
      }

      const dataString = JSON.stringify(reports, null, 2);
      const prompt = `
        You are a head coach for a League of Legends team. Your team is "${myTeam}" and you are preparing to face "${enemyTeam}".
        Based on the historical scouting reports and VOD data provided below, perform a cross-analysis of all past match data. 
        Identify team-wide weaknesses. Suggest counter-picks. Generate strategic win-conditions.
        And formulate a cohesive tactical focus for your upcoming match.

        Data:
        ${dataString.substring(0, 15000)}

        Return JSON in this format:
        {
          "winConditions": ["condition 1", "condition 2", "condition 3"],
          "suggestedCounters": [
            { "role": "Top", "enemyChampion": "Champion name", "suggestedCounter": "Counter Champion", "reason": "why" }
          ],
          "tacticalFocus": "Main tactical and strategic execution focus for the game, detailing team-wide weaknesses and countermeasures."
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              winConditions: { type: Type.ARRAY, items: { type: Type.STRING } },
              suggestedCounters: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT, 
                  properties: {
                    role: { type: Type.STRING },
                    enemyChampion: { type: Type.STRING },
                    suggestedCounter: { type: Type.STRING },
                    reason: { type: Type.STRING }
                  }
                } 
              },
              tacticalFocus: { type: Type.STRING }
            },
            required: ["winConditions", "suggestedCounters", "tacticalFocus"]
          }
        }
      });

      if (response.text) {
        return res.json(JSON.parse(response.text));
      }
      res.json(null);
    } catch (error) {
      console.error("Match Prep Insights Error:", error);
      res.status(500).json({ error: "Failed to generate match prep insights" });
    }
  });

  // Accountability Check Endpoint (Targeted by Cron)
  app.post("/api/check-accountability", async (req, res) => {
    // Only allow if authorized (e.g., via a secret or local host)
    const authHeader = req.headers.authorization;
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!db || !messaging) {
      return res.status(500).json({ error: "Firebase not initialized" });
    }

    try {
      const studentsSnapshot = await db.collection('users').where('role', '==', 'Student').get();
      const reportsSnapshot = await db.collection('scouting_reports').get(); // Simplified for demo
      
      const students = studentsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
      const reports = reportsSnapshot.docs.map(doc => doc.data());

      let remindersSent = 0;

      for (const student of students as any) {
        const studentReports = reports.filter(r => r.submittedBy === student.email);
        
        // Checklist Logic (Matching StudentDashboard.tsx)
        const weeklyScreenshots = studentReports.length; // Simplified check
        const hasIglReport = studentReports.some(r => r.iglNotes);
        const hasScoutReport = studentReports.some(r => r.opponent || r.team);

        let missingTasks = [];
        if (weeklyScreenshots < 5) missingTasks.push(`${5 - weeklyScreenshots} match screenshots`);
        if (student.assignedAssignment === 'IGL' && !hasIglReport) missingTasks.push("Weekly IGL Report");
        if ((student.assignedAssignment === 'Scouter' || student.assignedAssignment === 'Analyst') && !hasScoutReport) missingTasks.push("Weekly Scouting Report");

        if (missingTasks.length > 0) {
          // Send notification to this specific student
          const tokensSnapshot = await db.collection('fcm_tokens').doc(student.uid).get();
          const tokens = tokensSnapshot.exists ? [student.uid] : []; // Example logic, assuming doc ID is token if simplied

          if (tokens.length > 0) {
            await broadcastNotification({
              title: "Checklist Reminder 🕒",
              body: `Don't forget your tasks: ${missingTasks.join(', ')}. Submit by EOW!`,
              data: { type: 'checklist_reminder', userId: student.uid }
            });
            remindersSent++;
          }
        }
      }

      res.json({ status: "ok", remindersSent });
    } catch (error) {
      console.error("Accountability Check Error:", error);
      res.status(500).json({ error: "Internal Error" });
    }
  });

  // DDragon Proxy to avoid "Failed to fetch" on client side
  app.get("/api/ddragon/versions", async (req, res) => {
    try {
      const response = await fetch('https://ddragon.leagueoflegends.com/api/versions.json');
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("DDragon Version Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch versions" });
    }
  });

  app.get("/api/ddragon/cdn/*", async (req, res) => {
    try {
      const path = req.params[0];
      const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${path}`);
      
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('content-type', contentType);
      }
      
      const buffer = await response.arrayBuffer();
      res.send(Buffer.from(buffer));
    } catch (error) {
      console.error("DDragon CDN Proxy Error:", error);
      res.status(500).json({ error: "Failed to fetch cdn data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
