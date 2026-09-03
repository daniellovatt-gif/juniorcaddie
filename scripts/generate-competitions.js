#!/usr/bin/env node
// Regenerates the <div class="comps-grid"> contents of competitions.html from Supabase
// staging, leaving everything else in the file (headers, banners, nav, scripts) untouched.
// Writes to competitions.generated.html — never overwrites the real file.
//
// Usage:
//   npm install
//   cp .env.example .env   # then fill in SUPABASE_SERVICE_ROLE_KEY
//   node scripts/generate-competitions.js

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env — see .env.example.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const SITE_HTML_PATH = path.join(__dirname, '..', 'competitions.html');
const OUTPUT_PATH = path.join(__dirname, '..', 'competitions.generated.html');

// These 5 cards are "tour hub" signpost cards, not standard single-competition cards —
// each carries hand-written extra content (a "remaining dates" box, an application-form
// download link, etc. — see e.g. the Futures Tour / iTour cards) that has no column in the
// `competitions` table and isn't reconstructible from the DB. Rather than silently dropping
// that content (as the first version of this script did — caught in the full-file diff
// review), copy each one through verbatim from the current live competitions.html, in its
// correct sort_order position among the generated cards for its county. Revisit this list
// if the schema ever grows a way to store this extra content properly.
const COPY_VERBATIM_SLUGS = new Set([
  'herts-hertfordshire-futures-tour-2026',
  'herts-hertfordshire-itour-2026',
  'wales-ping-welsh-junior-tour',
  'wales-wales-mini-masters-2026',
  'pingjgt-ping-jgt-rookies-tour-9-hole',
]);

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function escapeHtml(str) {
  if (str == null) return '';
  // Deliberately does NOT escape '&'. The site's established convention (documented in
  // CLAUDE.md §6) is literal bare ampersands throughout — e.g. "Boys & Girls" — with ~601
  // instances already in the live file. Escaping them to &amp; is a real change nobody
  // asked for, not a correctness fix. Still escape the genuinely structural/unsafe
  // characters so a stray '<' or '"' in source data can't break the markup.
  return String(str)
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(dateStr) {
  // dateStr is 'YYYY-MM-DD'. Parse as UTC to avoid local-timezone off-by-one.
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const weekday = WEEKDAYS[dt.getUTCDay()];
  const month = MONTHS[dt.getUTCMonth()];
  return `${weekday} ${dt.getUTCDate()} ${month} ${y}`;
}

// Past status is decided purely by comparing event_date to today — nothing else.
// date_badge_text (below) controls the badge's displayed *text* only; it must never affect
// whether a card is treated as past, so this class of bug (a card whose badge text happens
// to already say "Past ..." skipping the real past-detection) can't recur. Verbatim-copied
// cards (COPY_VERBATIM_SLUGS) never call this — they're copied through untouched.
function isPast(row, today) {
  // "Coming soon to JuniorCaddie" is a pure "we don't have this yet" placeholder, not a
  // date estimate — unlike "Early April 2026" or "Season series", it never claimed to know
  // when the event is, so it's exempt from past-detection entirely regardless of
  // event_date. Every other date_badge_text value keeps using event_date-driven
  // past-detection as normal (see decoupling note above).
  if (row.date_badge_text === 'Coming soon to JuniorCaddie') return false;
  return !!row.event_date && new Date(`${row.event_date}T00:00:00Z`) < today;
}

function buildStageBadge(row) {
  const text = row.stage_badge_text || `Stage ${row.stage ?? '?'}`;
  const styleAttr = row.stage_badge_style ? ` style="${escapeHtml(row.stage_badge_style)}"` : '';
  return `<span class="stage-badge"${styleAttr}>${escapeHtml(text)}</span>`;
}

// The text to show in the badge — date_badge_text overrides the formatted date when
// present (e.g. "Season series", "Early April 2026"), but this is ONLY about which words
// appear. Whether "Past" styling wraps around those words is decided separately, by `past`.
function dateBadgeContent(row) {
  if (row.date_badge_text) return row.date_badge_text;
  if (!row.event_date) return 'TBC';
  return formatDate(row.event_date);
}

function buildDateBadge(row, past) {
  const text = escapeHtml(dateBadgeContent(row));
  if (past) {
    return `<div class="comp-date"><span class="date-badge past-badge">Past</span> ${text}</div>`;
  }
  return `<div class="comp-date"><span class="date-badge">${text}</span></div>`;
}

function buildTags(row) {
  const tags = Array.isArray(row.tags_v2) ? row.tags_v2 : [];
  return tags
    .map((t) => {
      const cls = t.variant === 'oom' ? 'tag oom' : 'tag';
      return `<span class="${cls}">${escapeHtml(t.label)}</span>`;
    })
    .join('');
}

function buildLink(row) {
  if (row.link_status === 'live' && row.link_tier === 'enter') {
    return `<a href="${escapeHtml(row.entry_url)}" target="_blank" rel="noopener" class="comp-enter">${escapeHtml(row.link_label || 'Enter ↗')}</a>`;
  }
  if (row.link_status === 'live' && row.link_tier === 'club_site') {
    return `<a href="${escapeHtml(row.entry_url)}" target="_blank" rel="noopener" class="comp-enter club-site">${escapeHtml(row.link_label || 'Club Website ↗')}</a>`;
  }
  if (row.link_status === 'closed') {
    // Entry closed keeps its real href + target/rel, just disabled styling.
    return `<a href="${escapeHtml(row.entry_url)}" target="_blank" rel="noopener" class="comp-enter disabled">${escapeHtml(row.link_label || 'Entry closed')}</a>`;
  }
  // coming_soon (or any unexpected state — fail safe to the honest placeholder,
  // never a guessed link, per CLAUDE.md §2 rule 1)
  return `<a href="#" class="comp-enter disabled">Link coming soon</a>`;
}

function buildCard(row, today) {
  const past = isPast(row, today);
  const cardClass = past ? 'comp-card past' : 'comp-card';
  const championshipAttr = row.is_championship ? ' data-championship="true"' : '';

  const lines = [
    `      <div class="${cardClass}" data-county="${escapeHtml(row.county)}" data-date="${row.event_date || ''}"${championshipAttr} data-slug="${escapeHtml(row.slug)}">`,
    `        ${buildStageBadge(row)}`,
    `        ${buildDateBadge(row, past)}`,
    `        <div class="comp-name">${escapeHtml(row.name)}</div>`,
    `        <div class="comp-venue">${escapeHtml(row.venue)}</div>`,
    `        <div class="comp-tags">${buildTags(row)}</div>`,
    `        ${buildLink(row)}`,
  ];

  // Verified against all 76 current .past cards: the report-issue button is
  // systematically omitted once a card is past (0/76 have it). Only add it
  // for live/upcoming cards.
  if (!past) {
    lines.push(
      ``,
      `        <button type="button" class="report-issue-link" data-slug="${escapeHtml(row.slug)}" data-county="${escapeHtml(row.county)}" onclick="openReportModal(this)">Spot an error? Tell us →</button>`
    );
  }

  lines.push(`      </div>`);
  return lines.join('\n');
}

// Extracts one existing <div class="comp-card"...>...</div> block verbatim from source
// HTML, by its data-slug, tracking div depth to find the true matching close (same
// defensive-parsing rationale as findGridSpan below). Used only for COPY_VERBATIM_SLUGS.
function extractExistingCard(sourceHtml, slug) {
  const marker = `data-slug="${slug}"`;
  const markerIdx = sourceHtml.indexOf(marker);
  if (markerIdx === -1) return null;

  let tagStart = sourceHtml.lastIndexOf('<div class="comp-card', markerIdx);
  if (tagStart === -1) return null;
  // Include the tag's own leading indentation (spaces/tabs on its line before '<'),
  // not just the tag itself — otherwise the copied card loses its indent on that one
  // line while every other line in the block keeps its original whitespace.
  while (tagStart > 0 && (sourceHtml[tagStart - 1] === ' ' || sourceHtml[tagStart - 1] === '\t')) {
    tagStart -= 1;
  }
  const openTagClose = sourceHtml.indexOf('>', markerIdx);
  if (openTagClose === -1) return null;

  let depth = 1;
  let i = openTagClose + 1;
  while (depth > 0) {
    const nextOpen = sourceHtml.indexOf('<div', i);
    const nextClose = sourceHtml.indexOf('</div>', i);
    if (nextClose === -1) return null; // malformed — bail rather than guess
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      i = nextClose + 6;
    }
  }
  return sourceHtml.slice(tagStart, i);
}

