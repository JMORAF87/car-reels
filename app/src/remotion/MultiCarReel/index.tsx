import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont as loadOswald } from '@remotion/google-fonts/Oswald';
import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import type {
  MultiCarReelProps,
  MotionPreset,
  GradientStyle,
  PriceStyleId,
  HookTextStyle,
} from '@/lib/types';
import { TRANSITION_PACKS } from '../transitions';
import { getTextOnColor, intensityOpacity } from '../../lib/branding';

export type { MultiCarReelProps };

const { fontFamily: oswald } = loadOswald('normal', { weights: ['600', '700'] });
const { fontFamily: inter } = loadInter('normal', { weights: ['500', '600', '700'] });

const SLIDE_FRAMES = 120; // 4 s per photo
const CTA_FRAMES   = 100; // ~3.3 s outro

// ─── motion helpers ───────────────────────────────────────────────────────────

function bgMotion(m: MotionPreset, p: number, scale: number): React.CSSProperties {
  switch (m) {
    case 'zoom-in':   return { transform: `scale(${1 + scale * p})` };
    case 'zoom-out':  return { transform: `scale(${1 + scale * (1 - p)})` };
    case 'pan-left':  return { transform: `scale(${1 + scale * 0.5}) translateX(${-6 * p}%)` };
    case 'pan-right': return { transform: `scale(${1 + scale * 0.5}) translateX(${-6 + 6 * p}%)` };
    case 'pan-up':    return { transform: `scale(${1 + scale * 0.5}) translateY(${-5 * p}%)` };
    case 'pan-down':  return { transform: `scale(${1 + scale * 0.5}) translateY(${5 - 5 * p}%)` };
  }
}

function fgMotion(m: MotionPreset, p: number, scale: number): React.CSSProperties {
  switch (m) {
    case 'zoom-in':  return { transform: `scale(${1 + scale * p})` };
    case 'zoom-out': return { transform: `scale(${1 + scale * (1 - p)})` };
    default:         return { transform: `scale(${1 + scale * 0.5 * p})` };
  }
}

function gradientOverlay(style: GradientStyle, isCta: boolean): string {
  if (isCta) return 'linear-gradient(180deg,rgba(0,0,0,.18) 0%,rgba(0,0,0,.08) 28%,rgba(0,0,0,.28) 58%,rgba(0,0,0,.72) 100%)';
  switch (style) {
    case 'cinematic': return 'linear-gradient(180deg,rgba(0,0,0,.10) 0%,transparent 20%,transparent 45%,rgba(0,0,0,.22) 65%,rgba(0,0,0,.60) 100%)';
    case 'minimal':   return 'linear-gradient(180deg,rgba(0,0,0,.05) 0%,transparent 25%,transparent 65%,rgba(0,0,0,.48) 100%)';
    case 'luxury':    return 'linear-gradient(180deg,rgba(0,0,0,.10) 0%,transparent 18%,transparent 52%,rgba(0,0,0,.30) 72%,rgba(0,0,0,.65) 100%)';
    case 'bold':      return 'linear-gradient(180deg,rgba(0,0,0,.18) 0%,transparent 18%,transparent 35%,rgba(0,0,0,.38) 58%,rgba(0,0,0,.72) 100%)';
  }
}

function hookTextStyle(style: HookTextStyle): React.CSSProperties {
  if (style === 'caps')    return { textTransform: 'uppercase', letterSpacing: 1.5 };
  if (style === 'mixed')   return { letterSpacing: 0.5 };
  return {}; // sentence — no transform
}

function priceBadgeStyle(
  style: PriceStyleId,
  primary: string,
  priceFontSize: number,
): React.CSSProperties {
  const textColor = getTextOnColor(primary);
  const base: React.CSSProperties = {
    fontFamily: oswald,
    display: 'inline-block',
    fontSize: priceFontSize,
    fontWeight: 700,
    letterSpacing: 1,
  };
  switch (style) {
    case 'badge':
      return { ...base, background: primary, color: textColor, padding: '5px 26px 7px', borderRadius: 8, boxShadow: `0 6px 24px ${primary}55` };
    case 'pill':
      return { ...base, background: primary, color: textColor, padding: '6px 32px 8px', borderRadius: 100, boxShadow: `0 6px 24px ${primary}55` };
    case 'large-text':
      return { ...base, color: primary, fontSize: priceFontSize * 1.2, textShadow: '0 3px 16px rgba(0,0,0,.99)' };
    case 'outlined':
      return { ...base, color: primary, padding: '5px 22px 7px', borderRadius: 8, border: `3px solid ${primary}` };
  }
}

