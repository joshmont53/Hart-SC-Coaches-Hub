import { readFileSync } from 'fs';

const API_URL = 'http://localhost:5000';

interface ExpectedResults {
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

const EXPECTED_SESSION_1: ExpectedResults = {
  totalFrontCrawlSwim: 1950,
  totalFrontCrawlDrill: 100,
  totalFrontCrawlKick: 600,
  totalFrontCrawlPull: 0,
  totalBackstrokeSwim: 450,
  totalBackstrokeDrill: 0,
  totalBackstrokeKick: 0,
  totalBackstrokePull: 0,
  totalBreaststrokeSwim: 350,
  totalBreaststrokeDrill: 0,
  totalBreaststrokeKick: 0,
  totalBreaststrokePull: 0,
  totalButterflySwim: 150,
  totalButterflyDrill: 0,
  totalButterflyKick: 0,
  totalButterflyPull: 0,
  totalIMSwim: 300,
  totalIMDrill: 0,
  totalIMKick: 0,
  totalIMPull: 0,
  totalNo1Swim: 0,
  totalNo1Drill: 0,
  totalNo1Kick: 100,
  totalNo1Pull: 0,
  totalDistance: 4000,
};

const EXPECTED_SESSION_2: ExpectedResults = {
  totalFrontCrawlSwim: 925,
  totalFrontCrawlDrill: 0,
  totalFrontCrawlKick: 0,
  totalFrontCrawlPull: 0,
  totalBackstrokeSwim: 325,
  totalBackstrokeDrill: 0,
  totalBackstrokeKick: 0,
  totalBackstrokePull: 0,
  totalBreaststrokeSwim: 225,
  totalBreaststrokeDrill: 0,
  totalBreaststrokeKick: 0,
  totalBreaststrokePull: 0,
  totalButterflySwim: 200,
  totalButterflyDrill: 0,
  totalButterflyKick: 0,
  totalButterflyPull: 0,
  totalIMSwim: 150,
  totalIMDrill: 0,
  totalIMKick: 0,
  totalIMPull: 0,
  totalNo1Swim: 2100,
  totalNo1Drill: 0,
  totalNo1Kick: 0,
  totalNo1Pull: 0,
  totalDistance: 3925,
};

const EXPECTED_SESSION_3: ExpectedResults = {
  totalFrontCrawlSwim: 2050,
  totalFrontCrawlDrill: 0,
  totalFrontCrawlKick: 0,
  totalFrontCrawlPull: 500,
  totalBackstrokeSwim: 350,
  totalBackstrokeDrill: 0,
  totalBackstrokeKick: 0,
  totalBackstrokePull: 100,
  totalBreaststrokeSwim: 50,
  totalBreaststrokeDrill: 0,
  totalBreaststrokeKick: 100,
  totalBreaststrokePull: 0,
  totalButterflySwim: 50,
  totalButterflyDrill: 0,
  totalButterflyKick: 500,
  totalButterflyPull: 0,
  totalIMSwim: 0,
  totalIMDrill: 0,
  totalIMKick: 0,
  totalIMPull: 0,
  totalNo1Swim: 1300,
  totalNo1Drill: 400,
  totalNo1Kick: 800,
  totalNo1Pull: 0,
  totalDistance: 6200,
};

async function testSession(sessionNum: number, sessionContent: string, expected: ExpectedResults) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`SESSION ${sessionNum} - GPT PARSING TEST`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    const response = await fetch(`${API_URL}/api/sessions/parse-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionContent }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();

    console.log('📊 RESULTS COMPARISON:\n');
    console.log('Field                         | Expected | Actual   | Match | Difference');
    console.log('-'.repeat(80));

    let totalErrors = 0;
    const fields: (keyof ExpectedResults)[] = [
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

    for (const field of fields) {
      const expectedVal = expected[field];
      const actualVal = result[field] || 0;
      const match = expectedVal === actualVal;
      const diff = actualVal - expectedVal;

      if (!match) totalErrors++;

      const matchIcon = match ? '✅' : '❌';
      const diffStr = diff === 0 ? '    0' : (diff > 0 ? `+${diff}`.padStart(5) : `${diff}`.padStart(5));
      
      console.log(
        `${field.padEnd(29)} | ${String(expectedVal).padStart(8)} | ${String(actualVal).padStart(8)} | ${matchIcon} | ${diffStr}m`
      );
    }

    console.log('-'.repeat(80));
    
    const accuracy = ((fields.length - totalErrors) / fields.length) * 100;
    console.log(`\n🎯 ACCURACY: ${accuracy.toFixed(1)}% (${fields.length - totalErrors}/${fields.length} fields correct)`);
    
    if (totalErrors === 0) {
      console.log('✅ PERFECT MATCH!');
    } else {
      console.log(`❌ ${totalErrors} field(s) with discrepancies`);
    }

  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

async function main() {
  console.log('\n🏊 GPT DISTANCE PARSER - COMPREHENSIVE TEST SUITE\n');
  
  const session1Content = readFileSync('/tmp/test_session1.txt', 'utf-8');
  const session2Content = readFileSync('/tmp/test_session2.txt', 'utf-8');
  const session3Content = readFileSync('/tmp/test_session3.txt', 'utf-8');

  await testSession(1, session1Content, EXPECTED_SESSION_1);
  await testSession(2, session2Content, EXPECTED_SESSION_2);
  await testSession(3, session3Content, EXPECTED_SESSION_3);

  console.log(`\n${'='.repeat(80)}`);
  console.log('TEST SUITE COMPLETE');
  console.log(`${'='.repeat(80)}\n`);
}

main();