// Finds the full span of a `.comps-grid` div (from its opening tag through its true
// matching closing tag), tracking div depth rather than assuming the first `</div>`
// found is the right one (per CLAUDE.md §12: parse defensively, don't assume structure).
function findGridSpan(html, county) {
  const openTagRe = new RegExp(`<div class="comps-grid" id="grid-${county}">`);
  const match = openTagRe.exec(html);
  if (!match) return null;

  const contentStart = match.index + match[0].length;
  let depth = 1;
  let i = contentStart;
  const divOpenRe = /<div\b/g;
  const divCloseRe = /<\/div>/g;

  while (depth > 0 && i < html.length) {
    const nextOpen = html.indexOf('<div', i);
    const nextClose = html.indexOf('</div>', i);
    if (nextClose === -1) return null; // malformed — bail rather than guess
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
    } else {
      depth -= 1;
      i = nextClose + 6;
      if (depth === 0) {
        return { contentStart, contentEnd: nextClose, tagStart: match.index, tagEnd: contentStart };
      }
    }
  }
  return null;
}

async function main() {
  console.log(`Fetching all rows from ${SUPABASE_URL} ...`);
  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .order('county', { ascending: true })
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('event_date', { ascending: true });

  if (error) {
    console.error('Supabase query failed:', error);
    process.exit(1);
  }

  console.log(`Fetched ${data.length} rows.`);

  const byCounty = new Map();
  for (const row of data) {
    if (!byCounty.has(row.county)) byCounty.set(row.county, []);
    byCounty.get(row.county).push(row);
  }

  // Kept pristine and never mutated — extractExistingCard always reads from this, not from
  // the progressively-rewritten `html` below, so copy-verbatim cards are unaffected by
  // which order counties happen to be processed in.
  const originalHtml = fs.readFileSync(SITE_HTML_PATH, 'utf8');
  let html = originalHtml;
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');

  const missingGrids = [];
  const replacedCounties = [];
  const copiedVerbatim = [];
  const copyVerbatimNotFound = [];

  for (const [county, rows] of byCounty.entries()) {
    const span = findGridSpan(html, county);
    if (!span) {
      missingGrids.push(county);
      continue;
    }
    const cardBlocks = rows.map((r) => {
      if (COPY_VERBATIM_SLUGS.has(r.slug)) {
        const existing = extractExistingCard(originalHtml, r.slug);
        if (existing) {
          copiedVerbatim.push(r.slug);
          return existing;
        }
        copyVerbatimNotFound.push(r.slug);
        console.warn(`WARNING: "${r.slug}" is in COPY_VERBATIM_SLUGS but wasn't found in competitions.html — falling back to a generated card, which will be missing its hand-written extra content.`);
      }
      return buildCard(r, today);
    });
    const cardsHtml = '\n\n' + cardBlocks.join('\n\n') + '\n\n    ';
    html = html.slice(0, span.contentStart) + cardsHtml + html.slice(span.contentEnd);
    replacedCounties.push(county);
  }

  fs.writeFileSync(OUTPUT_PATH, html, 'utf8');

  console.log(`\nWrote ${OUTPUT_PATH}`);
  console.log(`Replaced grids for ${replacedCounties.length} counties: ${replacedCounties.join(', ')}`);
  console.log(`Copied verbatim (unchanged from live file): ${copiedVerbatim.length}/${COPY_VERBATIM_SLUGS.size} — ${copiedVerbatim.join(', ')}`);
  if (copyVerbatimNotFound.length) {
    console.warn(`WARNING: could not find these COPY_VERBATIM_SLUGS in the source file at all: ${copyVerbatimNotFound.join(', ')}`);
  }
  if (missingGrids.length) {
    console.warn(
      `\nWARNING: no matching <div class="comps-grid" id="grid-COUNTY"> found in competitions.html for: ${missingGrids.join(', ')}. ` +
      `Their Supabase rows were NOT written anywhere — investigate before trusting the output.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
