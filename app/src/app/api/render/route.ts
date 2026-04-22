import { NextRequest, NextResponse } from 'next/server';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { MultiCarReelProps } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const props = await req.json() as MultiCarReelProps;

    const port = process.env.PORT || 3000;
    const baseUrl = `http://localhost:${port}`;

    const inputProps: MultiCarReelProps = {
      ...props,
      vehicles: props.vehicles.map((v) => ({
        ...v,
        images: v.images.map((url) =>
          url.startsWith('http') ? url : `${baseUrl}${url}`
        ),
      })),
    };

    const bundleLocation = await bundle({
      entryPoint: path.join(process.cwd(), 'src/remotion/index.ts'),
      webpackOverride: (config) => config,
    });

    // Remotion's API requires Record<string, unknown> — cast needed
    const remotionProps = inputProps as unknown as Record<string, unknown>;

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'MultiCarReel',
      inputProps: remotionProps,
    });

    const outputFilename = `reel-${uuidv4()}.mp4`;
    const outputPath = path.join(process.cwd(), 'public/output', outputFilename);

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: remotionProps,
    });

    return NextResponse.json({ url: `/output/${outputFilename}` });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Render failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
