import type { Application } from "pixi.js";

export interface Stats {
  fps: number;
  fpsMin: number;
  fpsMax: number;
  frameMs: number;
  frameMsMax: number;
  cpuMs: number;
  gpuMs: number | null;
  longFrames: number;
  drawCalls: number;
  triangles: number;
  textureBinds: number;
  heapMb: number | null;
  heapLimitMb: number | null;
  renderer: string;
  gpu: string;
  resolution: number;
  canvas: string;
  pixels: number;
  bones: number;
  slots: number;
  attachments: number;
}

export const EMPTY_STATS: Stats = {
  fps: 0,
  fpsMin: 0,
  fpsMax: 0,
  frameMs: 0,
  frameMsMax: 0,
  cpuMs: 0,
  gpuMs: null,
  longFrames: 0,
  drawCalls: 0,
  triangles: 0,
  textureBinds: 0,
  heapMb: null,
  heapLimitMb: null,
  renderer: "-",
  gpu: "-",
  resolution: 1,
  canvas: "-",
  pixels: 0,
  bones: 0,
  slots: 0,
  attachments: 0,
};

type Gl = WebGL2RenderingContext & { __statsPatched?: boolean };

const rendererGl = (app: Application): Gl | null => {
  const gl = (app.renderer as unknown as { gl?: Gl }).gl;
  return gl && typeof gl.drawElements === "function" ? gl : null;
};

const gpuName = (gl: Gl | null): string => {
  if (!gl) return "unknown";
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  const raw = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  return String(raw ?? "unknown");
};

interface Counters {
  drawCalls: number;
  triangles: number;
  textureBinds: number;
}

const patchGl = (gl: Gl, counters: Counters) => {
  if (gl.__statsPatched) return;
  gl.__statsPatched = true;

  const drawElements = gl.drawElements.bind(gl);
  const drawArrays = gl.drawArrays.bind(gl);
  const drawElementsInstanced = gl.drawElementsInstanced?.bind(gl);
  const bindTexture = gl.bindTexture.bind(gl);

  const tris = (mode: number, count: number) => {
    if (mode === gl.TRIANGLES) return count / 3;
    if (mode === gl.TRIANGLE_STRIP || mode === gl.TRIANGLE_FAN) return Math.max(count - 2, 0);
    return 0;
  };

  gl.drawElements = (mode, count, type, offset) => {
    counters.drawCalls++;
    counters.triangles += tris(mode, count);
    drawElements(mode, count, type, offset);
  };
  gl.drawArrays = (mode, first, count) => {
    counters.drawCalls++;
    counters.triangles += tris(mode, count);
    drawArrays(mode, first, count);
  };
  if (drawElementsInstanced) {
    gl.drawElementsInstanced = (mode, count, type, offset, instances) => {
      counters.drawCalls++;
      counters.triangles += tris(mode, count) * instances;
      drawElementsInstanced(mode, count, type, offset, instances);
    };
  }
  gl.bindTexture = (target, texture) => {
    counters.textureBinds++;
    bindTexture(target, texture);
  };
};

const createGpuTimer = (gl: Gl | null) => {
  const ext = gl?.getExtension("EXT_disjoint_timer_query_webgl2") as
    | { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }
    | null;
  if (!gl || !ext) return null;

  const pending: WebGLQuery[] = [];
  let active: WebGLQuery | null = null;
  let last: number | null = null;

  return {
    begin() {
      if (active) return;
      const query = gl.createQuery();
      if (!query) return;
      active = query;
      gl.beginQuery(ext.TIME_ELAPSED_EXT, query);
    },
    end() {
      if (!active) return;
      gl.endQuery(ext.TIME_ELAPSED_EXT);
      pending.push(active);
      active = null;
      while (pending.length) {
        const query = pending[0];
        if (!gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
        pending.shift();
        if (!gl.getParameter(ext.GPU_DISJOINT_EXT)) {
          last = gl.getQueryParameter(query, gl.QUERY_RESULT) / 1e6;
        }
        gl.deleteQuery(query);
      }
    },
    read: () => last,
    destroy() {
      for (const query of pending) gl.deleteQuery(query);
      pending.length = 0;
    },
  };
};

interface Source {
  bones: number;
  slots: number;
  attachments: number;
}

export const attachStats = (
  app: Application,
  source: () => Source,
  onUpdate: (stats: Stats) => void,
  interval = 500,
) => {
  const gl = rendererGl(app);
  const counters: Counters = { drawCalls: 0, triangles: 0, textureBinds: 0 };
  if (gl) patchGl(gl, counters);
  const timer = createGpuTimer(gl);
  const name = gpuName(gl);
  const rendererType = gl ? (gl instanceof WebGL2RenderingContext ? "WebGL2" : "WebGL") : app.renderer.type === 2 ? "WebGPU" : "unknown";

  let frames = 0;
  let cpuTotal = 0;
  let frameTotal = 0;
  let frameMax = 0;
  let fpsMin = Infinity;
  let fpsMax = 0;
  let longFrames = 0;
  let drawCalls = 0;
  let triangles = 0;
  let textureBinds = 0;
  let cpuStart = 0;
  let lastFrame = performance.now();
  let windowStart = lastFrame;

  const before = () => {
    counters.drawCalls = 0;
    counters.triangles = 0;
    counters.textureBinds = 0;
    timer?.begin();
    cpuStart = performance.now();
  };

  const after = () => {
    const now = performance.now();
    timer?.end();
    const delta = now - lastFrame;
    lastFrame = now;

    frames++;
    cpuTotal += now - cpuStart;
    frameTotal += delta;
    frameMax = Math.max(frameMax, delta);
    const fps = 1000 / delta;
    fpsMin = Math.min(fpsMin, fps);
    fpsMax = Math.max(fpsMax, fps);
    if (delta > 33.4) longFrames++;
    drawCalls = counters.drawCalls;
    triangles = counters.triangles;
    textureBinds = counters.textureBinds;

    if (now - windowStart < interval) return;

    const memory = (performance as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
    const { bones, slots, attachments } = source();
    onUpdate({
      fps: frames / ((now - windowStart) / 1000),
      fpsMin: fpsMin === Infinity ? 0 : fpsMin,
      fpsMax,
      frameMs: frameTotal / frames,
      frameMsMax: frameMax,
      cpuMs: cpuTotal / frames,
      gpuMs: timer?.read() ?? null,
      longFrames,
      drawCalls,
      triangles: Math.round(triangles),
      textureBinds,
      heapMb: memory ? memory.usedJSHeapSize / 1048576 : null,
      heapLimitMb: memory ? memory.jsHeapSizeLimit / 1048576 : null,
      renderer: rendererType,
      gpu: name,
      resolution: app.renderer.resolution,
      canvas: `${Math.round(app.screen.width)}x${Math.round(app.screen.height)}`,
      pixels: Math.round(app.screen.width * app.screen.height * app.renderer.resolution ** 2),
      bones,
      slots,
      attachments,
    });

    frames = 0;
    cpuTotal = 0;
    frameTotal = 0;
    frameMax = 0;
    fpsMin = Infinity;
    fpsMax = 0;
    windowStart = now;
  };

  app.ticker.add(before, undefined, 100);
  app.ticker.add(after, undefined, -100);

  return () => {
    app.ticker.remove(before);
    app.ticker.remove(after);
    timer?.destroy();
  };
};
