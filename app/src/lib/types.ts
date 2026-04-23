// ─── Preset System ────────────────────────────────────────────────────────────

export type PresetId =
  | 'clean-dealer'
  | 'luxury'
  | 'truck-tough'
  | 'family-suv'
  | 'budget-value'
  | 'performance'
  | 'bilingual-lite';

export type ToneKey =
  | 'friendly'
  | 'confident'
  | 'premium'
  | 'practical'
  | 'urgent-lite'
  | 'bilingual-lite';

export type CtaModeId =
  | 'dm'
  | 'call'
  | 'book-test-drive'
  | 'value-trade'
  | 'ask-financing'
  | 'visit-today';

export type PacingId = 'slow' | 'medium' | 'fast' | 'punchy';
export type GradientStyle = 'cinematic' | 'minimal' | 'luxury' | 'bold';
export type PriceStyleId = 'badge' | 'large-text' | 'pill' | 'outlined';
export type HookTextStyle = 'caps' | 'mixed' | 'sentence';

export interface StylePreset {
  id: PresetId;
  name: string;
  description: string;
  emoji: string;
  tone: ToneKey;
  ctaMode: CtaModeId;
  hookStyle: string;
  transitionPackId: TransitionPackId;
  defaultPaletteId: string;
  pacing: PacingId;
  hookFontSize: number;
  titleFontSize: number;
  priceFontSize: number;
  featureFontSize: number;
  gradientStyle: GradientStyle;
  priceStyle: PriceStyleId;
  hookTextStyle: HookTextStyle;
}

// ─── Brand / Theme ────────────────────────────────────────────────────────────

export type IntensityLevel = 'subtle' | 'balanced' | 'bold';

export interface BrandTheme {
  primary: string;    // hex
  secondary: string;  // hex
  accent: string;     // hex
  intensity: IntensityLevel;
}

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  theme: BrandTheme;
}

// ─── Transitions ─────────────────────────────────────────────────────────────

export type TransitionPackId =
  | 'smooth-zoom'
  | 'swipe-slide'
  | 'flash-cut'
  | 'blur-snap'
  | 'ken-burns-premium'
  | 'fast-punchy'
  | 'minimal-clean';

export type MotionPreset = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'pan-up' | 'pan-down';
export type EasingType = 'spring-soft' | 'spring-stiff' | 'linear' | 'ease-out';

export interface TransitionPack {
  id: TransitionPackId;
  name: string;
  description: string;
  entryFrames: number;
  exitFrames: number;
  flashOpacity: number;
  motionScaleBg: number;
  motionScaleFg: number;
  springDamping: number;
  springStiffness: number;
  motionSequence: MotionPreset[];
  blurOnEntry: boolean;
}

// ─── Vehicle / Car ────────────────────────────────────────────────────────────

export interface CarDetails {
  dealership: string;
  make: string;
  model: string;
  year: string;
  price: string;
  mileage: string;
  features: string;
  notes: string;
}

export interface GenerateRequest extends CarDetails {
  presetId: PresetId;
  ctaNote?: string;
  salespersonLabel?: string;
  location?: string;    // city, zip, or area — drives local hashtags & caption geo-targeting
  dmKeyword?: string;   // auto-responder trigger word (e.g. "Interested")
}

// ─── Rich Copy (multi-variant output from Claude) ─────────────────────────────

export interface RichGeneratedCopy {
  hooks: string[];           // 5 options
  selectedHook: number;
  ctas: string[];            // 3 options
  selectedCta: number;
  features: string[];        // 10 callouts
  activeFeatures: boolean[]; // which features show in video (up to 6 active)
  captions: {
    short: string;
    balanced: string;
    informative: string;
  };
  captionType: 'short' | 'balanced' | 'informative';
  hashtags: {
    local: string;
    niche: string;
  };
  hashtagSet: 'local' | 'niche';
  title: string;
}

export function getSelectedCopy(rich: RichGeneratedCopy) {
  const activeCount = rich.activeFeatures.filter(Boolean).length;
  const features = rich.features.filter((_, i) => rich.activeFeatures[i]);
  const videoFeatures = activeCount > 0 ? features : rich.features.slice(0, 6);
  return {
    hook: rich.hooks[rich.selectedHook] ?? rich.hooks[0] ?? '',
    cta:  rich.ctas[rich.selectedCta]   ?? rich.ctas[0]  ?? '',
    features: videoFeatures,
    caption:  rich.captions[rich.captionType],
    hashtags: rich.hashtags[rich.hashtagSet],
    title:    rich.title,
  };
}

// ─── Remotion Composition ─────────────────────────────────────────────────────

export interface VehicleSection {
  images: string[];
  hook: string;
  title: string;
  price: string;
  features: string[];
}

export interface ReelVisualStyle {
  hookFontSize: number;
  titleFontSize: number;
  priceFontSize: number;
  featureFontSize: number;
  gradientStyle: GradientStyle;
  priceStyle: PriceStyleId;
  hookTextStyle: HookTextStyle;
}

export interface MultiCarReelProps {
  vehicles: VehicleSection[];
  cta: string;
  hashtags: string;
  dealership: string;
  theme: BrandTheme;
  transitionPackId: TransitionPackId;
  visualStyle: ReelVisualStyle;
  ctaNote?: string;
  salespersonLabel?: string;
  dmKeyword?: string;
}

// Legacy single-car (kept for backward compat with CarReel composition)
export interface CarReelProps {
  images: string[];
  hook: string;
  title: string;
  price: string;
  cta: string;
  hashtags: string;
  dealership: string;
  features: string[];
}
