import React from 'react';
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

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

const SLIDE_DURATION = 180; // 6 seconds at 30fps
const TRANSITION = 20;

const Slide: React.FC<{ src: string; startFrame: number; endFrame: number }> = ({
  src,
  startFrame,
  endFrame,
}) => {
  const frame = useCurrentFrame();
  if (frame < startFrame || frame >= endFrame) return null;

  const local = frame - startFrame;
  const duration = endFrame - startFrame;

  const opacity = interpolate(
    local,
    [0, TRANSITION, duration - TRANSITION, duration],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = interpolate(local, [0, duration], [1.0, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      />
    </AbsoluteFill>
  );
};

export const CarReel: React.FC<CarReelProps> = ({
  images,
  hook,
  title,
  price,
  cta,
  hashtags,
  dealership,
  features,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const numImages = Math.max(images.length, 1);
  const ctaStart = numImages * SLIDE_DURATION;
  const isCtaPhase = frame >= ctaStart;
  const currentSlide = Math.floor(frame / SLIDE_DURATION);
  const slideFrame = frame % SLIDE_DURATION;
  const localFrame = isCtaPhase ? frame - ctaStart : slideFrame;

  const textOpacity = spring({ frame: localFrame, fps, config: { damping: 200 } });
  const textY = interpolate(
    spring({ frame: localFrame, fps, config: { damping: 60 } }),
    [0, 1],
    [40, 0]
  );

  return (
    <AbsoluteFill
      style={{ backgroundColor: '#0a0a0a', fontFamily: 'system-ui, -apple-system, sans-serif' }}
    >
      {/* Image slides */}
      {images.map((src, i) => (
        <Slide
          key={i}
          src={src}
          startFrame={i * SLIDE_DURATION}
          endFrame={(i + 1) * SLIDE_DURATION}
        />
      ))}

      {/* Repeat last image for CTA phase */}
      {isCtaPhase && images.length > 0 && (
        <Slide
          src={images[images.length - 1]}
          startFrame={ctaStart}
          endFrame={durationInFrames}
        />
      )}

      {/* Gradient overlay */}
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 22%, transparent 42%, rgba(0,0,0,0.72) 68%, rgba(0,0,0,0.92) 100%)',
        }}
      />

      {/* Dealership badge — top */}
      <AbsoluteFill style={{ padding: 60, alignItems: 'flex-start', justifyContent: 'flex-start' }}>
        <div
          style={{
            color: 'rgba(255,255,255,0.95)',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: 'uppercase',
            textShadow: '0 2px 8px rgba(0,0,0,0.7)',
          }}
        >
          {dealership}
        </div>
      </AbsoluteFill>

      {/* Bottom text content */}
      <AbsoluteFill
        style={{
          padding: '0 56px 90px',
          justifyContent: 'flex-end',
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
        }}
      >
        {!isCtaPhase ? (
          <>
            {currentSlide === 0 && (
              <div
                style={{
                  color: '#FFD700',
                  fontSize: 34,
                  fontWeight: 800,
                  marginBottom: 14,
                  lineHeight: 1.25,
                  textShadow: '0 2px 12px rgba(0,0,0,0.8)',
                }}
              >
                {hook}
              </div>
            )}

            <div
              style={{
                color: '#ffffff',
                fontSize: 54,
                fontWeight: 900,
                marginBottom: 6,
                lineHeight: 1.0,
                textShadow: '0 3px 16px rgba(0,0,0,0.9)',
              }}
            >
              {title}
            </div>

            <div
              style={{
                color: '#FFD700',
                fontSize: 46,
                fontWeight: 800,
                marginBottom: 22,
                textShadow: '0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              {price}
            </div>

            {currentSlide >= 1 && (
              <div>
                {features.slice(0, 4).map((f, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      color: '#ffffff',
                      fontSize: 28,
                      fontWeight: 600,
                      marginBottom: 10,
                      textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                    }}
                  >
                    <span style={{ color: '#FFD700', fontSize: 18 }}>●</span>
                    {f}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div
              style={{
                color: '#ffffff',
                fontSize: 50,
                fontWeight: 900,
                marginBottom: 24,
                lineHeight: 1.15,
                textShadow: '0 3px 16px rgba(0,0,0,0.9)',
              }}
            >
              {cta}
            </div>
            <div
              style={{
                background: '#FFD700',
                color: '#000000',
                padding: '14px 44px',
                borderRadius: 100,
                fontSize: 26,
                fontWeight: 800,
                display: 'inline-block',
                marginBottom: 28,
                letterSpacing: 1,
              }}
            >
              {dealership}
            </div>
            <div
              style={{
                color: 'rgba(255,255,255,0.6)',
                fontSize: 22,
                fontWeight: 400,
                lineHeight: 1.9,
              }}
            >
              {hashtags}
            </div>
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
