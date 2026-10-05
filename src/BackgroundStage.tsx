import { Spine } from "@esotericsoftware/spine-pixi-v8";
import { Application, Assets, Container, Sprite, Texture } from "pixi.js";
import { useEffect, useRef } from "react";

import {
  BACKGROUND_ATLAS,
  BACKGROUND_CROSSFADE_S,
  BACKGROUND_CYCLE_MS,
  BACKGROUND_MODES,
  BACKGROUND_SKELETON,
  type BackgroundMode,
} from "./background";
import { attachStats, type Stats } from "./stats";

interface Props {
  onStats: (stats: Stats) => void;
  onMode?: (mode: BackgroundMode) => void;
}

// Симметричная кривая: f(1 - t) === 1 - f(t), поэтому встречные альфа в сумме дают ровно 1
// и картинка не проседает в середине перехода.
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));

export const BackgroundStage = ({ onStats, onMode }: Props) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const onModeRef = useRef(onMode);
  onModeRef.current = onMode;

  useEffect(() => {
    const host = hostRef.current!;
    const app = new Application();
    let disposed = false;
    let detachStats: (() => void) | null = null;
    let cycle: number | null = null;

    // Пары слоёв: один показывает текущий режим, второй проявляется. После перехода
    // они меняются ролями — спайны не пересоздаются, иначе на каждой смене режима фриз.
    const backdrop = new Container();
    const overlay = new Container();

    let currentSprite: Sprite | null = null;
    let incomingSprite: Sprite | null = null;
    let currentSpine: Spine | null = null;
    let incomingSpine: Spine | null = null;

    let modeIndex = 0;
    let transition: { mode: BackgroundMode; elapsed: number } | null = null;

    const layout = () => {
      if (!currentSprite || !incomingSprite || !currentSpine || !incomingSpine) return;

      const { width, height } = app.screen;
      const texture = currentSprite.texture;
      const scale = Math.max(width / texture.width, height / texture.height);

      for (const layer of [currentSprite, incomingSprite, currentSpine, incomingSpine]) {
        layer.scale.set(scale);
        layer.position.set(width / 2, height / 2);
      }
    };

    const startTransition = (mode: BackgroundMode) => {
      if (!incomingSprite || !incomingSpine || transition) return;

      incomingSprite.texture = Texture.from(mode.texture);
      incomingSprite.alpha = 0;
      backdrop.addChild(incomingSprite);

      // Анимации режимов кеят разный набор костей, часть костей в setup-позе зеркальна —
      // без сброса спайн донашивает позу предыдущего режима.
      incomingSpine.state.clearTracks();
      incomingSpine.skeleton.setToSetupPose();
      incomingSpine.state.setAnimation(0, mode.animation, true);
      incomingSpine.alpha = 0;
      overlay.addChild(incomingSpine);

      layout();
      transition = { mode, elapsed: 0 };
    };

    const commitTransition = () => {
      if (!transition || !currentSprite || !incomingSprite || !currentSpine || !incomingSpine) return;

      const retiredSprite = currentSprite;
      currentSprite = incomingSprite;
      incomingSprite = retiredSprite;
      currentSprite.alpha = 1;
      incomingSprite.alpha = 0;

      const retiredSpine = currentSpine;
      currentSpine = incomingSpine;
      incomingSpine = retiredSpine;
      currentSpine.alpha = 1;
      incomingSpine.alpha = 0;
      incomingSpine.state.clearTracks();

      onModeRef.current?.(transition.mode);
      transition = null;
    };

    const advance = () => {
      if (!transition || !currentSpine || !incomingSpine || !incomingSprite) return;

      transition.elapsed += app.ticker.deltaMS / 1000;
      const progress = Math.min(1, transition.elapsed / BACKGROUND_CROSSFADE_S);
      const eased = easeInOut(progress);

      incomingSprite.alpha = eased;
      incomingSpine.alpha = eased;
      currentSpine.alpha = 1 - eased;

      if (progress === 1) commitTransition();
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
        ...BACKGROUND_MODES.map((mode) => mode.texture),
        { alias: "background-skeleton", src: BACKGROUND_SKELETON },
        { alias: "background-atlas", src: BACKGROUND_ATLAS },
      ]);
      if (disposed) return;

      const first = BACKGROUND_MODES[0];

      currentSprite = new Sprite(Texture.from(first.texture));
      incomingSprite = new Sprite(Texture.from(first.texture));
      for (const sprite of [currentSprite, incomingSprite]) {
        sprite.anchor.set(0.5);
        backdrop.addChild(sprite);
      }
      incomingSprite.alpha = 0;

      // Две независимые копии вместо клонирования: у Skeleton.scaleY геттер и сеттер
      // несимметричны (Skeleton.yDown === true), и копирование значения переворачивает спайн.
      currentSpine = Spine.from({ skeleton: "background-skeleton", atlas: "background-atlas" });
      incomingSpine = Spine.from({ skeleton: "background-skeleton", atlas: "background-atlas" });
      for (const spine of [currentSpine, incomingSpine]) overlay.addChild(spine);
      incomingSpine.alpha = 0;

      currentSpine.state.setAnimation(0, first.animation, true);

      app.stage.addChild(backdrop, overlay);
      layout();
      app.renderer.on("resize", layout);
      app.ticker.add(advance);

      onModeRef.current?.(first);

      cycle = window.setInterval(() => {
        modeIndex = (modeIndex + 1) % BACKGROUND_MODES.length;
        startTransition(BACKGROUND_MODES[modeIndex]);
      }, BACKGROUND_CYCLE_MS);

      detachStats = attachStats(
        app,
        () => {
          const skeleton = currentSpine!.skeleton;
          let attachments = 0;
          for (const slot of skeleton.slots) if (slot.getAttachment()) attachments++;
          return { bones: skeleton.bones.length, slots: skeleton.slots.length, attachments };
        },
        onStats,
      );
    })().catch((error) => console.error("BackgroundStage init failed", error));

    return () => {
      disposed = true;
      if (cycle !== null) window.clearInterval(cycle);
      detachStats?.();
      if (app.renderer) {
        app.renderer.off("resize", layout);
        app.ticker.remove(advance);
        app.destroy(true, { children: true });
      }
    };
  }, [onStats]);

  return <div ref={hostRef} style={{ position: "absolute", inset: 0 }} />;
};
