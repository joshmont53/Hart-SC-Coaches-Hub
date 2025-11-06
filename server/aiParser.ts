import OpenAI from 'openai';

// Initialize OpenAI client with Replit AI Integrations
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface SessionDistances {
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
  totalDistance: number;
}

export async function calculateSessionDistancesAI(
  sessionContent: string
): Promise<SessionDistances> {
  const prompt = `You are a swimming coach assistant analyzing training sessions.

Calculate exact distance totals for each stroke and activity type.

Session text:
${sessionContent}

Return JSON with these fields (distances in meters):
{
  "totalFrontCrawlSwim": 0,
  "totalFrontCrawlDrill": 0,
  "totalFrontCrawlKick": 0,
  "totalFrontCrawlPull": 0,
  "totalBackstrokeSwim": 0,
  "totalBackstrokeDrill": 0,
  "totalBackstrokeKick": 0,
  "totalBackstrokePull": 0,
  "totalBreaststrokeSwim": 0,
  "totalBreaststrokeDrill": 0,
  "totalBreaststrokeKick": 0,
  "totalBreaststrokePull": 0,
  "totalButterflySwim": 0,
  "totalButterflyDrill": 0,
  "totalButterflyKick": 0,
  "totalButterflyPull": 0,
  "totalIMSwim": 0,
  "totalIMDrill": 0,
  "totalIMKick": 0,
  "totalIMPull": 0,
  "totalNo1Swim": 0,
  "totalNo1Drill": 0,
  "totalNo1Kick": 0,
  "totalNo1Pull": 0
}

CRITICAL RULES - Follow exactly:

1. STROKE ABBREVIATIONS:
   - "FC" or "Front Crawl" = Front Crawl
   - "BK" or "Back" or "Backstroke" = Backstroke
   - "BR" or "Breast" or "Breaststroke" = Breaststroke
   - "Fly" or "FLY" or "Butterfly" = Butterfly
   - "IM" = Individual Medley
   - "No1" or "Best Stroke" = Swimmer's best stroke

2. MULTIPLICATION:
   - "4 x 100m" = 4 repetitions × 100m each = 400m TOTAL
   - "8 x 50m" = 8 repetitions × 50m each = 400m TOTAL

3. BREAKDOWN FORMAT (CRITICAL):
   - "as 25m X / 25m Y / 50m Z" describes subdivisions WITHIN EACH single repeat
   - Example: "4 x 100m FC as 25m Kick / 25m Drill / 50m Swim"
     * Each of the 4 repeats contains: 25m Kick + 25m Drill + 50m Swim
     * TOTAL = 100m Kick + 100m Drill + 200m Swim (NOT 400m + 400m + 800m!)
   - Example: "2 x 100m BR as 25m Kick / 75m Swim"
     * Each of the 2 repeats contains: 25m Kick + 75m Swim
     * TOTAL = 50m Kick + 150m Swim

4. SLASH STROKE PATTERNS:
   - "FC/BK Swim" = split distance evenly between strokes
   - Example: "4 x 100m FC/BK Swim" = 200m FC Swim + 200m BK Swim

5. POSITION MODIFIERS (CRITICAL):
   - "Fly Kick on Back" = Butterfly Kick (NOT Backstroke)
   - "BR Kick on Back" = Breaststroke Kick (NOT Backstroke)
   - "on Back" or "on Front" describes POSITION only, not the stroke
   - The stroke mentioned BEFORE "on Back/Front" is the actual stroke

6. ACTIVITY DETECTION:
   - "Streamline Kick" = Kick activity (streamline is just a modifier)
   - "BR Arms + Fly Kick" = Drill activity (combination drills are always Drill)
   - "2 Kicks + 1 Pull" = Drill activity
   - "Catch Switch", "Doggy Paddle", "12/1/12", "Scull", "Fingertip Drag", "6 Kick Drill", "Zipper", "Single Arm" = all Drill activity
   - If activity not specified, default to "Swim"

7. IGNORE THESE:
   - Equipment: (Fins), (Snorkel), (Paddles), (Pull Buoy), etc. - don't affect distance
   - Rest intervals: @1:30, @+10 secs rest, etc. - don't affect distance
   - "AS" keyword - often appears before descriptions, just ignore it
   - Section headers in [brackets] - just labels, no distance

8. ODD/EVEN LANES:
   - "ODD lanes do X // EVEN lanes do Y" = all swimmers do same TOTAL distance
   - Split activities evenly between the two variations
   - Example: "12 x 25m as ODD BR Arms + Fly Kick // EVEN BR Arms + FC Kick" = 300m BR Drill total

9. NESTED PATTERNS:
   - "6 x 25m as 3 x ( Y <> EVF ) / 1 x BR Arm Pull" 
   - Parse the total distance (6 x 25m = 150m) and classify as Drill

10. VALIDATION:
    - All distances MUST be multiples of 25m or 50m (pool lengths)
    - Sum of all stroke/activity distances should make logical sense
    - Total distance = sum of all individual stroke/activity totals

Return ONLY valid JSON with exact field names above. No explanation, no commentary.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Empty response from AI');
    }

    const result = JSON.parse(content);

    // Calculate totalDistance from all components
    const totalDistance =
      result.totalFrontCrawlSwim +
      result.totalFrontCrawlDrill +
      result.totalFrontCrawlKick +
      result.totalFrontCrawlPull +
      result.totalBackstrokeSwim +
      result.totalBackstrokeDrill +
      result.totalBackstrokeKick +
      result.totalBackstrokePull +
      result.totalBreaststrokeSwim +
      result.totalBreaststrokeDrill +
      result.totalBreaststrokeKick +
      result.totalBreaststrokePull +
      result.totalButterflySwim +
      result.totalButterflyDrill +
      result.totalButterflyKick +
      result.totalButterflyPull +
      result.totalIMSwim +
      result.totalIMDrill +
      result.totalIMKick +
      result.totalIMPull +
      result.totalNo1Swim +
      result.totalNo1Drill +
      result.totalNo1Kick +
      result.totalNo1Pull;

    result.totalDistance = totalDistance;

    return result as SessionDistances;
  } catch (error) {
    console.error('AI parsing error:', error);
    throw new Error(`AI parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDistances(distances: SessionDistances): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check all required fields exist and are non-negative
  const requiredFields: (keyof SessionDistances)[] = [
    'totalFrontCrawlSwim',
    'totalFrontCrawlDrill',
    'totalFrontCrawlKick',
    'totalFrontCrawlPull',
    'totalBackstrokeSwim',
    'totalBackstrokeDrill',
    'totalBackstrokeKick',
    'totalBackstrokePull',
    'totalBreaststrokeSwim',
    'totalBreaststrokeDrill',
    'totalBreaststrokeKick',
    'totalBreaststrokePull',
    'totalButterflySwim',
    'totalButterflyDrill',
    'totalButterflyKick',
    'totalButterflyPull',
    'totalIMSwim',
    'totalIMDrill',
    'totalIMKick',
    'totalIMPull',
    'totalNo1Swim',
    'totalNo1Drill',
    'totalNo1Kick',
    'totalNo1Pull',
    'totalDistance',
  ];

  for (const field of requiredFields) {
    const value = distances[field];
    if (typeof value !== 'number') {
      errors.push(`Missing or invalid field: ${field}`);
    } else if (value < 0) {
      errors.push(`Negative value for ${field}: ${value}`);
    } else if (!Number.isInteger(value)) {
      errors.push(`Non-integer value for ${field}: ${value}`);
    }
  }

  // Verify sum matches totalDistance (with small tolerance for floating point)
  const sum =
    distances.totalFrontCrawlSwim +
    distances.totalFrontCrawlDrill +
    distances.totalFrontCrawlKick +
    distances.totalFrontCrawlPull +
    distances.totalBackstrokeSwim +
    distances.totalBackstrokeDrill +
    distances.totalBackstrokeKick +
    distances.totalBackstrokePull +
    distances.totalBreaststrokeSwim +
    distances.totalBreaststrokeDrill +
    distances.totalBreaststrokeKick +
    distances.totalBreaststrokePull +
    distances.totalButterflySwim +
    distances.totalButterflyDrill +
    distances.totalButterflyKick +
    distances.totalButterflyPull +
    distances.totalIMSwim +
    distances.totalIMDrill +
    distances.totalIMKick +
    distances.totalIMPull +
    distances.totalNo1Swim +
    distances.totalNo1Drill +
    distances.totalNo1Kick +
    distances.totalNo1Pull;

  if (Math.abs(sum - distances.totalDistance) > 1) {
    errors.push(
      `Sum mismatch: individual totals sum to ${sum}m but totalDistance is ${distances.totalDistance}m`
    );
  }

  // Check total is multiple of 25m (swimming pools are 25m or 50m)
  // Allow small tolerance for edge cases, but flag if clearly wrong
  const remainder = distances.totalDistance % 25;
  if (remainder !== 0) {
    if (remainder > 5 && remainder < 20) {
      // Clearly not a multiple of 25m
      errors.push(
        `Total distance ${distances.totalDistance}m is not a multiple of 25m (swimming pool length). This suggests parsing errors.`
      );
    } else {
      // Close to a multiple, might be rounding
      warnings.push(
        `Total distance ${distances.totalDistance}m is not exactly a multiple of 25m (remainder: ${remainder}m)`
      );
    }
  }

  // Check for unreasonably large distances (likely parsing error)
  if (distances.totalDistance > 20000) {
    warnings.push(
      `Total distance ${distances.totalDistance}m seems unusually high. Please verify.`
    );
  }

  // Check for zero distance (likely parsing failure)
  if (distances.totalDistance === 0) {
    errors.push('Total distance is 0m - no session data parsed');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
