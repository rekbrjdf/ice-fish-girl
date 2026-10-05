import {
  MeshAttachment,
  MixBlend,
  MixDirection,
  Physics,
  RegionAttachment,
  Spine,
} from "@esotericsoftware/spine-pixi-v8";
import { Application, Assets } from "pixi.js";
import { useEffect, useRef } from "react";

import { ATLAS, GIRL_ANIMATION, GIRL_SKIN, GIRL_SLOTS, RIG_PREFIX, SKELETON } from "./girl";
import { attachStats, type Stats } from "./stats";

interface Props {
  showRig: boolean;
  onStats: (stats: Stats) => void;
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const girlBounds = (spine: Spine): Rect => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const verts: number[] = [];
  for (const slot of spine.skeleton.slots) {
    if (!GIRL_SLOTS.has(slot.data.name)) continue;
    const attachment = slot.getAttachment();
    let count = 0;
    if (attachment instanceof RegionAttachment) {
      count = 8;
      attachment.computeWorldVertices(slot, verts, 0, 2);
    } else if (attachment instanceof MeshAttachment) {
      count = attachment.worldVerticesLength;
      attachment.computeWorldVertices(slot, 0, count, verts, 0, 2);
    } else continue;
    for (let i = 0; i < count; i += 2) {
      minX = Math.min(minX, verts[i]);
      maxX = Math.max(maxX, verts[i]);
      minY = Math.min(minY, verts[i + 1]);
      maxY = Math.max(maxY, verts[i + 1]);
    }
  }
  if (!isFinite(minX)) return { x: 0, y: 0, width: 1, height: 1 };
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const animationBounds = (spine: Spine, animation: string): Rect => {
  const anim = spine.skeleton.data.findAnimation(animation);
  if (!anim) return girlBounds(spine);
  const skeleton = spine.skeleton;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const step = 1 / 15;
  for (let t = 0; t <= anim.duration; t += step) {
    skeleton.setToSetupPose();
    anim.apply(skeleton, t, t, false, [], 1, MixBlend.setup, MixDirection.mixIn);
    skeleton.updateWorldTransform(Physics.update);
    const b = girlBounds(spine);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.width);
    maxY = Math.max(maxY, b.y + b.height);
  }
  skeleton.setToSetupPose();
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};

const applyVisibility = (spine: Spine, showRig: boolean) => {
  for (const slot of spine.skeleton.slots) {
    const attachment = slot.getAttachment();
    const path =
      attachment && "path" in attachment
        ? String((attachment as { path?: string }).path ?? attachment.name)
        : attachment?.name;
    const isGirl = GIRL_SLOTS.has(slot.data.name);
    const isRig = !!path && path.startsWith(RIG_PREFIX);
    slot.color.a = isGirl || (showRig && isRig) ? 1 : 0;
  }
};

export const GirlStage = ({ showRig, onStats }: Props) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<Spine | null>(null);
  const showRigRef = useRef(showRig);
  showRigRef.current = showRig;
  const boundsRef = useRef<Rect>({ x: 0, y: 0, width: 1, height: 1 });

  useEffect(() => {
    const host = hostRef.current!;
    const app = new Application();
    let disposed = false;
    let spine: Spine | null = null;
    let detachStats: (() => void) | null = null;

    const layout = () => {
      if (!spine) return;
      const { width, height } = app.screen;
      const bounds = boundsRef.current;
      const scale = Math.min(width / bounds.width, height / bounds.height) * 0.9;
      spine.scale.set(scale);
      spine.position.set(
        width / 2 - (bounds.x + bounds.width / 2) * scale,
        height / 2 - (bounds.y + bounds.height / 2) * scale,
      );
    };

    (async () => {
      await app.init({
        resizeTo: host,
        backgroundAlpha: 0,
        antialias: true,
        resolution: Math.min(window.devicePixelRatio, 2),
        autoDensity: true,
        preference: "webgl",
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

      spine = Spine.from({ skeleton: "girl-skeleton", atlas: "girl-atlas" });
      spine.state.data.defaultMix = 0.15;
      if (spine.skeleton.data.findSkin(GIRL_SKIN)) spine.skeleton.setSkinByName(GIRL_SKIN);
      spine.skeleton.setToSetupPose();
      app.stage.addChild(spine);
      spineRef.current = spine;

      app.ticker.add(() => applyVisibility(spine!, showRigRef.current));

      boundsRef.current = animationBounds(spine, GIRL_ANIMATION);
      layout();
      app.renderer.on("resize", layout);
      spine.state.setAnimation(0, GIRL_ANIMATION, true);

      detachStats = attachStats(
        app,
        () => {
          const skeleton = spine!.skeleton;
          let attachments = 0;
          for (const slot of skeleton.slots) if (slot.getAttachment() && slot.color.a > 0) attachments++;
          return { bones: skeleton.bones.length, slots: skeleton.slots.length, attachments };
        },
        onStats,
      );
    })().catch((error) => console.error("GirlStage init failed", error));

    return () => {
      disposed = true;
      spineRef.current = null;
      detachStats?.();
      if (app.renderer) {
        app.renderer.off("resize", layout);
        app.destroy(true, { children: true });
      }
    };
  }, [onStats]);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
};
