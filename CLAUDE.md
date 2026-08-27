# CLAUDE.md — JuniorCaddie working brief

This file is read automatically at the start of every Claude Code session in this repo.
It encodes how to work on JuniorCaddie safely. Follow it exactly. When it conflicts with a
faster approach, this file wins — the discipline here was learned by getting it wrong.

---

## 1. What this project is

JuniorCaddie (juniorcaddie.co.uk) is a UK junior golf platform — "the home of junior golf in
the UK." Built by Dan Lovatt (golf parent, Hertfordshire) with his son Jacob. Strong
Hertfordshire-first focus before national expansion. Plain HTML/CSS/JS, hosted on Vercel,
deployed from this GitHub repo (`daniellovatt-gif/juniorcaddie`). Backend: Supabase.
Images: Cloudinary. Email capture: Formspree. No build step — the HTML files are the site.

**Domain:** `juniorcaddie.co.uk` only. There is **no www** — never introduce www URLs,
canonicals, or sitemap entries.

---

## 2. Golden rules (do not break these)

1. **Honesty with users is the core value.** Never show a broken or guessed link. If a
   competition's entry page isn't confirmed, use "Link coming soon" (disabled) — a placeholder
   is always better than a wrong or fabricated link. "Coming soon" beats a wrong date.
2. **No Golf Empire links anywhere on the live site.** Golf Empire is a research/discovery
   source only. Never link to `golfempire.co.uk` or its `entryform.php` booking URLs. All live
   links go to the club's own site, the county union page, or the club's intelligentgolf portal.
   - Two intentional exceptions already in the file (do not "fix" them): Tiverton
     (`compid=2088`), Sherwood Forest (`compid=13281`).
3. **Never trust prior data.** ~50% historical error rate in inherited/aggregated data. Every
   link — from an old audit, a previous session, or even one currently live — gets re-verified
   against a live primary source before it is touched or added. Confidence is not a reason to
   skip verification.
4. **Never publish competition data the human hasn't reviewed.** Hand-verification is the moat.
   You make verification cheap; you never make it optional. Propose additions as a diff/branch
   for review — do not auto-commit new competition cards to `main` without sign-off.
5. **The soft gate stays soft.** The competitions email gate is a dismissable popup. A hard/
   undismissable version was tested and explicitly reverted. Do not re-introduce a hard gate.

---

## 3. Repo facts an agent needs

- **Deploy:** push to `main` → Vercel auto-deploys. You have git write access in Claude Code
  (this replaces the old "hand the file to Dan for manual upload" loop). Commit in small,
  reviewable units — ideally one county per commit during a rollover.
- **Fetch a fresh copy before editing** (local copies go stale):
  `curl -s https://raw.githubusercontent.com/daniellovatt-gif/juniorcaddie/main/competitions.html`
- **Check recent history when file state is ambiguous:**
  `https://api.github.com/repos/daniellovatt-gif/juniorcaddie/commits?path=competitions.html&per_page=5`
- **Live pages:** index, competitions, journey, about, marketplace, sell, equipment-reviews,
  golf-formats, summer-camps, rules-card-final, yardage-chart, competition-day-guide,
  ready-to-compete, sitemap.xml, robots.txt.
- **Files NOT in the sitemap** (internal working files — leave out): brand-hybrid.html,
  brand-v2.html, coming-soon.html, logo-concepts-v2.html, soft-gate-demo.html,
  starter-pack.html, rules-cards.html, stableford-guide.html.

---

## 4. competitions.html — the main working file

469KB+, single hand-edited HTML file, ~6,600 lines. Cards are rendered directly as markup
(no data/presentation separation yet — migrating to Supabase `competition_registry` is the
long-term fix). Date-awareness is built in: past cards get a `.past` class and are hidden by
default; the "still to come" count and calendar view compute live from `data-date`.

### Card structure (match this exactly when adding)

