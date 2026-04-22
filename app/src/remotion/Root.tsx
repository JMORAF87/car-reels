import React from 'react';
import { Composition } from 'remotion';
import { CarReel } from './CarReel';
import type { CarReelProps } from './CarReel';
import { MultiCarReel } from './MultiCarReel';
import type { MultiCarReelProps } from './MultiCarReel';

const DEFAULT_CAR_PROPS: CarReelProps = {
  images: [],
  hook: "This deal won't last long!",
  title: '2022 Toyota Camry',
  price: '$24,999',
  cta: 'DM us to schedule a test drive today!',
  hashtags: '#cars #cardealer #toyota #fyp #carsoftiktok',
  dealership: 'Premier Auto',
  features: ['Low Miles', 'Clean Title', 'Financing Available', 'Like New Condition'],
};

const DEFAULT_MULTI_PROPS: MultiCarReelProps = {
  vehicles: [
    {
      images: [],
      hook: "The deal you've been waiting for.",
      title: '2022 Toyota Camry',
      price: '$24,999',
      features: ['Low Miles', 'Clean Title', 'Financing Available', 'Like New'],
    },
  ],
  cta: 'Come see it in person today!',
  hashtags: '#cars #cardealer #fyp #carsoftiktok #dealership',
  dealership: 'Premier Auto',
  theme: {
    primary: '#FFD700',
    secondary: '#1a1a1a',
    accent: '#FFFFFF',
    intensity: 'balanced',
  },
  transitionPackId: 'smooth-zoom',
  visualStyle: {
    hookFontSize: 42,
    titleFontSize: 60,
    priceFontSize: 44,
    featureFontSize: 28,
    gradientStyle: 'cinematic',
    priceStyle: 'badge',
    hookTextStyle: 'caps',
  },
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="CarReel"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={CarReel as any}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_CAR_PROPS}
        calculateMetadata={async ({ props }) => {
          const p = props as unknown as CarReelProps;
          return { durationInFrames: Math.max((p.images || []).length, 1) * 180 + 90 };
        }}
      />
      <Composition
        id="MultiCarReel"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={MultiCarReel as any}
        durationInFrames={600}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_MULTI_PROPS}
        calculateMetadata={async ({ props }) => {
          const p = props as unknown as MultiCarReelProps;
          const vehicleFrames = (p.vehicles || []).reduce(
            (sum, v) => sum + Math.max(v.images.length, 1) * 120,
            0
          );
          return { durationInFrames: vehicleFrames + 100 };
        }}
      />
    </>
  );
};
