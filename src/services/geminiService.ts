import { ScoutingReport } from "../types";

export async function summarizeIGLNotes(notes: { top: string; jungle: string; mid: string; adc: string; support: string }): Promise<string> {
  try {
    const response = await fetch("/api/gemini/summarize-igl-notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (!response.ok) {
      throw new Error("Failed to summarize IGL notes");
    }
    const data = await response.json();
    return data.summary || "";
  } catch (err) {
    console.error("Failed to generate AI summary:", err);
    return "Error parsing AI summary.";
  }
}

export async function moderateChatMessage(message: string): Promise<{ isToxic: boolean, reason: string }> {
  try {
    const response = await fetch("/api/gemini/moderate-chat-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!response.ok) {
      throw new Error("Failed to moderate chat message");
    }
    return await response.json();
  } catch (err) {
    console.error("Chat moderation failed:", err);
    return { isToxic: false, reason: "" };
  }
}

export async function generateTeamScoutingReport(reports: ScoutingReport[], targetTeam: string) {
  try {
    const response = await fetch("/api/gemini/generate-team-scouting-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reports, targetTeam }),
    });
    if (!response.ok) {
      throw new Error("Failed to generate team scouting report");
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to generate team scouting report:", error);
    return null;
  }
}

export async function generateMatchPrepInsights(reports: ScoutingReport[], myTeam: string, enemyTeam: string) {
  try {
    const response = await fetch("/api/gemini/generate-match-prep-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reports, myTeam, enemyTeam }),
    });
    if (!response.ok) {
      throw new Error("Failed to generate match prep insights");
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to generate match prep insights:", error);
    return null;
  }
}
