import { useCallback, useState } from "react";

import { BackgroundStage } from "./BackgroundStage";
import { type ExampleId } from "./examples";
import { GirlStage } from "./GirlStage";
import { EMPTY_STATS, type Stats } from "./stats";
import { StatsPanel } from "./StatsPanel";

// Нативный DPR экрана: он же стартовое значение, ограниченное двойкой, чтобы на
// телефонах с DPR 3 первый кадр не стоил вчетверо дороже.
const DEVICE_DPR = Math.round(window.devicePixelRatio * 100) / 100;

export const App = () => {
  const [example, setExample] = useState<ExampleId>("girl");
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [showRig, setShowRig] = useState(true);
  const [dpr, setDpr] = useState(Math.min(DEVICE_DPR, 2));
  const [mode, setMode] = useState<string | null>(null);

  const onStats = useCallback((next: Stats) => setStats(next), []);
  const onMode = useCallback((next: { title: string }) => setMode(next.title), []);

  const selectExample = useCallback((next: ExampleId) => {
    setStats(EMPTY_STATS);
    setMode(null);
    setExample(next);
  }, []);

  return (
    <>
      {example === "girl" ? (
        <GirlStage key="girl" showRig={showRig} dpr={dpr} onStats={onStats} />
      ) : (
        <BackgroundStage key="background" dpr={dpr} onStats={onStats} onMode={onMode} />
      )}
      <StatsPanel
        stats={stats}
        example={example}
        onExample={selectExample}
        showRig={example === "girl" ? showRig : null}
        onShowRig={setShowRig}
        dpr={dpr}
        deviceDpr={DEVICE_DPR}
        onDpr={setDpr}
        mode={example === "background" ? mode : null}
      />
    </>
  );
};