```html
<div class="comp-card" data-county="COUNTY" data-date="YYYY-MM-DD" data-slug="COUNTY-slug">
  <span class="stage-badge">Stage 3–4 · Boys & Girls</span>
  <div class="comp-date"><span class="date-badge">Wed 28 October 2026</span></div>
  <div class="comp-name">Event Name</div>
  <div class="comp-venue">Club Name, Town</div>
  <div class="comp-tags"><span class="tag">Individual Strokeplay</span><span class="tag">£XX</span><span class="tag">Boys & Girls</span></div>
  <a href="CLUB_URL" target="_blank" rel="noopener" class="comp-enter">Enter ↗</a>

  <button type="button" class="report-issue-link" data-slug="COUNTY-slug" data-county="COUNTY" onclick="openReportModal(this)">Spot an error? Tell us →</button>
</div>
```

- Every external anchor MUST carry both `target="_blank"` and `rel="noopener"`.
- Past events: add `past` to the card class and prefix the date badge:
  `<span class="date-badge past-badge">Past</span> Sun 22 March 2026`.
- Slugs are `county-kebab-case-name` and must be unique across the whole file.

### Two-tier link classification — never invent a third

- **`class="comp-enter"` → "Enter ↗"** — only when a specific, confirmed entry / open-competition
  page for *that* event is verified.
- **`class="comp-enter club-site"` → "Club Website ↗"** — when only the club's own domain is
  confirmed (homepage or opens page), not the specific event. More honest than a guessed "Enter."
- **`class="comp-enter disabled"` → "Link coming soon"** — genuine gap, real domain not yet found.
- **`class="comp-enter disabled"` → "Entry closed"** — a correct link whose window has passed.
  This is working as intended; do not touch it. (Check the label text, not just the `disabled`
  class, before assuming a county has gaps.)

---

## 5. Verification methodology (run per candidate)

1. **One search per club, minimum:** `[Club Name] Golf Club [County] junior open competition entry`.
2. Confirm the **real domain** by cross-checking ≥2 independent sources. Clubs use `.co.uk`,
   `.com`, `.golf`, `.org.uk` — do not assume `.co.uk`. Do not propagate a link from one
   similarly-named card to another without checking both.
3. Confirm a **live, relevant page** — ideally one showing "Junior Open" / "Open Competitions"
   and the specific date + fee matching the card. An exact date/fee match is the strongest
   possible confirmation. A link that *resolves* is not the same as a link that's *correct*.
4. If the specific event page can't be found but the club's own domain is confirmed → use the
   homepage/opens page as a **"Club Website"** link, never a guessed "Enter."
5. If nothing is confirmable → leave/set **"Link coming soon."**

### Three link patterns — don't conflate them

- **A. Standalone club opens** (the majority) — verify per club as above.
- **B. National/regional tour hubs** (PING JGT, Rock Golf League, BJGT, Junior European Open,
  county Junior OOM series) — often share one real portal across many venue cards. Confirm the
  hub domain once, thoroughly, then apply consistently (e.g. `pingjuniorgolftour.co.uk/events/`,
  `rockgolfleague.com/event/[venue]-2026/`). The site files individual JEO/tour finals under the
  **venue's county** with the venue's own opens link.
- **C. County-run programmes** (Hampshire OOM via `hampshiregolf.org.uk/entries`, Kent via
  `kentgolf.org/junior-competitions`, Sussex/Surrey OOM) — genuinely centralised. Confirm the
  single county portal once and apply to every card in that programme.

A standalone club open (A) must never be redirected to a generic county/national hub unless that
club's specific event genuinely routes through it.

### Data-integrity errors > broken links

Watch for a card filed under the wrong county (venue actually in a different, non-adjacent
county). Do **not** fix it by linking the real club under the wrong heading. Remove the
miscategorised card, correct the county count, and note it for the human. Border cases
("Worcestershire/Gloucestershire border") — use judgement, leave as-is.

Note: intelligentgolf club pages frequently block automated fetching (robots-disallowed). When
that happens, rely on the search snippet or an alternative source — do not assert a listing you
couldn't read.

---

## 6. Structural safety when editing with str_replace / equivalents

