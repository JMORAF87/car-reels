import { NextRequest, NextResponse } from 'next/server';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import path from 'path';
import { mkdir } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import type { MultiCarReelProps } from '@/lib/types';
import { uploadRenderedVideo } from '@/lib/storage';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  // ── 1. Verify auth session ────────────────────────────────────────────────
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  // ── 2. Check render permission (skipped in local dev without service key) ─
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let renderQuota: number | null = null; // null = unlimited

  if (supabaseUrl && serviceKey) {
    const admin = createAdminClient(supabaseUrl, serviceKey);
    const { data: access } = await admin
      .from('user_access')
      .select('can_render, render_quota')
      .eq('id', user.id)
      .single();

    if (!access) {
      return NextResponse.json(
        { error: 'Access not approved. Contact support to request access.' },
        { status: 403 }
      );
    }
    if (!access.can_render) {
      return NextResponse.json(
        { error: 'Render access not granted for your account. Contact support.' },
        { status: 403 }
      );
    }
    if (access.render_quota !== null && access.render_quota <= 0) {
      return NextResponse.json(
        { error: 'Render quota exhausted. Contact support to add more.' },
        { status: 403 }
      );
    }
    renderQuota = access.render_quota; // preserve for post-render decrement
  }

  // ── 3. Render ─────────────────────────────────────────────────────────────
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
      // Prevent OOM on Railway's 512 MB limit
      concurrency: 1,
      x264Preset: 'ultrafast',
      // Cap x264 threads — auto-detection picks up Railway's shared CPUs (60+)
      // causing OOM. Insert -threads:v 2 before the output file (always last arg).
      ffmpegOverride: ({ args }) =>
        [...args.slice(0, -1), '-threads:v', '2', args[args.length - 1]],
    });

    const url = await uploadRenderedVideo(outputPath, outputFilename);

    // ── 4. Decrement quota only after a successful render ──────────────────
    if (supabaseUrl && serviceKey && renderQuota !== null) {
      const admin = createAdminClient(supabaseUrl, serviceKey);
      await admin
        .from('user_access')
        .update({ render_quota: renderQuota - 1 })
        .eq('id', user.id);
    }

    return NextResponse.json({ url });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Render failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
