/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runCommandsUnitTests } from './unit/commands.test';
import { runTimelineUnitTests } from './unit/timeline.test';
import { runColorUnitTests } from './unit/color.test';
import { runAudioUnitTests } from './unit/audio.test';
import { runShortcutsUnitTests } from './unit/shortcuts.test';
import { runProjectSerializationUnitTests } from './unit/projectSerialization.test';
import { runE2EStressProjectIntegrationTests } from './integration/e2eStressProject.test';

async function main() {
  console.log('====================================================');
  console.log('       VeeCut NLE Professional Test Suite           ');
  console.log('====================================================\n');

  const startTime = Date.now();

  const suites: { name: string; runner: () => Promise<{ name: string; passed: boolean; details?: string }[]> | { name: string; passed: boolean; details?: string }[] }[] = [
    { name: '1. Editing Commands & Undo/Redo Engine', runner: runCommandsUnitTests },
    { name: '2. Timeline Operations, Collision & Snapping', runner: runTimelineUnitTests },
    { name: '3. Color Science, HSL, Color Wheels & LUTs', runner: runColorUnitTests },
    { name: '4. Audio Engine Calculations & Panning Laws', runner: runAudioUnitTests },
    { name: '5. Keyboard Shortcuts & NLE Presets', runner: runShortcutsUnitTests },
    { name: '6. Project Serialization & Migration', runner: runProjectSerializationUnitTests },
    { name: '7. Section 116 End-to-End Stress Test Project', runner: runE2EStressProjectIntegrationTests },
  ];

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const failureDetails: string[] = [];

  for (const suite of suites) {
    console.log(`\n--- [SUITE] ${suite.name} ---`);
    const results = await suite.runner();

    for (const r of results) {
      totalTests++;
      if (r.passed) {
        totalPassed++;
        console.log(`  ✓ PASS: ${r.name}`);
      } else {
        totalFailed++;
        console.error(`  ✗ FAIL: ${r.name}`);
        if (r.details) {
          console.error(`     -> Error: ${r.details}`);
          failureDetails.push(`${r.name}: ${r.details}`);
        }
      }
    }
  }

  const durationMs = Date.now() - startTime;

  console.log('\n====================================================');
  console.log(`Total Tests Run: ${totalTests}`);
  console.log(`Passed:         ${totalPassed}`);
  console.log(`Failed:         ${totalFailed}`);
  console.log(`Elapsed Time:   ${durationMs}ms`);
  console.log('====================================================\n');

  if (totalFailed > 0) {
    console.error(`❌ Test Suite FAILED with ${totalFailed} failure(s):`);
    failureDetails.forEach((f) => console.error(` - ${f}`));
    process.exit(1);
  } else {
    console.log(' All VeeCut NLE Professional Tests PASSED successfully!\n');
    process.exit(0);
  }
}

main().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
