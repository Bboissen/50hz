export const COLORS = {
  inkBlack: "#101711",
  panelGreen: "#1f2b22",
  oxideGreen: "#3d4b36",
  fadedOlive: "#7b8060",
  paperTan: "#c8b982",
  phosphorGreen: "#8dfc7a",
  amberWarn: "#ffbd45",
  overloadRed: "#e34b35",
  dataCyan: "#6fcad1",
  windowWarm: "#f2dd8a",
  smokeGrey: "#8d9380",
} as const;

export const NUMERIC_COLORS = {
  inkBlack: 0x101711,
  panelGreen: 0x1f2b22,
  oxideGreen: 0x3d4b36,
  fadedOlive: 0x7b8060,
  paperTan: 0xc8b982,
  phosphorGreen: 0x8dfc7a,
  amberWarn: 0xffbd45,
  overloadRed: 0xe34b35,
  dataCyan: 0x6fcad1,
  windowWarm: 0xf2dd8a,
  smokeGrey: 0x8d9380,
} as const;

export const TYPOGRAPHY = {
  labelFamily: "Courier New, monospace",
  numberFamily: "Georgia, serif",
} as const;

export type DesignTokens = {
  colors: typeof NUMERIC_COLORS;
  typography: typeof TYPOGRAPHY;
};

export const DESIGN_TOKENS: DesignTokens = {
  colors: NUMERIC_COLORS,
  typography: TYPOGRAPHY,
};
