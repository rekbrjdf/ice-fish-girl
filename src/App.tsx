import { useCallback, useRef } from "react";

import { GirlStage } from "./GirlStage";
import { PerfPanel } from "./PerfPanel";
import { createPerfSnapshot } from "./perf";

export const App = () => {
  const statsRef = useRef(createPerfSnapshot());
  const resetRef = useRef<() => void>(() => {});
  const onReset = useCallback(() => resetRef.current(), []);

  return (
    <>
      <GirlStage statsRef={statsRef} resetRef={resetRef} />
      <PerfPanel statsRef={statsRef} onReset={onReset} />
    </>
  );
};
