import { useState } from "react";

import { EXAMPLES, type ExampleId } from "./examples";
import type { Stats } from "./stats";

const panel: React.CSSProperties = {
  position: "absolute",
  top: 12,
  left: 12,
  width: 250,
  padding: "10px 12px",
  background: "rgba(0,0,0,0.62)",
  color: "#e8f4ff",
  font: "12px/1.5 ui-monospace, SFMono-Regular, Consolas, monospace",
  borderRadius: 8,
  backdropFilter: "blur(4px)",
  userSelect: "none",
};

const row: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

const label: React.CSSProperties = { color: "#8fa8bd" };

const section: React.CSSProperties = {
  margin: "8px 0 4px",
  color: "#5f7c8f",
  letterSpacing: 0.6,
  textTransform: "uppercase",
  fontSize: 10,
};

const control: React.CSSProperties = {
  padding: "5px 6px",
  background: "rgba(255,255,255,0.08)",
  color: "#e8f4ff",
  font: "inherit",
  border: "1px solid rgba(255,255,255,0.18)",
  borderRadius: 6,
  cursor: "pointer",
};

const head: React.CSSProperties = {
  display: "flex",
  gap: 6,
  marginBottom: 10,
};

const select: React.CSSProperties = { ...control, flex: 1, minWidth: 0 };

const toggle: React.CSSProperties = { ...control, width: 28, padding: "5px 0", lineHeight: 1 };

const fpsColor = (fps: number) => (fps >= 55 ? "#7ee787" : fps >= 40 ? "#e3b341" : "#ff7b72");

const num = (value: number, digits = 1) => value.toFixed(digits);

const Row = ({ name, value, color }: { name: string; value: string; color?: string }) => (
  <div style={row}>
    <span style={label}>{name}</span>
    <span style={color ? { color } : undefined}>{value}</span>
  </div>
);

interface DetailsProps {
  stats: Stats;
  showRig: boolean | null;
  onShowRig: (value: boolean) => void;
  mode: string | null;
}

const Details = ({ stats, showRig, onShowRig, mode }: DetailsProps) => (
  <>
    <div style={section}>frame</div>
    <Row name="fps min / max" value={`${num(stats.fpsMin)} / ${num(stats.fpsMax)}`} />
    <Row name="frame max" value={`${num(stats.frameMsMax)} ms`} />
    <Row name="cpu (js+submit)" value={`${num(stats.cpuMs, 2)} ms`} />
    <Row name="gpu" value={stats.gpuMs === null ? "n/a" : `${num(stats.gpuMs, 2)} ms`} />
    <Row name="long frames >33ms" value={String(stats.longFrames)} />

    <div style={section}>render</div>
    <Row name="draw calls" value={String(stats.drawCalls)} />
    <Row name="triangles" value={stats.triangles.toLocaleString("en-US")} />
    <Row name="texture binds" value={String(stats.textureBinds)} />
    <Row name="canvas" value={`${stats.canvas} @${num(stats.resolution, 2)}x`} />
    <Row name="pixels" value={`${num(stats.pixels / 1e6, 2)} MP`} />

    <div style={section}>spine</div>
    <Row name="bones" value={String(stats.bones)} />
    <Row name="slots" value={String(stats.slots)} />
    <Row name="attachments" value={String(stats.attachments)} />

    <div style={section}>memory</div>
    <Row
      name="js heap"
      value={stats.heapMb === null ? "n/a" : `${num(stats.heapMb, 1)} / ${num(stats.heapLimitMb ?? 0, 0)} MB`}
    />

    <div style={section}>context</div>
    <Row name="renderer" value={stats.renderer} />
    <div style={{ ...label, wordBreak: "break-word", fontSize: 11 }}>{stats.gpu}</div>

    {mode !== null && (
      <>
        <div style={section}>mode</div>
        <Row name="background" value={mode} />
      </>
    )}

    {showRig !== null && (
      <label style={{ ...row, marginTop: 10, cursor: "pointer" }}>
        <span style={label}>rig</span>
        <input type="checkbox" checked={showRig} onChange={(e) => onShowRig(e.target.checked)} />
      </label>
    )}
  </>
);

interface Props {
  stats: Stats;
  example: ExampleId;
  onExample: (value: ExampleId) => void;
  showRig: boolean | null;
  onShowRig: (value: boolean) => void;
  mode: string | null;
}

export const StatsPanel = ({ stats, example, onExample, showRig, onShowRig, mode }: Props) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div style={panel}>
      <div style={head}>
        <select style={select} value={example} onChange={(e) => onExample(e.target.value as ExampleId)}>
          {EXAMPLES.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <button
          style={toggle}
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? "Expand panel" : "Collapse panel"}
          aria-expanded={!collapsed}
        >
          {collapsed ? "▾" : "▴"}
        </button>
      </div>

      <div style={{ ...row, fontSize: 20, alignItems: "baseline" }}>
        <span style={{ color: fpsColor(stats.fps) }}>{num(stats.fps)} fps</span>
        <span style={label}>{num(stats.frameMs)} ms</span>
      </div>

      {collapsed ? (
        <div style={{ marginTop: 6 }}>
          <Row name="draw calls" value={String(stats.drawCalls)} />
          <Row name="triangles" value={stats.triangles.toLocaleString("en-US")} />
          {mode !== null && <Row name="mode" value={mode} />}
        </div>
      ) : (
        <Details stats={stats} showRig={showRig} onShowRig={onShowRig} mode={mode} />
      )}
    </div>
  );
};
