import { NextRequest, NextResponse } from 'next/server';
import { getSettings, updateSettings } from '../../../lib/store';

export async function GET() {
  return NextResponse.json(getSettings());
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confidenceThreshold, mode } = body;
    
    const updated: Record<string, any> = {};
    if (typeof confidenceThreshold === 'number') {
      updated.confidenceThreshold = Math.max(0, Math.min(1, confidenceThreshold));
    }
    if (mode === 'demo' || mode === 'ai') {
      // Only allow AI mode if Groq key is actually set
      const settings = getSettings();
      if (mode === 'ai' && !settings.isGroqConfigured) {
        return NextResponse.json(
          { error: 'Cannot enable AI Mode because GROQ_API_KEY is not configured on the server.' },
          { status: 400 }
        );
      }
      updated.mode = mode;
    }

    const newSettings = updateSettings(updated);
    return NextResponse.json(newSettings);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid settings format' }, { status: 400 });
  }
}
