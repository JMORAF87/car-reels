import Anthropic from '@anthropic-ai/sdk';
import type { GenerateRequest, RichGeneratedCopy } from './types';
import { PRESETS } from './presets';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CTA_MODE_COPY: Record<string, string> = {
  'dm':              'Encourage viewers to DM the dealership directly on Instagram or TikTok.',
  'call':            'Encourage viewers to call the dealership now.',
  'book-test-drive': 'Encourage viewers to book a test drive or schedule an appointment.',
  'value-trade':     'Encourage viewers to get their trade-in valued — no pressure pitch.',
  'ask-financing':   'Encourage viewers to ask about financing options — make it feel accessible.',
  'visit-today':     'Encourage viewers to come visit the dealership today.',
};

function formatPriceForPrompt(price: string): string {
  const digits = price.replace(/[^0-9]/g, '');
  if (!digits) return price;
  return `$${Number(digits).toLocaleString('en-US')}`;
}

export async function generateCarCopy(req: GenerateRequest): Promise<RichGeneratedCopy> {
  const preset = PRESETS[req.presetId];
  const formattedPrice = formatPriceForPrompt(req.price);
  const location = req.location?.trim() || '';
  const salesperson = req.salespersonLabel?.trim() || '';

  const prompt = `You are an expert social media strategist for car dealerships creating high-converting content for Instagram Reels and TikTok.

STYLE PRESET: ${preset.name} — ${preset.description}
HOOK WRITING GUIDE: ${preset.hookStyle}
TONE: ${preset.tone}
CTA DIRECTION: ${CTA_MODE_COPY[preset.ctaMode]}
${req.ctaNote ? `CTA EXTRA NOTE (include naturally): ${req.ctaNote}` : ''}
${salesperson ? `SALESPERSON: ${salesperson}` : ''}
${location ? `LOCATION: ${location} — use this city/area/zip in captions and local hashtags. Reference it naturally.` : ''}

Vehicle listing:
- Dealership: ${req.dealership || 'the dealership'}
- Vehicle: ${req.year} ${req.make} ${req.model}
- Price: ${formattedPrice}
- Mileage: ${req.mileage || 'not specified'}
- Key Features: ${req.features || 'not specified'}
- Additional Notes: ${req.notes || 'none'}

RULES — follow strictly:
- Price must always appear as ${formattedPrice} (dollar sign + comma-formatted)
- Hooks: 6–10 words max; scroll-stopping; match the hook writing guide; NO fake urgency ("hurry!", "act now", "limited time"), NO fabricated claims
- Features: max 5 words each; factual; based only on vehicle details provided
- CTAs: natural, conversational, 8–14 words max; no all-caps shouting; NO zip codes or street addresses in CTAs; focus on actions like scheduling, visiting, calling, or financing — NOT on DM keywords (those are handled separately)
- Captions: professional; lead with the hook; no excessive emojis; no ALL CAPS sentences; match tone${location ? `; weave in the ${location} location naturally` : ''}${salesperson ? `; mention ${salesperson} by name at least once` : ''}
- LOCAL hashtags: must be geo-targeted to ${location || 'the dealership area'} — include city name, zip code if known, nearby cities, region-specific tags plus vehicle tags
- NICHE hashtags: target vehicle enthusiasts, brand fans, and niche communities

Return ONLY valid JSON with exactly these keys:
{
  "hooks": ["hook 1", "hook 2", "hook 3", "hook 4", "hook 5"],
  "ctas": ["cta 1", "cta 2", "cta 3"],
  "features": ["feature 1", "feature 2", "feature 3", "feature 4", "feature 5", "feature 6", "feature 7", "feature 8", "feature 9", "feature 10"],
  "captions": {
    "short": "hook sentence + 1 supporting sentence + CTA sentence (NO hashtags — they are separate)",
    "balanced": "hook sentence + 2–3 engaging sentences about the vehicle + CTA sentence (NO hashtags — they are separate)",
    "informative": "hook sentence + 4–5 sentences covering vehicle details, features, value, CTA (NO hashtags — they are separate)"
  },
  "hashtags": {
    "local": "5 geo-targeted hashtags for ${location || 'the local area'} — EVERY tag must start with # (space-separated)",
    "niche": "5 hashtags targeting vehicle enthusiasts, brand fans, and niche communities — EVERY tag must start with # (space-separated)"
  },
  "title": "SEO video title max 80 chars"
}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return valid JSON');

  const raw = JSON.parse(jsonMatch[0]) as {
    hooks?: string[];
    ctas?: string[];
    features?: string[];
    captions?: { short?: string; balanced?: string; informative?: string };
    hashtags?: { local?: string; niche?: string };
    title?: string;
  };

  const features = raw.features ?? [];

  function normalizeHashtags(raw: string): string {
    return (raw ?? '').split(/\s+/).filter(Boolean).map((tag) =>
      tag.startsWith('#') ? tag : `#${tag}`
    ).join(' ');
  }

  return {
    hooks:         raw.hooks ?? [],
    selectedHook:  0,
    ctas:          raw.ctas ?? [],
    selectedCta:   0,
    features,
    activeFeatures: features.map((_, i) => i < 6),
    captions: {
      short:       raw.captions?.short ?? '',
      balanced:    raw.captions?.balanced ?? '',
      informative: raw.captions?.informative ?? '',
    },
    captionType: 'balanced',
    hashtags: {
      local: normalizeHashtags(raw.hashtags?.local ?? ''),
      niche: normalizeHashtags(raw.hashtags?.niche ?? ''),
    },
    hashtagSet: 'local',
    title: raw.title ?? '',
  };
}
