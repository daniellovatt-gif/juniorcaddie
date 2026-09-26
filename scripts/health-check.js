#!/usr/bin/env node
// ============================================================================
// JuniorCaddie -- automated health-check
// ----------------------------------------------------------------------------
// Mirrors the manual "Standard checks (Tier 1)" from CLAUDE.md §7, so they run
// on a schedule instead of only when someone remembers to ask for them.
//
// This is a READ-ONLY check against the committed competitions.html -- it
// never touches Supabase, never writes anything, and never modifies the file.
// A non-zero exit code means "something needs a human look", surfaced by
// GitHub as a failed workflow run (see .github/workflows/health-check.yml).
//
// Usage: node scripts/health-check.js [path-to-competitions.html]
// ============================================================================

const fs = require('fs');
const path = process.argv[2] || 'competitions.html';
const html = fs.readFileSync(path, 'utf8');

let failures = 0;
let warnings = 0;

function fail(msg) {
  console.log(`FAIL: ${msg}`);
  failures++;
}
function warn(msg) {
  console.log(`WARN: ${msg}`);
  warnings++;
}
function ok(msg) {
  console.log(`OK:   ${msg}`);
}

// ---------------------------------------------------------------------------
// 1. Golf Empire links -- must always be zero (CLAUDE.md §2 rule 2)
// ---------------------------------------------------------------------------
const golfEmpireCount = (html.match(/golfempire/gi) || []).length;
if (golfEmpireCount > 0) {
  fail(`${golfEmpireCount} reference(s) to "golfempire" found -- these must never appear on the live site.`);
} else {
  ok('No Golf Empire references.');
}

// ---------------------------------------------------------------------------
// 2. Disabled-link labels -- only "Entry closed" and "Link coming soon" are
//    valid (CLAUDE.md §4). Anything else is an invented third state.
// ---------------------------------------------------------------------------
const disabledLabels = [...html.matchAll(/class="comp-enter disabled">([^<]*)</g)].map(m => m[1].trim());
const labelCounts = {};
for (const label of disabledLabels) labelCounts[label] = (labelCounts[label] || 0) + 1;

const validLabels = new Set(['Entry closed', 'Link coming soon']);
const invalidLabels = Object.keys(labelCounts).filter(l => !validLabels.has(l));

if (invalidLabels.length > 0) {
  for (const label of invalidLabels) {
    fail(`Non-standard disabled-link label "${label}" found ${labelCounts[label]}x -- should be "Entry closed" or "Link coming soon".`);
  }
} else {
  ok(`All ${disabledLabels.length} disabled links use a valid label (Entry closed: ${labelCounts['Entry closed'] || 0}, Link coming soon: ${labelCounts['Link coming soon'] || 0}).`);
}

// ---------------------------------------------------------------------------
// 3. County-count header vs actual card count, per county
// ---------------------------------------------------------------------------
const countyBlocks = [...html.matchAll(/data-county-section="([a-z]+)"[\s\S]*?county-count">(\d+)/g)];
// Fallback pattern in case the header doesn't use a data-county-section marker --
// match each county-count span and the nearest preceding grid's county cards.
const countyCards = {};
for (const m of html.matchAll(/<div class="comp-card( past)?"[^>]*data-county="([a-z]+)"/g)) {
  countyCards[m[2]] = (countyCards[m[2]] || 0) + 1;
}

// Sections aren't all worded "N competitions" -- tour/national sections use
// "N events", some have extra text ("15 UK events + 2 WAGR overseas"). Read
// just the leading number regardless of what follows it.
const headerCounts = [...html.matchAll(/class="county-count">(\d+)/g)];
// This script reports totals rather than trying to pair each header to its
// county by proximity (fragile against markup changes) -- it checks the one
// fact that matters structurally: do the counts sum to the same total as the
// actual card count.
const totalFromCards = Object.values(countyCards).reduce((a, b) => a + b, 0);
const totalFromHeaders = headerCounts.reduce((sum, m) => sum + parseInt(m[1], 10), 0);

if (totalFromHeaders !== totalFromCards) {
  fail(`County-count headers sum to ${totalFromHeaders}, but actual card count is ${totalFromCards} -- at least one county header is out of sync.`);
} else {
  ok(`County-count headers sum to ${totalFromHeaders}, matching the actual card count exactly.`);
}

// ---------------------------------------------------------------------------
// 4. Div balance -- catches a corrupted edit
// ---------------------------------------------------------------------------
const opens = (html.match(/<div/g) || []).length;
const closes = (html.match(/<\/div>/g) || []).length;
if (opens !== closes) {
  fail(`Div balance is off: ${opens} opens vs ${closes} closes.`);
} else {
  ok(`Div balance holds: ${opens}/${opens}.`);
}

// ---------------------------------------------------------------------------
// 5. Total competition count -- informational, cross-checked against the
//    static hero-stat number so a future edit to one doesn't silently drift
//    from the other (CLAUDE.md §9's "keep displayed count in sync" rule).
// ---------------------------------------------------------------------------
const heroStatMatch = html.match(/id="total-count">(\d+)\+?</);
if (heroStatMatch) {
  const heroCount = parseInt(heroStatMatch[1], 10);
  if (heroCount !== totalFromCards) {
    fail(`Hero stat shows "${heroCount}" competitions but the actual count is ${totalFromCards}.`);
  } else {
    ok(`Hero stat (${heroCount}) matches the actual competition count.`);
  }
} else {
  warn('Could not find the hero-stat total-count element to cross-check (markup may have changed).');
}

// ---------------------------------------------------------------------------
// 6. Bare ampersand count -- informational only, per CLAUDE.md §6: the file
//    has an established baseline of literal '&' usage. This isn't a pass/fail
//    check (a bare & is the site's normal convention), just a trend line so
//    a big unexplained jump is visible rather than silent.
// ---------------------------------------------------------------------------
const bareAmpersands = (html.match(/&(?!amp;|#|lt;|gt;|quot;)/g) || []).length;
console.log(`INFO: ${bareAmpersands} bare '&' characters (informational -- this is the site's normal style, not an error).`);

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log('');
console.log(`Summary: ${failures} failure(s), ${warnings} warning(s), out of ${totalFromCards} competitions across ${Object.keys(countyCards).length} counties/sections.`);

if (failures > 0) {
  process.exit(1);
}
