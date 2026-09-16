import {
  MixBlend,
  MixDirection,
  Physics,
  Skeleton,
  Spine,
} from "@esotericsoftware/spine-pixi-v8";
import { Application, Assets, UPDATE_PRIORITY, type Ticker } from "pixi.js";
import { useEffect, useRef, type MutableRefObject } from "react";

import { ATLAS, GIRL_ANIMATION, GIRL_SLOTS, RIG_PREFIX, SKELETON } from "./girl";
import { createPerfSnapshot, readHeapMB, type PerfSnapshot } from "./perf";

interface Props {
  statsRef: MutableRefObject<PerfSnapshot>;
  resetRef: MutableRefObject<() => void>;
}

const hideNonGirlSlots = (skeleton: Skeleton) => {
  for (const slot of skeleton.slots) {
    if (!GIRL_SLOTS.has(slot.data.name)) slot.setAttachment(null);
  }
};

const animationBounds = (data: Skeleton["data"], animation: string) => {
  const skeleton = new Skeleton(data);
  const anim = data.findAnimation(animation);
  const sample = (time = 0) => {
    skeleton.setToSetupPose();
    anim?.apply(skeleton, time, time, false, [], 1, MixBlend.setup, MixDirection.mixIn);
    hideNonGirlSlots(skeleton);
    skeleton.updateWorldTransform(Physics.update);
    return skeleton.getBoundsRect();
  };

  if (!anim) return sample();

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const step = 1 / 15;
  for (let t = 0; t <= anim.duration; t += step) {
    const { x, y, width, height } = sample(t);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }
  if (!Number.isFinite(minX)) return { x: 0, y: 0, width: 1, height: 1 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const applyVisibility = (spine: Spine) => {
  for (const slot of spine.skeleton.slots) {
    if (GIRL_SLOTS.has(slot.data.name)) {
      slot.color.a = 1;
      continue;
    }
    const path = (slot.getAttachment() as { path?: string } | null)?.path ?? "";
    slot.color.a = path.startsWith(RIG_PREFIX) ? 1 : 0;
  }
};

const readGpu = (renderer: { name: string; gl?: WebGLRenderingContext }) => {
  const gl = renderer.gl;
  if (!gl) return { gpu: renderer.name, maxTexture: 0 };
  const info = gl.getExtension("WEBGL_debug_renderer_info");
  return {
    gpu: info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : renderer.name,
    maxTexture: Number(gl.getParameter(gl.MAX_TEXTURE_SIZE)) || 0,
  };
};

export const GirlStage = ({ statsRef, resetRef }: Props) => {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current!;
    const app = new Application();
    const stats = statsRef.current;
    let disposed = false;
    let spine: Spine | null = null;
    let onResize: (() => void) | undefined;
    let workStart = 0;
    let fpsSum = 0;
    let rtdSum = 0;
    let samples = 0;
    let fpsMin = Infinity;
    let frameMsMax = 0;
    let rtdMax = 0;
    let jank = 0;

    const resetStats = () => {
      fpsSum = 0;
      rtdSum = 0;
      samples = 0;
      fpsMin = Infinity;
      frameMsMax = 0;
      rtdMax = 0;
      jank = 0;
      Object.assign(stats, createPerfSnapshot(), {
        ready: stats.ready,
        animation: stats.animation,
        skin: stats.skin,
        renderer: stats.renderer,
        gpu: stats.gpu,
        maxTexture: stats.maxTexture,
        resolution: stats.resolution,
        dpr: stats.dpr,
      });
    };
    resetRef.current = resetStats;

    const markRenderStart = () => {
      workStart = performance.now();
    };

    const samplePerf = (ticker: Ticker) => {
      const fps = ticker.FPS;
      const frameMs = ticker.elapsedMS;
      const rtdMs = performance.now() - workStart;
      const entry = spine?.state.getCurrent(0);

      samples += 1;
      fpsSum += fps;
      rtdSum += rtdMs;
      if (samples > 30) fpsMin = Math.min(fpsMin, fps);
      frameMsMax = Math.max(frameMsMax, frameMs);
      rtdMax = Math.max(rtdMax, rtdMs);
      if (frameMs > 33.34) jank += 1;

      stats.ready = true;
      stats.fps = fps;
      stats.fpsAvg = fpsSum / samples;
      stats.fpsMin = Number.isFinite(fpsMin) ? fpsMin : fps;
      stats.frameMs = frameMs;
      stats.frameMsMax = frameMsMax;
      stats.rtdMs = rtdMs;
      stats.rtdAvg = rtdSum / samples;
      stats.rtdMax = rtdMax;
      stats.jank = jank;
      stats.frames = samples;
      stats.animTime = entry?.trackTime ?? 0;
      stats.animDuration = entry?.animation?.duration ?? 0;
      stats.resolution = app.renderer.resolution;
      stats.dpr = window.devicePixelRatio;
      stats.canvasW = Math.round(app.canvas.width);
      stats.canvasH = Math.round(app.canvas.height);
      stats.cssW = Math.round(app.screen.width);
      stats.cssH = Math.round(app.screen.height);
      stats.screenW = window.screen.width;
      stats.screenH = window.screen.height;
      stats.heapMB = readHeapMB();
      stats.hidden = document.hidden;
    };

    void (async () => {
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        preference: "webgl",
        sharedTicker: true,
      });
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      host.appendChild(app.canvas);

      await Assets.load([
        { alias: "girl-skeleton", src: SKELETON },
        { alias: "girl-atlas", src: ATLAS },
      ]);
      if (disposed) return;

      spine = Spine.from({
        skeleton: "girl-skeleton",
        atlas: "girl-atlas",
        ticker: app.ticker,
      });
      spine.state.data.defaultMix = 0.15;
      spine.skeleton.setToSetupPose();
      spine.beforeUpdateWorldTransforms = () => applyVisibility(spine!);
      app.stage.addChild(spine);

      const skins = spine.skeleton.data.skins.map((item) => item.name);
      const skin = skins.find((name) => name !== "default") ?? skins[0] ?? "";
      if (skin) {
        spine.skeleton.setSkinByName(skin);
        spine.skeleton.setSlotsToSetupPose();
      }

      const gpu = readGpu(app.renderer as { name: string; gl?: WebGLRenderingContext });
      stats.animation = GIRL_ANIMATION;
      stats.skin = skin;
      stats.renderer = app.renderer.name;
      stats.gpu = gpu.gpu;
      stats.maxTexture = gpu.maxTexture;

      const bounds = animationBounds(spine.skeleton.data, GIRL_ANIMATION);
      spine.pivot.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);

      onResize = () => {
        const { width, height } = app.screen;
        spine!.scale.set(Math.min(width / bounds.width, height / bounds.height) * 0.9);
        spine!.position.set(width / 2, height / 2);
      };
      onResize();
      app.renderer.on("resize", onResize);

      app.ticker.add(markRenderStart, undefined, UPDATE_PRIORITY.HIGH);
      app.ticker.add(samplePerf, undefined, UPDATE_PRIORITY.UTILITY);

      spine.state.setAnimation(0, GIRL_ANIMATION, true);
    })().catch((error) => console.error("GirlStage init failed", error));

    return () => {
      disposed = true;
      resetRef.current = () => {};
      if (!app.renderer) return;
      app.ticker.remove(markRenderStart);
      app.ticker.remove(samplePerf);
      if (onResize) app.renderer.off("resize", onResize);
      app.destroy(true, { children: true });
    };
  }, [resetRef, statsRef]);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
};
