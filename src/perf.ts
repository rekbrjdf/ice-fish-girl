export type PerfSnapshot = {
  ready: boolean
  animation: string
  skin: string
  animTime: number
  animDuration: number
  fps: number
  fpsAvg: number
  fpsMin: number
  frameMs: number
  frameMsMax: number
  rtdMs: number
  rtdAvg: number
  rtdMax: number
  jank: number
  frames: number
  renderer: string
  gpu: string
  maxTexture: number
  resolution: number
  dpr: number
  canvasW: number
  canvasH: number
  cssW: number
  cssH: number
  screenW: number
  screenH: number
  cores: number
  deviceMemoryGB: number | null
  heapMB: number | null
  hidden: boolean
  connection: string | null
}

type NavigatorHints = Navigator & {
  deviceMemory?: number
  connection?: { effectiveType?: string }
}

type MemoryHints = Performance & {
  memory?: { usedJSHeapSize: number }
}

export const createPerfSnapshot = (): PerfSnapshot => ({
  ready: false,
  animation: "",
  skin: "",
  animTime: 0,
  animDuration: 0,
  fps: 0,
  fpsAvg: 0,
  fpsMin: 0,
  frameMs: 0,
  frameMsMax: 0,
  rtdMs: 0,
  rtdAvg: 0,
  rtdMax: 0,
  jank: 0,
  frames: 0,
  renderer: "",
  gpu: "",
  maxTexture: 0,
  resolution: 0,
  dpr: 0,
  canvasW: 0,
  canvasH: 0,
  cssW: 0,
  cssH: 0,
  screenW: 0,
  screenH: 0,
  cores: navigator.hardwareConcurrency ?? 0,
  deviceMemoryGB: (navigator as NavigatorHints).deviceMemory ?? null,
  heapMB: null,
  hidden: document.hidden,
  connection: (navigator as NavigatorHints).connection?.effectiveType ?? null,
})

export const readHeapMB = (): number | null => {
  const used = (performance as MemoryHints).memory?.usedJSHeapSize
  return used == null ? null : used / 1048576
}
