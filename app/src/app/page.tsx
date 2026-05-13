'use client';

import { useRef, useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type {
  RichGeneratedCopy,
  MultiCarReelProps,
  PresetId,
  GenerateRequest,
} from '@/lib/types';
import { PRESETS, PRESET_ORDER } from '@/lib/presets';
import { CAR_MAKES, CAR_MODELS, CAR_YEARS } from '@/lib/car-data';

// ─── text color palette ───────────────────────────────────────────────────────

const TEXT_COLORS = [
  { hex: '#FFD700', label: 'Gold' },
  { hex: '#FFFFFF', label: 'White' },
  { hex: '#F5C518', label: 'Amber' },
  { hex: '#FFA500', label: 'Orange' },
  { hex: '#F97316', label: 'Bright Orange' },
  { hex: '#FF3B30', label: 'iOS Red' },
  { hex: '#C8102E', label: 'Deep Red' },
  { hex: '#DC2626', label: 'Crimson' },
  { hex: '#FF6B35', label: 'Coral' },
  { hex: '#EC4899', label: 'Pink' },
  { hex: '#A855F7', label: 'Violet' },
  { hex: '#8B5CF6', label: 'Purple' },
  { hex: '#3B82F6', label: 'Sky Blue' },
  { hex: '#2563EB', label: 'Blue' },
  { hex: '#00B4D8', label: 'Cyan' },
  { hex: '#06B6D4', label: 'Teal' },
  { hex: '#10B981', label: 'Emerald' },
  { hex: '#22C55E', label: 'Green' },
  { hex: '#C9A84C', label: 'Luxury Gold' },
  { hex: '#E2B96F', label: 'Champagne' },
  { hex: '#94A3B8', label: 'Silver' },
  { hex: '#F8FAFC', label: 'Ice White' },
];

// ─── style constants ──────────────────────────────────────────────────────────

const field =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-[#26C4A2] transition-colors';

const selectField =
  'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#26C4A2] transition-colors appearance-none cursor-pointer';

const card = 'bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4';

function btn(color: 'gold' | 'zinc' | 'green') {
  const map = {
    gold:  'bg-[#26C4A2] hover:bg-[#1CAF8F] text-white font-bold',
    zinc:  'bg-zinc-700 hover:bg-zinc-600 text-white font-semibold',
    green: 'bg-emerald-500 hover:bg-emerald-400 text-white font-bold',
  };
  return `${map[color]} px-5 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed`;
}

function tabBtn(active: boolean) {
  return `px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
    active
      ? 'bg-[#26C4A2] text-white'
      : 'bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700'
  }`;
}

// ─── vehicle state ────────────────────────────────────────────────────────────

type VehicleCarFields = {
  make: string; model: string; year: string;
  price: string; mileage: string; features: string; notes: string;
};

interface VehicleState {
  car: VehicleCarFields;
  imageFiles: File[];
  imagePreviews: string[];
  uploadedUrls: string[];
  copy: RichGeneratedCopy | null;
}

const emptyVehicle = (): VehicleState => ({
  car: { make: '', model: '', year: '', price: '', mileage: '', features: '', notes: '' },
  imageFiles: [],
  imagePreviews: [],
  uploadedUrls: [],
  copy: null,
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatPrice(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return raw;
  return `$${Number(digits).toLocaleString('en-US')}`;
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Home() {
  const router = useRouter();

  // Clean up any Supabase error hash fragments in the URL (e.g. otp_expired)
  useEffect(() => {
    if (window.location.hash.includes('error=')) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  // Global state
  const [dealership, setDealership]             = useState('');
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId>('clean-dealer');
  const [textColor, setTextColor]               = useState('#FFD700');
  const [ctaNote, setCtaNote]                   = useState('');
  const [salespersonLabel, setSalespersonLabel] = useState('');
  const [location, setLocation]                 = useState('');
  const [dmKeyword, setDmKeyword]               = useState('Interested');

  // Vehicle state
  const [vehicles, setVehicles] = useState<VehicleState[]>([emptyVehicle()]);
  const activeIdx = 0;

  // UI state
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const [isRendering, setIsRendering]     = useState(false);
  const [videoUrl, setVideoUrl]           = useState<string | null>(null);
  const [downloadName, setDownloadName]   = useState('car-reel.mp4');
  const [error, setError]                 = useState<string | null>(null);

  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  // ── vehicle helpers ──────────────────────────────────────────────────────

  const updateVehicle = (idx: number, patch: Partial<VehicleState>) =>
    setVehicles((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));

  const updateCar = (idx: number, patch: Partial<VehicleCarFields>) =>
    setVehicles((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, car: { ...v.car, ...patch } } : v))
    );

  const updateCopy = (idx: number, patch: Partial<RichGeneratedCopy>) =>
    setVehicles((prev) =>
      prev.map((v, i) => (i === idx && v.copy ? { ...v, copy: { ...v.copy, ...patch } } : v))
    );

  // ── image handling ───────────────────────────────────────────────────────

  const handleFiles = (idx: number, files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        setVehicles((prev) =>
          prev.map((v, i) =>
            i === idx
              ? { ...v, imagePreviews: [...v.imagePreviews, e.target?.result as string] }
              : v
          )
        );
      reader.readAsDataURL(f);
    });
    setVehicles((prev) =>
      prev.map((v, i) =>
        i === idx ? { ...v, imageFiles: [...v.imageFiles, ...arr], uploadedUrls: [] } : v
      )
    );
    setVideoUrl(null);
  };

  const removeImage = (vIdx: number, imgIdx: number) =>
    setVehicles((prev) =>
      prev.map((v, i) =>
        i !== vIdx ? v : {
          ...v,
          imageFiles:    v.imageFiles.filter((_, j) => j !== imgIdx),
          imagePreviews: v.imagePreviews.filter((_, j) => j !== imgIdx),
          uploadedUrls:  [],
        }
      )
    );

  // ── generate copy ────────────────────────────────────────────────────────

  const generateCopy = async (idx: number) => {
    const v = vehicles[idx];
    if (!v.car.make || !v.car.model || !v.car.year || !v.car.price) {
      setError(`Vehicle ${idx + 1}: fill in Make, Model, Year, and Price.`);
      return;
    }
    setError(null);
    setGeneratingIdx(idx);
    try {
      const payload: GenerateRequest = {
        ...v.car,
        dealership,
        presetId:         selectedPresetId,
        ctaNote:          ctaNote || undefined,
        salespersonLabel: salespersonLabel || undefined,
        location:         location || undefined,
        dmKeyword:        dmKeyword || undefined,
      };
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? 'Generation failed');
      }
      updateVehicle(idx, { copy: await res.json() as RichGeneratedCopy });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGeneratingIdx(null);
    }
  };

  // ── render ───────────────────────────────────────────────────────────────

  const handleRender = async () => {
    const ready = vehicles.filter((v) => v.copy && v.imageFiles.length > 0);
    if (!ready.length) {
      setError('Generate copy and upload photos for at least one vehicle first.');
      return;
    }
    setError(null);
    setIsRendering(true);
    setVideoUrl(null);

    try {
      const updated = vehicles.map((v) => ({ ...v }));
      for (let i = 0; i < updated.length; i++) {
        const v = updated[i];
        if (!v.copy || !v.imageFiles.length || v.uploadedUrls.length) continue;
        const form = new FormData();
        v.imageFiles.forEach((f) => form.append('images', f));
        const upRes = await fetch('/api/upload', { method: 'POST', body: form });
        if (!upRes.ok) throw new Error(`Image upload failed for vehicle ${i + 1}`);
        updated[i] = { ...v, uploadedUrls: (await upRes.json() as { urls: string[] }).urls };
      }
      setVehicles(updated);

      const withCopy = updated.filter((v) => v.copy && v.uploadedUrls.length > 0);
      const firstCopy = withCopy[0].copy!;
      const preset = PRESETS[selectedPresetId];

      // Build a clean download filename from the first vehicle title
      const firstV = withCopy[0];
      const slug = `${firstV.car.year}-${firstV.car.make}-${firstV.car.model}`
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9-]/g, '')
        .toLowerCase();
      setDownloadName(`${slug}.mp4`);

      const props: MultiCarReelProps = {
        vehicles: withCopy.map((v) => {
          const c = v.copy!;
          const activeFeats = c.features.filter((_, i) => c.activeFeatures[i]);
          return {
            images:   v.uploadedUrls,
            hook:     c.hooks[c.selectedHook] ?? c.hooks[0] ?? '',
            title:    `${v.car.year} ${v.car.make} ${v.car.model}`,
            price:    v.car.price,
            features: activeFeats.length > 0 ? activeFeats : c.features.slice(0, 6),
          };
        }),
        cta:       firstCopy.ctas[firstCopy.selectedCta] ?? firstCopy.ctas[0] ?? '',
        hashtags:  firstCopy.hashtags[firstCopy.hashtagSet],
        dealership: dealership || 'Auto Dealer',
        theme: {
          primary:   textColor,
          secondary: '#0a0a0a',
          accent:    '#FFFFFF',
          intensity: 'balanced',
        },
        transitionPackId: preset.transitionPackId,
        visualStyle: {
          hookFontSize:    preset.hookFontSize,
          titleFontSize:   preset.titleFontSize,
          priceFontSize:   preset.priceFontSize,
          featureFontSize: preset.featureFontSize,
          gradientStyle:   preset.gradientStyle,
          priceStyle:      preset.priceStyle,
          hookTextStyle:   preset.hookTextStyle,
        },
        ctaNote:          ctaNote || undefined,
        salespersonLabel: salespersonLabel || undefined,
        dmKeyword:        dmKeyword || undefined,
      };

      const res = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(props),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null) as { error?: string } | null;
        throw new Error(data?.error ?? 'Render failed');
      }
      setVideoUrl((await res.json() as { url: string }).url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Render failed');
    } finally {
      setIsRendering(false);
    }
  };

  // ── derived ──────────────────────────────────────────────────────────────

  const activeVehicle = vehicles[activeIdx];
  const readyCount    = vehicles.filter((v) => v.copy && v.imageFiles.length > 0).length;
  const models        = CAR_MODELS[activeVehicle.car.make] ?? [];
  const activeCopy    = activeVehicle.copy;

  // ── render UI ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* ── Header ── */}
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/car-reels-logo-transp.png" alt="Car Reels" style={{ height: 156, width: 'auto' }} />
        <div className="text-zinc-500 text-sm flex-1">AI-powered dealership reels for TikTok & Instagram</div>
        <button
          onClick={handleLogout}
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600"
        >
          Sign out
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">

        {/* ── 1. Style Preset ── */}
        <div className={card}>
          <h2 className="text-base font-bold text-[#26C4A2] uppercase tracking-wider">Style Preset</h2>
          <p className="text-zinc-500 text-xs -mt-2">Choose your content style — sets tone, transitions, and typography automatically.</p>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
            {PRESET_ORDER.map((id) => {
              const p = PRESETS[id];
              const isActive = selectedPresetId === id;
              return (
                <button
                  key={id}
                  onClick={() => {
                    setSelectedPresetId(id);
                  }}
                  className={`flex-shrink-0 w-36 text-left px-4 py-3 rounded-xl border transition-all ${
                    isActive
                      ? 'border-[#26C4A2] bg-[#26C4A2]/10'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <div className="text-2xl mb-1.5">{p.emoji}</div>
                  <div className={`text-sm font-bold ${isActive ? 'text-[#26C4A2]' : 'text-white'}`}>{p.name}</div>
                  <div className="text-xs text-zinc-500 mt-0.5 leading-tight">{p.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 2. Dealership + Brand ── */}
        <div className={card}>
          <h2 className="text-base font-bold text-[#26C4A2] uppercase tracking-wider">Dealership & Brand</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Dealership Name</label>
              <input
                className={field}
                placeholder="Best Auto Group"
                value={dealership}
                onChange={(e) => setDealership(e.target.value)}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Salesperson / Contact Label</label>
              <input
                className={field}
                placeholder="Ask for Carlos · (555) 123-4567"
                value={salespersonLabel}
                onChange={(e) => setSalespersonLabel(e.target.value)}
              />
              <p className="text-zinc-600 text-xs mt-1">Shown in the video outro</p>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Location / Zip Code</label>
              <input
                className={field}
                placeholder="Houston, TX 77056"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <p className="text-zinc-600 text-xs mt-1">Used for local hashtags & caption geo-targeting</p>
            </div>
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">DM Auto-Responder Keyword</label>
              <input
                className={field}
                placeholder="Interested"
                value={dmKeyword}
                onChange={(e) => setDmKeyword(e.target.value)}
              />
              <p className="text-zinc-600 text-xs mt-1">Viewers DM this word → your auto-responder fires</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-400 mb-1 block">CTA Extra Note</label>
              <input
                className={field}
                placeholder="Financing available · 0% APR for 60 months"
                value={ctaNote}
                onChange={(e) => setCtaNote(e.target.value)}
              />
              <p className="text-zinc-600 text-xs mt-1">Optional line in the video outro (no links)</p>
            </div>
          </div>

          {/* Text color picker */}
          <div className="pt-2 border-t border-zinc-800">
            <div className="flex items-center gap-3 mb-3">
              <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Text Color</label>
              <div className="flex items-center gap-2 ml-auto">
                <div className="w-6 h-6 rounded border border-zinc-600 flex-shrink-0" style={{ background: textColor }} />
                <input
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-white font-mono text-xs w-24 focus:outline-none focus:border-[#26C4A2]"
                  value={textColor}
                  maxLength={7}
                  onChange={(e) => {
                    const v = e.target.value.trim().replace(/^#?/, '#');
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) setTextColor(v);
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-11 gap-1.5">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.hex}
                  title={c.label}
                  onClick={() => setTextColor(c.hex)}
                  className={`w-full aspect-square rounded-lg border-2 transition-all hover:scale-110 ${
                    textColor === c.hex ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ background: c.hex }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT COLUMN ── */}
          <div className="space-y-4">

            {/* Car details */}
            <div className={card}>
              <h2 className="text-base font-bold text-[#26C4A2] uppercase tracking-wider">
                Vehicle Details
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Year */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Year *</label>
                  <div className="relative">
                    <select
                      className={selectField}
                      value={activeVehicle.car.year}
                      onChange={(e) => updateCar(activeIdx, { year: e.target.value })}
                    >
                      <option value="">Select year</option>
                      {CAR_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">▼</div>
                  </div>
                </div>

                {/* Make */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Make *</label>
                  <div className="relative">
                    <select
                      className={selectField}
                      value={activeVehicle.car.make}
                      onChange={(e) => updateCar(activeIdx, { make: e.target.value, model: '' })}
                    >
                      <option value="">Select make</option>
                      {CAR_MAKES.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-xs">▼</div>
                  </div>
                </div>

                {/* Model */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Model *</label>
                  <input
                    className={field}
                    list={`models-${activeIdx}`}
                    placeholder={activeVehicle.car.make ? 'Select or type model' : 'Select make first'}
                    value={activeVehicle.car.model}
                    onChange={(e) => updateCar(activeIdx, { model: e.target.value })}
                  />
                  <datalist id={`models-${activeIdx}`}>
                    {models.map((m) => <option key={m} value={m} />)}
                  </datalist>
                </div>

                {/* Price */}
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Price *</label>
                  <input
                    className={field}
                    placeholder="$24,999"
                    value={activeVehicle.car.price}
                    onChange={(e) => updateCar(activeIdx, { price: e.target.value })}
                    onBlur={(e) => {
                      const formatted = formatPrice(e.target.value);
                      if (formatted !== e.target.value) updateCar(activeIdx, { price: formatted });
                    }}
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Mileage</label>
                  <input
                    className={field}
                    placeholder="32,000 miles"
                    value={activeVehicle.car.mileage}
                    onChange={(e) => updateCar(activeIdx, { mileage: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Key Features</label>
                  <input
                    className={field}
                    placeholder="Leather seats, sunroof, backup camera, tow package..."
                    value={activeVehicle.car.features}
                    onChange={(e) => updateCar(activeIdx, { features: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-zinc-400 mb-1 block">Extra Notes</label>
                  <textarea
                    className={`${field} resize-none`}
                    rows={2}
                    placeholder="One owner, clean Carfax, financing available..."
                    value={activeVehicle.car.notes}
                    onChange={(e) => updateCar(activeIdx, { notes: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Photo upload */}
            <div className={card}>
              <h2 className="text-base font-bold text-[#26C4A2] uppercase tracking-wider">
                Vehicle Photos
              </h2>
              <div
                className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center cursor-pointer hover:border-[#26C4A2] transition-colors"
                onDrop={(e) => { e.preventDefault(); handleFiles(activeIdx, e.dataTransfer.files); }}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileRefs.current[activeIdx]?.click()}
              >
                <input
                  ref={(el) => { fileRefs.current[activeIdx] = el; }}
                  type="file" accept="image/*" multiple className="hidden"
                  onChange={(e) => handleFiles(activeIdx, e.target.files)}
                />
                <div className="text-4xl mb-2">📷</div>
                <p className="text-zinc-400 text-sm">
                  Drag & drop or <span className="text-[#26C4A2]">click to browse</span>
                </p>
                <p className="text-zinc-600 text-xs mt-1">3–6 photos recommended · Auto-fit to 9:16</p>
              </div>

              {activeVehicle.imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {activeVehicle.imagePreviews.map((src, i) => (
                    <div key={i} className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={src} alt="" className="w-full h-24 object-cover rounded-lg" />
                      <button
                        onClick={() => removeImage(activeIdx, i)}
                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Generate button */}
            <button
              className={`${btn('gold')} w-full py-3 text-base`}
              onClick={() => generateCopy(activeIdx)}
              disabled={generatingIdx !== null}
            >
              {generatingIdx === activeIdx
                ? '✨ Generating copy...'
                : '✨ Generate Copy'}
            </button>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="space-y-5">

            {/* Generated copy panel */}
            {activeCopy ? (
              <div className={card}>
                <h2 className="text-base font-bold text-[#26C4A2] uppercase tracking-wider">
                  Vehicle Copy
                  <span className="text-zinc-500 font-normal normal-case text-xs ml-2">(click to select)</span>
                </h2>

                {/* 5 Hook options */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 block">
                    Hook — slide 1 opener
                  </label>
                  <div className="space-y-2">
                    {activeCopy.hooks.map((hook, i) => (
                      <button
                        key={i}
                        onClick={() => updateCopy(activeIdx, { selectedHook: i })}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                          activeCopy.selectedHook === i
                            ? 'border-[#26C4A2] bg-[#26C4A2]/10 text-white'
                            : 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500 hover:text-white'
                        }`}
                      >
                        <span className="text-xs text-zinc-500 font-mono mr-2">#{i + 1}</span>
                        {hook}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3 CTA options */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2 block">
                    Call to Action — outro
                  </label>
                  <div className="space-y-2">
                    {activeCopy.ctas.map((cta, i) => (
                      <button
                        key={i}
                        onClick={() => updateCopy(activeIdx, { selectedCta: i })}
                        className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                          activeCopy.selectedCta === i
                            ? 'border-[#26C4A2] bg-[#26C4A2]/10 text-white'
                            : 'border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:border-zinc-500 hover:text-white'
                        }`}
                      >
                        <span className="text-xs text-zinc-500 font-mono mr-2">#{i + 1}</span>
                        {cta}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 6 Feature toggles */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1 block">
                    Features
                    <span className="text-zinc-600 font-normal normal-case ml-1">— all checked features rotate through slides</span>
                  </label>
                  <div className="space-y-1.5">
                    {activeCopy.features.map((feat, i) => {
                      const checked = activeCopy.activeFeatures[i];
                      return (
                        <label key={i} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          checked ? 'bg-zinc-800' : 'bg-zinc-900/50'
                        }`}>
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={false}
                            onChange={(e) => {
                              const updated = [...activeCopy.activeFeatures];
                              updated[i] = e.target.checked;
                              updateCopy(activeIdx, { activeFeatures: updated });
                            }}
                            className="accent-[#26C4A2] w-4 h-4"
                          />
                          <input
                            className="bg-transparent text-sm text-white flex-1 focus:outline-none placeholder-zinc-600"
                            value={feat}
                            onChange={(e) => {
                              const updated = [...activeCopy.features];
                              updated[i] = e.target.value;
                              updateCopy(activeIdx, { features: updated });
                            }}
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Caption tabs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Caption</label>
                    <div className="flex gap-1.5">
                      {(['short', 'balanced', 'informative'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => updateCopy(activeIdx, { captionType: type })}
                          className={tabBtn(activeCopy.captionType === type)}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className={`${field} resize-none text-xs`}
                    rows={5}
                    value={activeCopy.captions[activeCopy.captionType]}
                    onChange={(e) =>
                      updateCopy(activeIdx, {
                        captions: { ...activeCopy.captions, [activeCopy.captionType]: e.target.value },
                      })
                    }
                  />
                </div>

                {/* Hashtag tabs */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Hashtags</label>
                    <div className="flex gap-1.5">
                      {(['local', 'niche'] as const).map((set) => (
                        <button
                          key={set}
                          onClick={() => updateCopy(activeIdx, { hashtagSet: set })}
                          className={tabBtn(activeCopy.hashtagSet === set)}
                        >
                          {set.charAt(0).toUpperCase() + set.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <textarea
                    className={`${field} resize-none text-xs`}
                    rows={3}
                    value={activeCopy.hashtags[activeCopy.hashtagSet]}
                    onChange={(e) =>
                      updateCopy(activeIdx, {
                        hashtags: { ...activeCopy.hashtags, [activeCopy.hashtagSet]: e.target.value },
                      })
                    }
                  />
                </div>

                <button
                  className={`${btn('zinc')} w-full`}
                  onClick={() => {
                    const caption = activeCopy.captions[activeCopy.captionType];
                    const tags    = activeCopy.hashtags[activeCopy.hashtagSet];
                    navigator.clipboard.writeText(`${caption}\n\n${tags}`);
                  }}
                >
                  Copy Caption + Hashtags
                </button>
              </div>
            ) : (
              <div className={`${card} flex items-center justify-center min-h-48`}>
                <p className="text-zinc-600 text-sm text-center">
                  Fill in the vehicle details and click<br />
                  <span className="text-[#26C4A2]">Generate Copy</span> to see AI options
                </p>
              </div>
            )}

            {/* Render panel */}
            <div className={card}>
              <h2 className="text-base font-bold text-[#26C4A2] uppercase tracking-wider">Render Video</h2>

              <p className="text-zinc-500 text-xs">
                9:16 MP4 · 1080×1920 · Oswald + Inter · {PRESETS[selectedPresetId].name} preset ·{' '}
                {PRESETS[selectedPresetId].transitionPackId} transitions · 3 images recommended
              </p>

              {!videoUrl ? (
                <button
                  className={`${btn(readyCount > 0 ? 'green' : 'zinc')} w-full py-3 text-base`}
                  onClick={handleRender}
                  disabled={isRendering || readyCount === 0}
                >
                  {isRendering
                    ? '🎬 Rendering… (1–3 min)'
                    : readyCount > 0
                    ? '🎬 Render Reel'
                    : '🎬 Generate copy + upload photos first'}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="bg-emerald-900/30 border border-emerald-700 rounded-lg p-3 text-emerald-400 text-sm text-center">
                    Reel ready! 🎉
                  </div>
                  <a
                    href={videoUrl}
                    download={downloadName}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${btn('gold')} w-full py-3 text-base text-center block`}
                  >
                    Download MP4
                  </a>
                  <button
                    className={`${btn('zinc')} w-full`}
                    onClick={() => {
                      setVideoUrl(null);
                      setDownloadName('car-reel.mp4');
                      setVehicles((p) => p.map((v) => ({ ...v, uploadedUrls: [] })));
                    }}
                  >
                    Render Again
                  </button>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>
        </div>
      </main>

      {isRendering && (
        <div className="fixed bottom-6 right-6 bg-zinc-800 border border-zinc-700 rounded-xl px-5 py-3 flex items-center gap-3 shadow-xl">
          <div className="w-4 h-4 border-2 border-[#26C4A2] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-zinc-300">Rendering your reel… please wait</span>
        </div>
      )}
    </div>
  );
}
