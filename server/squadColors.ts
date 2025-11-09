const SQUAD_COLORS = [
  '#E53E3E', // Red
  '#DD6B20', // Orange
  '#D69E2E', // Yellow
  '#38A169', // Green
  '#319795', // Teal
  '#3182CE', // Blue
  '#5A67D8', // Indigo
  '#805AD5', // Purple
  '#D53F8C', // Pink
  '#00B5D8', // Cyan
  '#48BB78', // Light Green
  '#ED8936', // Light Orange
  '#F56565', // Light Red
  '#9F7AEA', // Light Purple
  '#667EEA', // Light Indigo
  '#4299E1', // Light Blue
  '#38B2AC', // Light Teal
  '#ECC94B', // Light Yellow
  '#ED64A6', // Light Pink
  '#F687B3', // Rose
];

export function getNextAvailableColor(existingColors: string[]): string {
  const usedColors = new Set(existingColors.map(c => c.toUpperCase()));
  
  for (const color of SQUAD_COLORS) {
    if (!usedColors.has(color.toUpperCase())) {
      return color;
    }
  }
  
  const randomIndex = Math.floor(Math.random() * SQUAD_COLORS.length);
  return SQUAD_COLORS[randomIndex];
}
