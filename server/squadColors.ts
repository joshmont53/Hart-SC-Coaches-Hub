const PASTEL_COLORS = [
  '#FFB3BA', // Pastel Pink
  '#FFDFBA', // Pastel Peach
  '#FFFFBA', // Pastel Yellow
  '#BAFFC9', // Pastel Mint
  '#BAE1FF', // Pastel Blue
  '#D4BAFF', // Pastel Lavender
  '#FFB3D9', // Pastel Rose
  '#FFD4BA', // Pastel Orange
  '#E1FFBA', // Pastel Lime
  '#BAFFED', // Pastel Aqua
  '#C9BAFF', // Pastel Purple
  '#FFBAED', // Pastel Magenta
  '#FFE5BA', // Pastel Apricot
  '#CBFFBA', // Pastel Green
  '#BADAFF', // Pastel Sky
  '#EDBDFF', // Pastel Violet
  '#FFC4BA', // Pastel Coral
  '#FAFFBA', // Pastel Cream
  '#BAFFD1', // Pastel Seafoam
  '#CEBDFF', // Pastel Periwinkle
];

export function getNextAvailableColor(existingColors: string[]): string {
  const usedColors = new Set(existingColors.map(c => c.toUpperCase()));
  
  for (const color of PASTEL_COLORS) {
    if (!usedColors.has(color.toUpperCase())) {
      return color;
    }
  }
  
  const randomIndex = Math.floor(Math.random() * PASTEL_COLORS.length);
  return PASTEL_COLORS[randomIndex];
}
