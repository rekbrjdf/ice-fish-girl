export const EXAMPLES = [
  { id: "girl", title: "Ice fish girl" },
  { id: "background", title: "Background scene" },
] as const;

export type ExampleId = (typeof EXAMPLES)[number]["id"];
