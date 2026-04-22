import { NextRequest, NextResponse } from 'next/server';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import path from 'path';
import { mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import type { MultiCarReelProps } from '@/lib/types';
import { uploadRenderedVideo } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const props = await req.json() as MultiCarReelProps;

    const port = process.env.PORT || 3000;
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${port}`;

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
    // Use /tmp on cloud (writable on all platforms), public/output locally
    const tmpDir = process.env.SUPABASE_URL ? '/tmp' : path.join(process.cwd(), 'public/output');
    await mkdir(tmpDir, { recursive: true });
    const outputPath = path.join(tmpDir, outputFilename);

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: remotionProps,
      // Prevent OOM on constrained cloud servers (Railway default: 512 MB)
      concurrency: 1,
      x264Preset: 'ultrafast',
    });

    const url = await uploadRenderedVideo(outputPath, outputFilename);

    return NextResponse.json({ url });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Render failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
