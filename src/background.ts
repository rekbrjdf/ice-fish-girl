// BASE_URL === "/ice-fish-girl/" в сборке для Pages, поэтому путь не может быть абсолютным от корня домена.
const BASE = `${import.meta.env.BASE_URL}assets/background/`;

export const BACKGROUND_SKELETON = `${BASE}spine.json`;
export const BACKGROUND_ATLAS = `${BASE}spine.atlas`;

export interface BackgroundMode {
  id: string;
  title: string;
  texture: string;
  animation: string;
}

export const BACKGROUND_MODES: BackgroundMode[] = [
  {
    id: "regular",
    title: "Regular",
    texture: `${BASE}background-regular.jpg`,
    animation: "regular_bg",
  },
  {
    id: "freespins",
    title: "Free spins",
    texture: `${BASE}background-freespins.jpg`,
    animation: "free_spins_bg",
  },
  {
    id: "hotmode",
    title: "Hot mode",
    texture: `${BASE}background-hotmode.jpg`,
    animation: "hot_mode_bg_idle",
  },
];

export const BACKGROUND_CYCLE_MS = 4000;
export const BACKGROUND_CROSSFADE_S = 0.7;
