import { useEffect, useState, type CSSProperties, type MutableRefObject } from "react"

import { type PerfSnapshot } from "./perf"

const panel: CSSProperties = {
  position: "absolute",
  top: "max(8px, env(safe-area-inset-top))",
  left: "max(8px, env(safe-area-inset-left))",
  zIndex: 10,
  width: 292,
  maxWidth: "calc(100vw - 16px)",
  maxHeight: "calc(100dvh - 16px)",
  overflow: "auto",
  padding: "10px 12px",
  background: "rgba(6, 12, 22, 0.78)",
  color: "#d7e2f2",
  font: "11px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  backdropFilter: "blur(8px)",
  userSelect: "none",
}

const head: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
  color: "#fff",
  fontWeight: 700,
  letterSpacing: 0.4,
}

const section: CSSProperties = {
  marginTop: 8,
  paddingTop: 8,
  borderTop: "1px solid rgba(255,255,255,0.1)",
}

const title: CSSProperties = {
  color: "#8fa3bf",
  fontSize: 10,
  letterSpacing: 0.8,
  textTransform: "uppercase",
  marginBottom: 4,
}

const row: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 8,
}

const muted: CSSProperties = { color: "#8fa3bf" }

const resetBtn: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  borderRadius: 4,
  padding: "2px 8px",
  font: "inherit",
}

const fmt = (value: number, digits = 1) => (Number.isFinite(value) ? value.toFixed(digits) : "—")

const tone = (ok: boolean, warn: boolean) => (ok ? "#6ee7a8" : warn ? "#fbbf24" : "#fb7185")

const Row = ({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) => (
  <div style={row}>
    <span style={muted}>{label}</span>
    <span style={{ color: color ?? "#e8f0fb" }}>{value}</span>
  </div>
)

export const PerfPanel = ({
  statsRef,
  onReset,
}: {
  statsRef: MutableRefObject<PerfSnapshot>
  onReset: () => void
}) => {
  const [stats, setStats] = useState(statsRef.current)

  useEffect(() => {
    const id = window.setInterval(() => setStats({ ...statsRef.current }), 250)
    return () => window.clearInterval(id)
  }, [statsRef])

  const fpsOk = stats.fps >= 55
  const fpsWarn = stats.fps >= 28
  const rtdOk = stats.rtdMs <= 8
  const rtdWarn = stats.rtdMs <= 16.7
  const frameOk = stats.frameMs <= 18
  const frameWarn = stats.frameMs <= 34

  return (
    <div style={panel}>
      <div style={head}>
        <span>DEVICE CHECK</span>
        <button type="button" style={resetBtn} onClick={onReset}>
          reset
        </button>
      </div>

      <div>
        <div style={title}>FPS</div>
        <Row label="now" value={fmt(stats.fps, 0)} color={tone(fpsOk, fpsWarn)} />
        <Row label="avg / min" value={`${fmt(stats.fpsAvg, 0)} / ${fmt(stats.fpsMin, 0)}`} />
        <Row
          label="frame ms"
          value={`${fmt(stats.frameMs)}  max ${fmt(stats.frameMsMax)}`}
          color={tone(frameOk, frameWarn)}
        />
      </div>

      <div style={section}>
        <div style={title}>RTD · render, ms</div>
        <Row label="now" value={fmt(stats.rtdMs, 2)} color={tone(rtdOk, rtdWarn)} />
        <Row label="avg / max" value={`${fmt(stats.rtdAvg, 2)} / ${fmt(stats.rtdMax, 2)}`} />
        <Row label="jank >33ms" value={`${stats.jank} / ${stats.frames}`} />
      </div>

      <div style={section}>
        <div style={title}>Animation</div>
        <Row label="name" value={stats.animation || "—"} />
        <Row label="skin" value={stats.skin || "—"} />
        <Row
          label="time"
          value={`${fmt(stats.animTime, 2)} / ${fmt(stats.animDuration, 2)} s`}
        />
      </div>

      <div style={section}>
        <div style={title}>Device</div>
        <Row label="renderer" value={stats.renderer || "—"} />
        <Row label="gpu" value={stats.gpu || "—"} />
        <Row label="max tex" value={stats.maxTexture ? `${stats.maxTexture}` : "—"} />
        <Row
          label="canvas"
          value={`${stats.canvasW}×${stats.canvasH} @${fmt(stats.resolution, 2)}`}
        />
        <Row label="css" value={`${stats.cssW}×${stats.cssH}`} />
        <Row label="screen" value={`${stats.screenW}×${stats.screenH}`} />
        <Row label="dpr" value={`${fmt(stats.dpr, 2)}`} />
        <Row label="cores" value={`${stats.cores || "—"}`} />
        <Row
          label="ram"
          value={stats.deviceMemoryGB == null ? "—" : `${stats.deviceMemoryGB} GB`}
        />
        <Row label="heap" value={stats.heapMB == null ? "—" : `${fmt(stats.heapMB, 1)} MB`} />
        <Row label="net" value={stats.connection ?? "—"} />
        <Row
          label="page"
          value={stats.hidden ? "hidden" : "visible"}
          color={stats.hidden ? "#fb7185" : "#6ee7a8"}
        />
      </div>
    </div>
  )
}
