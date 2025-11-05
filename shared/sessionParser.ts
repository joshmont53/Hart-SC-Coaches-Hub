// Session parser utility - converts coach's written session text into distance totals

export interface SessionTotals {
  totalFrontCrawlSwim: number;
  totalFrontCrawlDrill: number;
  totalFrontCrawlKick: number;
  totalFrontCrawlPull: number;
  totalBackstrokeSwim: number;
  totalBackstrokeDrill: number;
  totalBackstrokeKick: number;
  totalBackstrokePull: number;
  totalBreaststrokeSwim: number;
  totalBreaststrokeDrill: number;
  totalBreaststrokeKick: number;
  totalBreaststrokePull: number;
  totalButterflySwim: number;
  totalButterflyDrill: number;
  totalButterflyKick: number;
  totalButterflyPull: number;
  totalIMSwim: number;
  totalIMDrill: number;
  totalIMKick: number;
  totalIMPull: number;
  totalNo1Swim: number;
  totalNo1Drill: number;
  totalNo1Kick: number;
  totalNo1Pull: number;
}

export interface ParsedLine {
  lineNumber: number;
  originalText: string;
  parsed: boolean;
  contributions?: Array<{ stroke: string; activity: string; distance: number }>;
  warning?: string;
  error?: string;
}

export interface ParseResult {
  totals: SessionTotals;
  parsedLines: ParsedLine[];
  successCount: number;
  warningCount: number;
  errorCount: number;
}

type Stroke = 'FrontCrawl' | 'Backstroke' | 'Breaststroke' | 'Butterfly' | 'IM' | 'No1';
type Activity = 'Swim' | 'Drill' | 'Kick' | 'Pull';

// Stroke abbreviation mapping
const STROKE_PATTERNS: Record<string, Stroke> = {
  // Front Crawl
  'fc': 'FrontCrawl',
  'free': 'FrontCrawl',
  'freestyle': 'FrontCrawl',
  'frontcrawl': 'FrontCrawl',
  // Backstroke
  'bk': 'Backstroke',
  'bc': 'Backstroke',
  'back': 'Backstroke',
  'backstroke': 'Backstroke',
  // Breaststroke
  'br': 'Breaststroke',
  'brst': 'Breaststroke',
  'breast': 'Breaststroke',
  'breaststroke': 'Breaststroke',
  // Butterfly
  'fly': 'Butterfly',
  'butterfly': 'Butterfly',
  // IM
  'im': 'IM',
  // Choice/No1
  'no1': 'No1',
  'choice': 'No1',
  'not fc': 'No1',
};

// Activity type keywords
const ACTIVITY_PATTERNS: Record<string, Activity> = {
  'swim': 'Swim',
  'drill': 'Drill',
  'kick': 'Kick',
  'pull': 'Pull',
};

// Keywords that indicate drill work
const DRILL_KEYWORDS = [
  'streamline',
  'catch switch',
  'doggy paddle',
  '12/1/12',
  'scull',
  'fingertip drag',
  '6 kick drill',
  'zipper',
  'single arm',
];

function normalizeText(text: string): string {
  return text.toLowerCase().trim();
}

function detectStroke(text: string): Stroke | null {
  const normalized = normalizeText(text);
  
  // Check for "not fc" pattern first (it's two words)
  if (normalized.includes('not fc') || normalized.includes('notfc')) {
    return 'No1';
  }
  
  // Check all other patterns
  for (const [pattern, stroke] of Object.entries(STROKE_PATTERNS)) {
    if (normalized.includes(pattern)) {
      return stroke;
    }
  }
  
  return null;
}

function detectActivity(text: string): Activity | null {
  const normalized = normalizeText(text);
  
  // Check for drill keywords first
  for (const keyword of DRILL_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return 'Drill';
    }
  }
  
  // Check explicit activity patterns
  for (const [pattern, activity] of Object.entries(ACTIVITY_PATTERNS)) {
    if (normalized.includes(pattern)) {
      return activity;
    }
  }
  
  return null;
}

function extractDistance(text: string): number | null {
  const normalized = normalizeText(text);
  
  // Pattern: "4 x 100" or "4x100"
  const repsPattern = /(\d+)\s*x\s*(\d+)/;
  const repsMatch = normalized.match(repsPattern);
  if (repsMatch) {
    return parseInt(repsMatch[1]) * parseInt(repsMatch[2]);
  }
  
  // Pattern: just a distance like "400" or "400m"
  const distancePattern = /(\d+)\s*m?\b/;
  const distanceMatch = normalized.match(distancePattern);
  if (distanceMatch) {
    return parseInt(distanceMatch[1]);
  }
  
  return null;
}

