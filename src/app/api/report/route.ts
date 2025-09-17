// src/app/api/report/generate/route.ts

import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { transcription } = await request.json();

    if (!transcription) {
      return NextResponse.json({ error: 'Transcription is required.' }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `
      You are an expert hockey scout assistant. Based on the following raw audio transcription from a scout, generate a structured scouting report in Markdown format.

      The report must include:
      1.  A main title (Heading 1) like "# Scouting Report: [Player Name] (#Number)".
      2.  A brief one-sentence summary of the player.
      3.  A Markdown table for key stats if they are mentioned (e.g., Goals, Assists, TOI). If no stats are mentioned, omit the table.
      4.  A "## Strengths" section (Heading 2) with bullet points.
      5.  A "## Areas for Improvement" section (Heading 2) with bullet points.

      Analyze the scout's language for sentiment and key observations. Be concise and professional.

      **Transcription:**
      ---
      ${transcription}
      ---
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const report = response.text();

    return NextResponse.json({ report });

  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report.' }, { status: 500 });
  }
}