The most common failure: an edit boundary that starts/ends mid-card silently deletes the
`comp-name`, `comp-venue` or `comp-tags` lines between the matched anchors.

1. Re-read the card fresh immediately before editing (a prior edit invalidates earlier line numbers).
2. Include the **full card block** in the match — `<div class="comp-card"...>` through the closing
   `</div>` — never just the trailing `<a>` line, even when only the `href` changes.
3. After **every** edit, run the div-balance check (opens must equal closes):
   ```bash
   python3 -c "c=open('competitions.html').read(); print('opens', c.count('<div'), 'closes', c.count('</div>'))"
   ```
   If they don't match, the last edit corrupted the structure — view and repair before continuing.
4. Commit after each completed county, not just at the end. An interrupted session should never
   lose more than one county of work.

---

## 7. Standard checks (Tier 1 — deterministic, no judgement)

Run at the start and end of any pass:

```bash
# Cards still needing a link, by county
python3 -c "
import re
c=open('competitions.html').read()
from collections import Counter
dis=Counter()
for p in c.split('<div class=\"comp-card')[1:]:
    m=re.search(r'data-county=\"([a-z]+)\"',p); 
    if not m: continue
    a=p[:1500]; i=a.find('</a>')
    if 'disabled' in a[:i] and 'Link coming soon' in a[:i]: dis[m.group(1)]+=1
for k in sorted(dis): print(k, dis[k])
"

# Distinguish 'Link coming soon' (real gaps) from 'Entry closed' (fine)
python3 -c "
import re; from collections import Counter
c=open('competitions.html').read()
print(Counter(re.findall(r'class=\"comp-enter disabled\">([^<]+)<', c)))
"

# Every county-count header vs actual card count in that grid — must match
# Golf Empire links must be zero:
grep -c 'golfempire' competitions.html   # expect 0
```

**"Done" for a county / the file:** `grep -c "Link coming soon"` reflects only genuine gaps;
div balance passes; every remaining `disabled` link reads "Entry closed"; county-count headers
match actual counts; no card under a wrong county; committed and pushed.

---

## 8. The 2027 rollover (the reason most of this exists)

The finder is a mid-season snapshot — most cards are already past, and it empties toward zero
by December, exactly when parents plan the season (Dec–Mar). The real job is the **November
2026 rollover**, county by county, starting with the partnership/outreach footprint:
**Hertfordshire, Bedfordshire, Cambridgeshire, Middlesex, Essex** first.

For every card in the rollover: re-verify per this methodology **and capture `entry_deadline`
+ source URL while the page is already open** — this is the only cheap moment to collect deadline
data, and it's the hard dependency for the paid tier's headline "deadline alerts" feature. It
cannot be retrofitted without a second full pass. Migrate cards into `competition_registry`
(Supabase) as each county is verified, rather than as a separate pass.

---

## 9. Brand + SEO (for consistency when editing any page)

- Palette: navy `#0B3D6B`, mid `#1A6EA8`, sky `#5AAAD4`, light `#7BBDE0`, pale `#EEF4FB`.
  White body + navy text default; dark navy panels for hero/review-header cards only. Never
  white text on white/pale.
- Fonts: Georgia for headings; `-apple-system, Helvetica Neue, Arial` for body.
- SEO: title tags <60 chars, meta descriptions <155; all canonicals → `https://juniorcaddie.co.uk`
  (no www). Keep the displayed competition count in sync across title, meta, OG, hero stat and
  gate copy whenever cards are added/removed.
- GA4 tag is `G-ZK2B373ZMM`. Only add/verify it when actually editing a page's `<head>`; grep for
  it first and only insert where genuinely missing.

---

## 10. What to hand back to the human, not decide alone

Partnership positioning, monetisation, pricing, and what to build next are judgement calls for
Dan — surface findings, don't act on them. Same for anything that would publish competition data
without review (rule 4). When a verification is genuinely ambiguous (self-contradicting sources,
borderline county), flag it with what you found on each side rather than guessing.
