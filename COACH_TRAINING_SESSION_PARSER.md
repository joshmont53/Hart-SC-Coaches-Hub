# Swimming Session Parser - Coach Training Guide

## Overview

The SwimCoach app automatically calculates distance totals from your session text using pattern recognition. This guide explains how to write sessions that parse accurately.

---

## ✅ What Works Well

### Basic Session Formats

The parser handles standard swimming notation very effectively:

```
✅ 4 x 100m FC Swim
✅ 8 x 50m BK Kick
✅ 2 x 200m BR Pull
✅ 16 x 25m Fly Drill
```

### Supported Abbreviations

**Strokes:**
- `FC` or `Front Crawl` → Front Crawl
- `BK` or `Back` or `Backstroke` → Backstroke  
- `BR` or `Breast` or `Breaststroke` → Breaststroke
- `Fly` or `Butterfly` → Butterfly
- `IM` → Individual Medley
- `No1` or `Best Stroke` → Swimmer's best stroke

**Activities:**
- `Swim` → Swim activity (default if not specified)
- `Kick` → Kick activity
- `Pull` → Pull activity
- `Drill` → Drill activity

### Equipment & Rest Intervals

Equipment notes and rest intervals are **ignored** by the parser (which is good!):

```
✅ 4 x 100m FC Swim (Fins + Snorkel) @1:30
✅ 8 x 50m BK Kick @+10 secs rest
✅ 2 x 200m BR Pull (Paddles) @LIFO_BY_LANE
```

The parser focuses only on: **repetitions × distance × stroke × activity**

---

## 🎯 Advanced Patterns That Work

### 1. Breakdown Format (Subdivisions)

When you want to break down each repeat into parts:

```
✅ 4 x 100m FC as 25m Kick / 25m Drill / 25m Pull / 25m Swim
```

**How it calculates:**
- Each of the 4 repeats contains: 25m Kick + 25m Drill + 25m Pull + 25m Swim
- Total: 100m Kick, 100m Drill, 100m Pull, 100m Swim (400m total)

**Important:** The breakdown describes what happens in **each single 100m**, not what happens across all 4 repeats.

### 2. Multiple Strokes (Slash Pattern)

```
✅ 4 x 100m FC/BK Swim
```

**How it calculates:**
- Splits distance evenly: 200m FC Swim + 200m BK Swim (400m total)

### 3. Named Drills

The parser recognizes specific drill names:

```
✅ 4 x 100m FC as 25m Catch Switch
✅ 4 x 50m FC as 25m Doggy Paddle
✅ 8 x 25m FC 12/1/12 Drill
✅ 4 x 100m FC as 25m Scull
✅ 6 x 50m FC Fingertip Drag
✅ 4 x 100m FC as 25m 6 Kick Drill
✅ 8 x 25m FC Zipper
✅ 4 x 100m FC Single Arm
```

**Note:** Drill names with slashes (like "12/1/12") are preserved correctly.

### 4. Combination Drills

```
✅ 4 x 100m BR as 25m BR Arms + Fly Kick
✅ 6 x 50m as 25m 2 Kicks + 1 Pull
✅ 8 x 25m FC Arms + Flutter Kick
```

These are automatically classified as **Drill** activity.

### 5. Position Modifiers

```
✅ 8 x 50m Fly Kick on Back
✅ 6 x 25m BR Kick on Back
```

The parser correctly identifies these as **Fly Kick** and **BR Kick** (not Backstroke), with "on Back" treated as a position modifier.

### 6. Streamline Modifier

```
✅ 4 x 100m FC as 25m Streamline Kick
```

"Streamline" is treated as a modifier, so this correctly becomes **FC Kick** (not Drill).

---

## ⚠️ Known Limitations & Workarounds

### 1. Complex Drill Names in Breakdowns

**Problem:** Some drill descriptions may not be recognized:

```
❌ 6 x 25m Front <> EVF Alternate Position (3 sec pause) + Snorkel Only
```

**Why:** "Front <> EVF Alternate Position" isn't in the drill keyword list.

**Workaround:** Simplify drill names or add explicit activity:

```
✅ 6 x 25m BR Front EVF Drill
✅ 6 x 25m BR Drill (Front to EVF position)
```

### 2. Multi-Activity Breakdowns Without Clear Distance

**Problem:** When activities are described without explicit distances:

