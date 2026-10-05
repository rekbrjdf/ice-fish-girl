import { useCallback, useState } from "react";

import { BackgroundStage } from "./BackgroundStage";
import { type ExampleId } from "./examples";
import { GirlStage } from "./GirlStage";
import { EMPTY_STATS, type Stats } from "./stats";
import { StatsPanel } from "./StatsPanel";

export const App = () => {
  const [example, setExample] = useState<ExampleId>("girl");
  const [stats, setStats] = useState<Stats>(EMPTY_STATS);
  const [showRig, setShowRig] = useState(true);
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
        <GirlStage key="girl" showRig={showRig} onStats={onStats} />
      ) : (
        <BackgroundStage key="background" onStats={onStats} onMode={onMode} />
      )}
      <StatsPanel
        stats={stats}
        example={example}
        onExample={selectExample}
        showRig={example === "girl" ? showRig : null}
        onShowRig={setShowRig}
        mode={example === "background" ? mode : null}
      />
    </>
  );
};
