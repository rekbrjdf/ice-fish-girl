export const BACKGROUND_SKELETON = "/assets/background/spine.json";
export const BACKGROUND_ATLAS = "/assets/background/spine.atlas";

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
    texture: "/assets/background/background-regular.jpg",
    animation: "regular_bg",
  },
  {
    id: "freespins",
    title: "Free spins",
    texture: "/assets/background/background-freespins.jpg",
    animation: "free_spins_bg",
  },
  {
    id: "hotmode",
    title: "Hot mode",
    texture: "/assets/background/background-hotmode.jpg",
    animation: "hot_mode_bg_idle",
  },
];

export const BACKGROUND_CYCLE_MS = 4000;
export const BACKGROUND_CROSSFADE_S = 0.7;
