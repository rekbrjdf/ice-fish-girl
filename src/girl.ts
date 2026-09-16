const asset = (file: string) => `${import.meta.env.BASE_URL}assets/anims_v23/${file}`;

export const SKELETON = asset("fishing.json");
export const ATLAS = asset("fishing_girl.atlas");

export const GIRL_SLOTS = new Set([
  "1212121213",
  "Слой 35 копия 2",
  "Слой 37 копия 3",
  "Слой 37 копия 3111",
  "Слой 38",
  "Слой 38 копия 3",
  "Слой 42",
  "Слой 43",
  "Слой 45 копия 2",
  "Слой 46 копия",
  "Слой 47 копия",
  "Слой 49 копия",
  "Слой 50 копия",
  "Слой 51 копия",
  "Слой 51 копия 2",
  "Слой 52 копия",
  "Слой 53 копия",
  "Слой 54 копия",
  "Слой 54 копия2",
  "Слой 55 копия",
]);

export const RIG_PREFIX = "udochka/";

export const GIRL_ANIMATION = "2x_6x";