function parseBreakdown(text: string, totalDistance: number): Array<{ stroke: Stroke; activity: Activity; distance: number }> {
  const contributions: Array<{ stroke: Stroke; activity: Activity; distance: number }> = [];
  const normalized = normalizeText(text);
  
  // Check for "as 25m X / 25m Y / 25m Z" pattern
  const asPattern = /as\s+(.+)/;
  const asMatch = normalized.match(asPattern);
  
  if (asMatch) {
    const breakdownText = asMatch[1];
    const parts = breakdownText.split('/').map(p => p.trim());
    
    if (parts.length > 0) {
      // Calculate distance per part
      const repsPattern = /(\d+)\s*x\s*(\d+)/;
      const repsMatch = normalized.match(repsPattern);
      const reps = repsMatch ? parseInt(repsMatch[1]) : 1;
      
      // Process each part
      const partDistances: Array<{ activity: Activity; distance: number }> = [];
      
      for (const part of parts) {
        const distMatch = part.match(/(\d+)\s*m?/);
        if (distMatch) {
          const dist = parseInt(distMatch[1]);
          const activity = detectActivity(part) || 'Swim';
          partDistances.push({ activity, distance: dist * reps });
        }
      }
      
      // Determine stroke
      const stroke = detectStroke(text) || 'FrontCrawl';
      
      // Add contributions
      for (const pd of partDistances) {
        contributions.push({ stroke, activity: pd.activity, distance: pd.distance });
      }
      
      return contributions;
    }
  }
  
  return [];
}

function parseLine(lineText: string, lineNumber: number, previousLines: ParsedLine[]): ParsedLine {
  const trimmed = lineText.trim();
  
  // Skip empty lines and section headers
  if (!trimmed || trimmed.length < 3 || /^[_\-=]+$/.test(trimmed)) {
    return {
      lineNumber,
      originalText: lineText,
      parsed: false,
    };
  }
  
  // Check for "Repeat" instruction
  if (normalizeText(trimmed).includes('repeat')) {
    // Find previous non-empty parsed lines to repeat
    const linesToRepeat: ParsedLine[] = [];
    for (let i = previousLines.length - 1; i >= 0; i--) {
      const prev = previousLines[i];
      if (prev.parsed && prev.contributions && prev.contributions.length > 0) {
        linesToRepeat.unshift(prev);
        // Check if this was part of a set (typically repeat 1-2 lines)
        if (linesToRepeat.length >= 2) break;
      }
      if (!prev.originalText.trim()) break; // Stop at empty line
    }
    
    if (linesToRepeat.length > 0) {
      const contributions: Array<{ stroke: string; activity: string; distance: number }> = [];
      for (const line of linesToRepeat) {
        if (line.contributions) {
          contributions.push(...line.contributions);
        }
      }
      
      return {
        lineNumber,
        originalText: lineText,
        parsed: true,
        contributions,
        warning: `Repeated ${linesToRepeat.length} previous line(s)`,
      };
    }
  }
  
  const distance = extractDistance(trimmed);
  
  if (!distance) {
    // Not an error - might be a descriptive line or section header
    return {
      lineNumber,
      originalText: lineText,
      parsed: false,
    };
  }
  
  // Check for breakdown pattern (e.g., "as 25m kick / 25m drill")
  const breakdown = parseBreakdown(trimmed, distance);
  if (breakdown.length > 0) {
    return {
      lineNumber,
      originalText: lineText,
      parsed: true,
      contributions: breakdown.map(b => ({ stroke: b.stroke, activity: b.activity, distance: b.distance })),
    };
  }
  
  // Detect stroke and activity
  let stroke = detectStroke(trimmed);
  const activity = detectActivity(trimmed) || 'Swim';
  
  // Handle special patterns
  const normalized = normalizeText(trimmed);
  
  // "alt lengths" or "alt. lengths" - split distance evenly between strokes
  if (normalized.includes('alt') && (normalized.includes('length') || normalized.includes('len'))) {
    const strokes: Stroke[] = [];
    
    // Find all strokes mentioned
    if (normalized.includes('fc') || normalized.includes('free')) strokes.push('FrontCrawl');
    if (normalized.includes('bk') || normalized.includes('back') || normalized.includes('bc')) strokes.push('Backstroke');
    if (normalized.includes('br') || normalized.includes('breast')) strokes.push('Breaststroke');
    if (normalized.includes('fly') && !normalized.includes('butterfly')) strokes.push('Butterfly');
    
    if (strokes.length >= 2) {
      const distPerStroke = distance / strokes.length;
      return {
        lineNumber,
        originalText: lineText,
        parsed: true,
        contributions: strokes.map(s => ({ stroke: s, activity, distance: distPerStroke })),
      };
    }
  }
  
  // "IM" - split across 4 strokes equally
  if (stroke === 'IM') {
    // Keep as IM unless it says "IM per stroke"
    if (normalized.includes('per stroke') || normalized.includes('per-stroke')) {
      const distPerStroke = distance / 4;
      return {
        lineNumber,
        originalText: lineText,
        parsed: true,
        contributions: [
          { stroke: 'Butterfly', activity, distance: distPerStroke },
          { stroke: 'Backstroke', activity, distance: distPerStroke },
          { stroke: 'Breaststroke', activity, distance: distPerStroke },
          { stroke: 'FrontCrawl', activity, distance: distPerStroke },
        ],
      };
    }
    // Otherwise keep as IM
    return {
      lineNumber,
      originalText: lineText,
      parsed: true,
      contributions: [{ stroke: 'IM', activity, distance }],
    };
  }
  
  // "2 pull as 1 bk 1 fc" or "2 kick as 1 brst 1 fly" - split evenly
  const splitPattern = /(\d+)\s*(pull|kick|swim|drill)\s+as\s+(.+)/;
  const splitMatch = normalized.match(splitPattern);
  if (splitMatch) {
    const activityType = (splitMatch[2].charAt(0).toUpperCase() + splitMatch[2].slice(1)) as Activity;
    const splitPart = splitMatch[3];
    
    // Extract strokes from the split part
    const strokes: Stroke[] = [];
    if (splitPart.includes('bk') || splitPart.includes('back')) strokes.push('Backstroke');
    if (splitPart.includes('fc') || splitPart.includes('free')) strokes.push('FrontCrawl');
    if (splitPart.includes('br') || splitPart.includes('breast')) strokes.push('Breaststroke');
    if (splitPart.includes('fly')) strokes.push('Butterfly');
    
    if (strokes.length >= 2) {
      const reps = parseInt(splitMatch[1]);
      const distPerStroke = (distance / 2) / strokes.length * reps;
      
      return {
        lineNumber,
        originalText: lineText,
        parsed: true,
        contributions: strokes.map(s => ({ stroke: s, activity: activityType, distance: distPerStroke })),
      };
    }
  }
  
  // "4 no1 4fc" or "2no1 2fc" - distribute reps
  const repDistPattern = /(\d+)\s*(no1|choice|not\s*fc)\s+(\d+)\s*(fc|free|bk|back|br|breast|fly)/;
  const repDistMatch = normalized.match(repDistPattern);
  if (repDistMatch) {
    const reps1 = parseInt(repDistMatch[1]);
    const reps2 = parseInt(repDistMatch[3]);
    const stroke2Text = repDistMatch[4];
    
    const stroke2 = detectStroke(stroke2Text) || 'FrontCrawl';
    
    // Calculate distance per rep
    const distPattern = /(\d+)\s*m?\b/;
    const distMatch = normalized.match(distPattern);
    const distPerRep = distMatch ? parseInt(distMatch[1]) : 50; // Default to 50m
    
    return {
      lineNumber,
      originalText: lineText,
      parsed: true,
      contributions: [
        { stroke: 'No1', activity, distance: reps1 * distPerRep },
        { stroke: stroke2, activity, distance: reps2 * distPerRep },
      ],
    };
  }
  
  // Default: single stroke and activity
  if (!stroke) {
    stroke = 'FrontCrawl'; // Default to FC if no stroke detected
    return {
      lineNumber,
      originalText: lineText,
      parsed: true,
      contributions: [{ stroke, activity, distance }],
      warning: 'No stroke specified - defaulted to Front Crawl',
    };
  }
  
  return {
    lineNumber,
    originalText: lineText,
    parsed: true,
    contributions: [{ stroke, activity, distance }],
  };
}

