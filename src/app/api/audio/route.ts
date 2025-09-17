import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';

// IMPORTANT: Set the runtime to 'edge' for best performance with streaming AI
export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('audio') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }

    // Initialize Google AI with your API key
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Convert the file to a Buffer, then to a base64 string
    const audioBuffer = await file.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    const prompt = "Transcribe the following audio of a sports scout. Focus on clarity and accuracy.";

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: file.type,
          data: audioBase64,
        },
      },
    ]);

    const response = result.response;
    const transcription = response.text();

    return NextResponse.json({ transcription });

  } catch (error) {
    console.error('Error in transcription API:', error);
    return NextResponse.json({ error: 'Failed to transcribe audio.' }, { status: 500 });
  }
}