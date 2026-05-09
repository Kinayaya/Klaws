#!/usr/bin/env node

const { execSync } = require('node:child_process');

const PARTITIONS = {
  A: new Set(['data.js', 'storage.js', 'init.js']),
  B: new Set(['level.js', 'map-logic.js', 'form.js']),
};

function getChangedFiles() {
  const base = process.env.GITHUB_BASE_REF;
  if (base) {
    try {
      execSync(`git fetch --no-tags --depth=1 origin ${base}`, { stdio: 'ignore' });
    } catch {
      // Keep this check best-effort and non-blocking.
    }

    const diffRange = `origin/${base}...HEAD`;
    const output = execSync(`git diff --name-only ${diffRange}`, { encoding: 'utf8' });
    return output.split('\n').map((line) => line.trim()).filter(Boolean);
  }

  const output = execSync('git diff --name-only HEAD~1..HEAD', { encoding: 'utf8' });
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}

function detectTouchedPartitions(files) {
  const touched = new Set();
  for (const file of files) {
    if (PARTITIONS.A.has(file)) touched.add('A');
    if (PARTITIONS.B.has(file)) touched.add('B');
  }
  return [...touched];
}

function main() {
  let files = [];
  try {
    files = getChangedFiles();
  } catch (error) {
    console.log('::warning::Unable to detect changed files for partition check.');
    console.log(`::notice::${error.message}`);
    process.exit(0);
  }

  const touched = detectTouchedPartitions(files);

  if (touched.length > 1) {
    console.log(`::warning::Cross-partition core changes detected (${touched.join(', ')}).`);
    console.log('::notice::Split cross-partition work into multiple PRs when possible.');
    return;
  }

  console.log('Partition boundary check passed (single or no core partition touched).');
}

main();