function formatPrice(raw: string): string {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return raw;
  return `$${Number(digits).toLocaleString('en-US')}`;
}

// ─── layout ───────────────────────────────────────────────────────────────────

type SlideLayout = { start: number; duration: number };

function computeLayout(vehicles: MultiCarReelProps['vehicles']): SlideLayout[] {
  let offset = 0;
  return vehicles.map((v) => {
    const n = Math.max(v.images.length, 1);
    const layout: SlideLayout = { start: offset, duration: n * SLIDE_FRAMES };
    offset += layout.duration;
    return layout;
  });
}

// ─── single photo slide ───────────────────────────────────────────────────────

const PhotoSlide: React.FC<{
  src: string;
  startFrame: number;
  endFrame: number;
  motionPreset: MotionPreset;
  entryFrames: number;
  exitFrames: number;
  motionScaleBg: number;
  motionScaleFg: number;
  blurOnEntry: boolean;
  springDamping: number;
  springStiffness: number;
}> = ({
  src, startFrame, endFrame, motionPreset,
  entryFrames, exitFrames,
  motionScaleBg, motionScaleFg,
  blurOnEntry, springDamping, springStiffness,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame >= endFrame) return null;

  const local    = frame - startFrame;
  const dur      = endFrame - startFrame;
  const progress = local / dur;

  const entrySpring = spring({
    frame: local,
    fps: 30,
    config: { damping: springDamping, stiffness: springStiffness, mass: 0.5 },
    durationInFrames: entryFrames,
  });
  const entryScale   = interpolate(entrySpring, [0, 1], [1.08, 1.0]);
  const exitOpacity  = interpolate(local, [dur - exitFrames, dur], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const entryOpacity = interpolate(local, [0, entryFrames * 0.6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity      = Math.min(entryOpacity, exitOpacity);

  const blurPx = blurOnEntry
    ? interpolate(local, [0, entryFrames], [14, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0;

  return (
    <AbsoluteFill style={{ opacity, transform: `scale(${entryScale})`, overflow: 'hidden' }}>
      {/* Blurred bg fill — prevents letterboxing */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
        <Img
          src={src}
          style={{
            position: 'absolute',
            top: '-8%', left: '-8%',
            width: '116%', height: '116%',
            objectFit: 'cover',
            objectPosition: 'center',
            filter: 'blur(28px) brightness(0.88) saturate(1.2)',
            ...bgMotion(motionPreset, progress, motionScaleBg),
          }}
        />
      </div>

      {/* Foreground car image — never cropped */}
      <AbsoluteFill>
        <Img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            objectPosition: 'center',
            filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
            ...fgMotion(motionPreset, progress, motionScaleFg),
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── main composition ─────────────────────────────────────────────────────────

export const MultiCarReel: React.FC<MultiCarReelProps> = ({
  vehicles, cta, dealership,
  theme, transitionPackId, visualStyle,
  ctaNote, salespersonLabel, dmKeyword,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const pack          = TRANSITION_PACKS[transitionPackId];
  const primary       = theme.primary;
  const textOnPrimary = getTextOnColor(primary);
  const opacityMod    = intensityOpacity(theme.intensity);

  const layout   = computeLayout(vehicles);
  const ctaStart = durationInFrames - CTA_FRAMES;
  const isCta    = frame >= ctaStart;

  // Salesperson name in CTA text? Don't repeat it in the top strip.
  const ctaHasSalesperson = salespersonLabel
    ? cta.toLowerCase().includes(salespersonLabel.split(' ')[0].toLowerCase())
    : false;

  // Determine current vehicle and slide
  let currentVehicleIdx = vehicles.length - 1;
  let localFrame = frame;
  for (let i = 0; i < layout.length; i++) {
    if (frame >= layout[i].start && frame < layout[i].start + layout[i].duration) {
      currentVehicleIdx = i;
      localFrame = frame - layout[i].start;
      break;
    }
  }
  const vehicle      = vehicles[currentVehicleIdx];
  const currentSlide = Math.floor(localFrame / SLIDE_FRAMES);
  const animFrame    = isCta ? frame - ctaStart : localFrame % SLIDE_FRAMES;

  // Flash cut boundaries
  const flashBoundaries: number[] = [];
  vehicles.forEach((v, vi) => {
    const n = Math.max(v.images.length, 1);
    for (let si = 0; si < n; si++) {
      if (vi > 0 || si > 0) flashBoundaries.push(layout[vi].start + si * SLIDE_FRAMES);
    }
  });

  let flashOpacity = 0;
  const flashDur = pack.entryFrames;
  for (const boundary of flashBoundaries) {
    if (frame >= boundary && frame < boundary + flashDur) {
      flashOpacity = interpolate(
        frame - boundary,
        [0, 2, flashDur],
        [0, pack.flashOpacity, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
      );
      break;
    }
  }

  // Text entry animation
  const textOpacity = spring({ frame: animFrame, fps, config: { damping: 200 } });
  const textY = interpolate(spring({ frame: animFrame, fps, config: { damping: 55 } }), [0, 1], [50, 0]);

  // Global slide index for motion variety across vehicles
  let globalSlideIndex = currentSlide;
  for (let i = 0; i < currentVehicleIdx; i++) globalSlideIndex += Math.max(vehicles[i].images.length, 1);

  const lastV       = vehicles[vehicles.length - 1];
  const ctaBgImg    = lastV?.images[0];
  const ctaSlideIdx = vehicles.reduce((sum, v) => sum + Math.max(v.images.length, 1), 0);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.secondary || '#0a0a0a', fontFamily: inter }}>

      {/* All photo slides */}
      {vehicles.map((v, vi) =>
        v.images.map((src, si) => {
          const gsi = vehicles.slice(0, vi).reduce((sum, vv) => sum + Math.max(vv.images.length, 1), 0) + si;
          return (
            <PhotoSlide
              key={`${vi}-${si}`}
              src={src}
              startFrame={layout[vi].start + si * SLIDE_FRAMES}
              endFrame={layout[vi].start + (si + 1) * SLIDE_FRAMES}
              motionPreset={pack.motionSequence[gsi % pack.motionSequence.length]}
              entryFrames={pack.entryFrames}
              exitFrames={pack.exitFrames}
              motionScaleBg={pack.motionScaleBg}
              motionScaleFg={pack.motionScaleFg}
              blurOnEntry={pack.blurOnEntry}
              springDamping={pack.springDamping}
              springStiffness={pack.springStiffness}
            />
          );
        })
      )}

      {/* CTA slide background */}
      {isCta && ctaBgImg && (
        <PhotoSlide
          src={ctaBgImg}
          startFrame={ctaStart}
          endFrame={durationInFrames}
          motionPreset={pack.motionSequence[ctaSlideIdx % pack.motionSequence.length]}
          entryFrames={pack.entryFrames}
          exitFrames={pack.exitFrames}
          motionScaleBg={pack.motionScaleBg}
          motionScaleFg={pack.motionScaleFg}
          blurOnEntry={false}
          springDamping={pack.springDamping}
          springStiffness={pack.springStiffness}
        />
      )}

      {/* Flash at cuts */}
      {flashOpacity > 0 && (
        <AbsoluteFill style={{ backgroundColor: '#fff', opacity: flashOpacity }} />
      )}

      {/* Gradient overlay */}
      <AbsoluteFill
        style={{
          background: gradientOverlay(visualStyle.gradientStyle, isCta),
          pointerEvents: 'none',
        }}
      />

      {/* Dealership name — top left (car slides only) */}
      {!isCta && (
        <AbsoluteFill style={{ padding: '56px 52px', alignItems: 'flex-start', justifyContent: 'flex-start' }}>
          <div style={{
            fontFamily: oswald,
            color: '#fff',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: 'uppercase',
            textShadow: '0 2px 12px rgba(0,0,0,0.9)',
          }}>
            {dealership}
          </div>
        </AbsoluteFill>
      )}

      {/* CTA slide — top strip: salesperson (if not already in CTA) + dealership */}
      {isCta && (
        <AbsoluteFill style={{
          padding: '64px 52px',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          flexDirection: 'column',
          gap: 10,
          opacity: textOpacity,
        }}>
          {salespersonLabel && !ctaHasSalesperson && (
            <div style={{
              fontFamily: oswald,
              color: primary,
              fontSize: 42,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: 'uppercase',
              textShadow: '0 3px 18px rgba(0,0,0,0.99)',
              opacity: opacityMod,
            }}>
              {salespersonLabel}
            </div>
          )}
          <div style={{
            fontFamily: oswald,
            display: 'inline-block',
            background: 'rgba(255,255,255,0.12)',
            color: '#fff',
            padding: '6px 22px',
            borderRadius: 100,
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: 3,
            textTransform: 'uppercase',
            border: '1px solid rgba(255,255,255,0.22)',
            textShadow: '0 2px 10px rgba(0,0,0,0.9)',
          }}>
            {dealership}
          </div>
        </AbsoluteFill>
      )}

      {/* Vehicle counter — top right */}
      {vehicles.length > 1 && !isCta && (
        <AbsoluteFill style={{ padding: '56px 52px', alignItems: 'flex-start', justifyContent: 'flex-end' }}>
          <div style={{
            fontFamily: oswald,
            background: primary,
            color: textOnPrimary,
            fontSize: 22,
            fontWeight: 700,
            padding: '7px 20px',
            borderRadius: 100,
            letterSpacing: 1,
            opacity: opacityMod,
          }}>
            {currentVehicleIdx + 1} / {vehicles.length}
          </div>
        </AbsoluteFill>
      )}

      {/* Progress dots */}
      {!isCta && vehicle && vehicle.images.length > 1 && (
        <AbsoluteFill style={{ alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 36 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {vehicle.images.map((_, i) => (
              <div
                key={i}
                style={{
                  width: i === currentSlide ? 28 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: i === currentSlide ? primary : 'rgba(255,255,255,0.35)',
                  opacity: i === currentSlide ? opacityMod : 1,
                }}
              />
            ))}
          </div>
        </AbsoluteFill>
      )}

      {/* Bottom text overlay */}
      <AbsoluteFill
        style={{
          padding: '0 52px 260px',
          justifyContent: 'flex-end',
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        {!isCta ? (
          <div>
            {/* Hook — slide 0 only */}
            {currentSlide === 0 && (
              <div style={{
                fontFamily: oswald,
                color: primary,
                fontSize: visualStyle.hookFontSize,
                fontWeight: 700,
                marginBottom: 10,
                lineHeight: 1.1,
                textShadow: '0 3px 16px rgba(0,0,0,0.95)',
                opacity: opacityMod,
                ...hookTextStyle(visualStyle.hookTextStyle),
              }}>
                {vehicle?.hook}
              </div>
            )}

            {/* Vehicle title */}
            <div style={{
              fontFamily: oswald,
              color: '#fff',
              fontSize: visualStyle.titleFontSize,
              fontWeight: 700,
              lineHeight: 1.0,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              textShadow: '0 3px 20px rgba(0,0,0,0.99)',
              marginBottom: 6,
            }}>
              {vehicle?.title}
            </div>

            {/* Price */}
            <div style={{ marginBottom: 16 }}>
              <span style={priceBadgeStyle(visualStyle.priceStyle, primary, visualStyle.priceFontSize)}>
                {formatPrice(vehicle?.price ?? '')}
              </span>
            </div>

            {/* Features — 2 per slide, cycling so each slide feels different */}
            {currentSlide >= 1 && (() => {
              const feats = vehicle?.features ?? [];
              const perSlide = 2;
              const offset = (currentSlide - 1) * perSlide;
              const shown = [feats[offset], feats[offset + 1]].filter(Boolean);
              return (
                <div>
                  {shown.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: primary,
                        flexShrink: 0,
                        boxShadow: `0 0 12px ${primary}CC`,
                        opacity: opacityMod,
                      }} />
                      <span style={{
                        fontFamily: inter,
                        color: '#fff',
                        fontSize: visualStyle.featureFontSize,
                        fontWeight: 600,
                        textShadow: '0 2px 10px rgba(0,0,0,0.95)',
                        letterSpacing: 0.2,
                      }}>
                        {f}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        ) : (
          /* CTA / outro slide — bottom section */
          <div style={{ textAlign: 'center', width: '100%' }}>

            {/* CTA text — biggest element */}
            <div style={{
              fontFamily: oswald,
              color: '#fff',
              fontSize: 62,
              fontWeight: 700,
              lineHeight: 1.1,
              textTransform: 'uppercase',
              letterSpacing: 1,
              marginBottom: 24,
              textShadow: '0 4px 24px rgba(0,0,0,0.99)',
            }}>
              {cta}
            </div>

            {/* DM keyword — large pill */}
            {dmKeyword && (
              <div style={{ marginBottom: 22 }}>
                <span style={{
                  fontFamily: oswald,
                  display: 'inline-block',
                  background: primary,
                  color: textOnPrimary,
                  fontSize: 44,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  padding: '13px 44px',
                  borderRadius: 100,
                  boxShadow: `0 6px 32px ${primary}77`,
                  opacity: opacityMod,
                }}>
                  DM &ldquo;{dmKeyword}&rdquo;
                </span>
              </div>
            )}

            {/* CTA note — bigger and fully legible */}
            {ctaNote && (
              <div style={{
                fontFamily: inter,
                color: 'rgba(255,255,255,0.92)',
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1.4,
                letterSpacing: 0.3,
                textShadow: '0 2px 12px rgba(0,0,0,0.95)',
              }}>
                {ctaNote}
              </div>
            )}
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
