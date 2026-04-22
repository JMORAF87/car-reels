import { NextRequest, NextResponse } from 'next/server';
import { generateCarCopy } from '@/lib/claude';
import type { GenerateRequest } from '@/lib/types';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as GenerateRequest;
    const copy = await generateCarCopy(body);
    return NextResponse.json(copy);
  } catch (err) {
    console.error(err);
    const raw = err instanceof Error ? err.message : 'Generation failed';
    const friendly = raw.includes('credit balance is too low')
      ? 'Your Anthropic API credit balance is too low. Add credits at console.anthropic.com/settings/billing.'
      : raw.includes('Could not resolve authentication')
      ? 'ANTHROPIC_API_KEY is missing or invalid in your .env file.'
      : raw;
    return NextResponse.json({ error: friendly }, { status: 500 });
  }
}