```
❌ 4 x 100m as Kick / Drill / Swim (no distances given)
```

**Why:** Parser can't determine how much distance to allocate to each activity.

**Workaround:** Always specify distances in breakdowns:

```
✅ 4 x 100m as 25m Kick / 50m Drill / 25m Swim
✅ 4 x 100m as 25/50/25 Kick/Drill/Swim
```

### 3. Implicit Activities

**Problem:** When activity isn't explicitly stated:

```
⚠️ 4 x 100m FC (could be Swim, Pull, Kick, or Drill)
```

**What happens:** Defaults to **Swim** activity.

**Best practice:** Always state the activity explicitly:

```
✅ 4 x 100m FC Swim
✅ 4 x 100m FC Kick
✅ 4 x 100m FC Pull
```

### 4. Odd Distance Allocations

**Problem:** Non-standard breakdowns:

```
❌ 4 x 100m as 20m Kick / 30m Drill / 50m Swim
```

**Why:** Adds up to 100m, but creates odd totals (80m Kick, 120m Drill, 200m Swim).

**Note:** This will parse correctly, but creates distances that aren't multiples of 25m.

**Best practice:** Use 25m or 50m increments:

```
✅ 4 x 100m as 25m Kick / 25m Drill / 50m Swim
```

### 5. Unconventional Notation

**Problem:** Non-standard formats:

```
❌ Swim 4 times 100 meters freestyle
❌ 100m x 4 FC
❌ Four one hundreds FC
```

**Why:** Parser expects the standard format: `[reps] x [distance]m [stroke] [activity]`

**Best practice:** Always use standard notation:

```
✅ 4 x 100m FC Swim
```

---

## 🔍 Example: Analyzing a Problematic Session

**Session ID: e479b80d-0c46-4622-ad92-6aa6c7911845**

**Calculated Total: 3,224m**  
**Expected Total: 3,400m**  
**Difference: 176m (not a multiple of 25m - red flag!)**

### What Went Wrong?

Looking at the session text, here are the likely issues:

```
6 x 25m Front <> EVF Alternate Position (3 sec pause) + Snorkel Only
```
- "Front <> EVF Alternate Position" isn't recognized as a drill
- Parser may have skipped or misclassified this

```
6 x 25m as 3 x ( Y <> EVF ) / 1 x BR Arm Pull + FC Kick (Fins)
```
- Complex nested format: "3 x ( Y <> EVF )" inside a "6 x 25m"
- Parser doesn't handle nested multipliers
- "Y <> EVF" isn't a recognized drill name

```
12 x 25m as BR Drills (Fins) @+10 secs rest as ODD BR Arms + Fly Kick // EVEN BR Arms + FC Kick
```
- "ODD" and "EVEN" lane assignments aren't supported
- Parser can't split different activities for different lanes

### How to Fix

**Option 1:** Simplify drill names:

```
✅ 6 x 25m BR Drill (Front to EVF)
✅ 6 x 25m BR Drill (Y to EVF)
✅ 12 x 25m BR Drill (Arms + Kick variations)
```

**Option 2:** Break into separate lines:

```
✅ 6 x 25m BR Arms + Fly Kick
✅ 6 x 25m BR Arms + FC Kick
```

---

## 📋 Quick Checklist

Before saving your session, verify:

- ✅ All lines use standard format: `[reps] x [distance]m [stroke] [activity]`
- ✅ Breakdowns specify exact distances: `as 25m X / 25m Y / 50m Z`
- ✅ Activities are explicit: Swim, Kick, Pull, or Drill
- ✅ Drill names are simple and recognized
- ✅ No nested multipliers (e.g., "3 x (4 x 25m)")
- ✅ Total distance is a multiple of 25m (for Short Course) or 50m (for Long Course)

---

## 💡 Pro Tips

1. **Keep it simple:** Standard notation parses best
2. **Be explicit:** State stroke and activity clearly
3. **Use recognized drills:** Stick to common drill names when possible
4. **Test as you go:** Check the calculated totals before saving
5. **Verify multiples:** Final total should be divisible by pool length (25m or 50m)

---

## 🆘 When to Report Issues

If you follow all these guidelines and the totals are still incorrect, please note:
- The session ID
- What you expected vs. what was calculated
- The specific lines that seem to be parsing incorrectly

This helps improve the parser for everyone!