export function parseSessionText(sessionText: string): ParseResult {
  const lines = sessionText.split('\n');
  const parsedLines: ParsedLine[] = [];
  
  const totals: SessionTotals = {
    totalFrontCrawlSwim: 0,
    totalFrontCrawlDrill: 0,
    totalFrontCrawlKick: 0,
    totalFrontCrawlPull: 0,
    totalBackstrokeSwim: 0,
    totalBackstrokeDrill: 0,
    totalBackstrokeKick: 0,
    totalBackstrokePull: 0,
    totalBreaststrokeSwim: 0,
    totalBreaststrokeDrill: 0,
    totalBreaststrokeKick: 0,
    totalBreaststrokePull: 0,
    totalButterflySwim: 0,
    totalButterflyDrill: 0,
    totalButterflyKick: 0,
    totalButterflyPull: 0,
    totalIMSwim: 0,
    totalIMDrill: 0,
    totalIMKick: 0,
    totalIMPull: 0,
    totalNo1Swim: 0,
    totalNo1Drill: 0,
    totalNo1Kick: 0,
    totalNo1Pull: 0,
  };
  
  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;
  
  // Parse each line
  for (let i = 0; i < lines.length; i++) {
    const parsedLine = parseLine(lines[i], i + 1, parsedLines);
    parsedLines.push(parsedLine);
    
    if (parsedLine.parsed) {
      successCount++;
      if (parsedLine.warning) warningCount++;
      
      // Add contributions to totals
      if (parsedLine.contributions) {
        for (const contrib of parsedLine.contributions) {
          const key = `total${contrib.stroke}${contrib.activity}` as keyof SessionTotals;
          totals[key] += contrib.distance;
        }
      }
    }
    
    if (parsedLine.error) {
      errorCount++;
    }
  }
  
  return {
    totals,
    parsedLines,
    successCount,
    warningCount,
    errorCount,
  };
}
