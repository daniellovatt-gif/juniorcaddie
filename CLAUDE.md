# CLAUDE.md — JuniorCaddie working brief

This file is read automatically at the start of every Claude Code session in this repo.
It encodes how to work on JuniorCaddie safely. Follow it exactly. When it conflicts with a
faster approach, this file wins — the discipline here was learned by getting it wrong.

---

## 1. What this project is

JuniorCaddie (juniorcaddie.co.uk) is a UK junior golf platform — "the home of junior golf in
the UK." Built by Dan Lovatt (golf parent, Hertfordshire) with his son Jacob. Strong
Hertfordshire-first focus before national expansion. Plain HTML/CSS/JS — no framework, no build
step. Hosted on Vercel, deployed from this GitHub repo (`daniellovatt-gif/juniorcaddie`).

**Domain:** `juniorcaddie.co.uk` only. There is **no www** — it isn't a configured Vercel domain.
Never introduce www URLs, canonicals, or sitemap entries.

**Services:**
- Backend: Supabase, project `amwwngkktfxqrpisxqza`
- Images: Cloudinary, cloud `dywsk8iat`, upload preset `juniorcaddie_marketplace`
- Forms: Formspree — community signup `xbdewqvn`, marketplace enquiry `xgojwvag`
- Email: Mailchimp for campaigns, ImprovMX for inbound mail
- Analytics: GA4 `G-ZK2B373ZMM` (see §9 for when to touch it)

---

## 2. Golden rules (do not break these)

1. **Honesty with users is the core value.** Never show a broken or guessed link. If a
   competition's entry page isn't confirmed, use "Link coming soon" (disabled) — a placeholder
   is always better than a wrong or fabricated link. "Coming soon" beats a wrong date.
2. **No Golf Empire links anywhere on the live site.** Golf Empire is a research/discovery
   source only. Never link to `golfempire.co.uk` or its `entryform.php` booking URLs. All live
   links go to the club's own site, the county union page, or the club's intelligentgolf portal —
   intelligentgolf links get the same per-competition verification as everything else; there is
   no blanket exemption for them.
   - Tiverton (`compid=2088`) and Sherwood Forest (`compid=13281`) were previously carved out
     here as "intentional exceptions, confirmed working." That was wrong. Checked 2026-09-01:
     both were stale results pages for the wrong year, not live 2026 entry links (Tiverton
     resolved to 2018 results; Sherwood Forest to 2025 results, already ranked 1st–46th). Both
     have been downgraded to "Link coming soon." Proper re-verification is deferred to the 2027
     rollover (§8) — don't reinstate either link without checking it fresh, and don't treat any
     link as exempt from checking just because it's intelligentgolf-hosted or was checked before.
3. **Never trust prior data.** ~50% historical error rate in inherited/aggregated data. Every
   link — from an old audit, a previous session, or even one currently live — gets re-verified
   against a live primary source before it is touched or added. Confidence is not a reason to
   skip verification. (See rule 2 above: the two links once flagged as safe, pre-verified
   exceptions were themselves the ones that turned out to be wrong.)
4. **Never publish competition data the human hasn't reviewed.** Hand-verification is the moat.
   You make verification cheap; you never make it optional. Propose additions as a diff/branch
   for review — do not auto-commit new competition cards to `main` without sign-off.
5. **The soft gate stays soft.** The competitions email gate is a dismissable popup — closable
   via the ✕ button, the Escape key, an overlay click, or the "No thanks" link. A hard/
   undismissable version was tested and explicitly reverted. Do not re-introduce a hard gate
   without being directly asked.
6. **No fabricated competition names, results, dates, or quotes.** If it can't be verified, it
   doesn't go in — same spirit as rule 1, extended beyond just links.
7. **Testimonials are anonymised to role only in public copy** (e.g. "Hertfordshire junior golf
   organiser") — never real names.
8. **No equipment manufacturer commercial relationships or affiliate links.** Editorial
   independence on `equipment-reviews.html` is a core brand value.
9. **No new county partnership pages without a real partnership in place.**

---

## 3. Repo facts an agent needs

- **Deploy:** push to `main` → Vercel auto-deploys. You have git write access in Claude Code
  (this replaces the old "hand the file to Dan for manual upload" loop). Commit in small,
  reviewable units — ideally one county per commit during a rollover. Stay in Manual permission
  mode: ask before committing, ask again before pushing — two separate approvals, not one.
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

Despite the section title, that's four labels total, not two: "Enter" and "Club Website" are the
two *confirmed/live* tiers; "Link coming soon" and "Entry closed" are separate disabled-state
labels for different reasons (no link found vs. window passed). Never collapse "Entry closed"
into "Link coming soon," or invent any label beyond these four.

---

## 5. Verification methodology (run per candidate)

**Core principle: never trust existing data.** Historical audit docs in this project have had
roughly a 50% error rate on domains and paths (wrong TLD, wrong subdomain, stale path, or a
totally different club with a similar name). Confidence in a source is not a reason to skip
verification:

- Don't assume `.co.uk` just because it "looks right" — real clubs also use `.com`, `.golf`,
  `.org.uk`, or a shortened/rebranded name.
- Don't propagate a link from one card to a similarly-named card without checking both independently.
- A link that *resolves* is not the same as a link that's *correct* — check the page content
  actually matches the event, date, and venue on the card, not old results for a different year
  (see §2 rule 2 — this is exactly how Tiverton and Sherwood Forest went wrong).

1. **One search per club, minimum:** `[Club Name] Golf Club [County] junior open competition entry`.
2. Confirm the **real domain** by cross-checking ≥2 independent sources — e.g. a GolfEmpire
   aggregator listing (discovery-only, per §2 rule 2 — never link to it) cross-checked against the
   club's own HowDidiDo/BRS Golf/intelligentgolf profile, which usually states the real domain in
   its footer or contact block.
3. Confirm a **live, relevant page** — ideally one showing "Junior Open" / "Open Competitions"
   and the specific date + fee matching the card. An exact date/fee match (e.g. "Sunday 27th
   September 2026 Junior Open — £10") is the strongest possible confirmation.
4. If the specific event page can't be found but the club's own domain is confirmed → use the
   homepage/opens page as a **"Club Website"** link, never a guessed "Enter."
5. If nothing is confirmable → leave/set **"Link coming soon."** But never leave a card on "Link
   coming soon" once a real domain *has* been found — a correctly-labelled "Club Website" link is
   always more useful than a placeholder.

### Three link patterns — don't conflate them

- **A. Standalone club opens** (the majority) — verify per club as above.
- **B. National/regional tour hubs** (PING JGT, Rock Golf League, BJGT, Invictas Tour, Junior
  European Open, county Junior OOM series) — often share one real portal across many venue cards.
  Confirm the hub domain once, thoroughly, then apply consistently (e.g.
  `pingjuniorgolftour.co.uk/events/`, `rockgolfleague.com/event/[venue]-2026/` — Rock Golf League
  venue URLs follow that slug pattern and can be confirmed directly against the tour's
  `/schedule/` page). The site files individual JEO/tour finals under the **venue's county** with
  the venue's own opens link.
- **C. County-run programmes** (Hampshire OOM via `hampshiregolf.org.uk/entries`, Kent via
  `kentgolf.org/junior-competitions`, Leeds & District Union's Junior OOM via
  `ldugc.co.uk/upcoming_competitions`, Sussex/Surrey OOM) — genuinely centralised. Confirm the
  single county portal once and apply to every card in that programme.

A standalone club open (A) must never be redirected to a generic county/national hub unless that
club's specific event genuinely routes through it.

### Data-integrity errors — flag, never remove unilaterally

Watch for a card filed under the wrong county (venue actually in a different, non-adjacent
county) — more serious than a broken link, since it actively misleads a parent into thinking a
club is local when it isn't.

- **Do not** fix it by linking the real club under the wrong heading — that compounds the error.
- **Do not** remove the card unilaterally. Flag it clearly to Dan — name the card, its stated
  county, the club's real location, and what the corrected county count would be if removed — and
  wait for confirmation before touching anything. Detection and diagnosis happen immediately; the
  removal itself does not. (As of 2026-09-01 this supersedes any earlier instruction in this file
  to remove and notify after — always ask first. See also §11.)
- If a borderline case is genuinely ambiguous (e.g. a club sitting on a county border like
  "Worcestershire/Gloucestershire"), say so explicitly when flagging it rather than deciding
  silently either way.

Note: intelligentgolf club pages frequently block automated fetching (robots-disallowed). When
that happens, rely on the search snippet or an alternative source — do not assert a listing you
couldn't read.

### County header consistency

After fixing all cards in a county, also check:

- The **county-count number** in the header (`<span class="county-count">`) matches the actual
  number of cards in that grid — this drifts whenever cards are added, removed, or merged.
- The **county-header link** ("County website" / "View county calendar") points to a real,
  confirmed page — ideally the same hub used for that county's programme-wide cards, not a stale
  or guessed URL.
- Any **explanatory banner text** below the header (e.g. "we're working through the full list")
  gets updated once that county is actually complete — a stale caveat undermines trust once the
  work is done.

---

## 6. Structural safety when editing

Prefer small, targeted edits over full-file rewrites — `competitions.html` alone is 6,600+
lines. Work through one task on one file at a time rather than batching unrelated changes.

The most common failure: an edit boundary that starts/ends mid-card silently deletes the
`comp-name`, `comp-venue` or `comp-tags` lines between the matched anchors.

1. Re-read the card fresh immediately before editing (a prior edit invalidates earlier line numbers).
2. Include the **full card block** in the match — `<div class="comp-card"...>` through the closing
   `</div>` — never just the trailing `<a>` line, even when only the `href` changes.
3. After **every** edit, self-check before showing Dan:
   - **Div balance** (opens must equal closes):
     ```bash
     python3 -c "c=open('competitions.html').read(); print('opens', c.count('<div'), 'closes', c.count('</div>'))"
     ```
     `python3` isn't guaranteed to be installed — shell fallback:
     ```bash
     echo "opens: $(grep -o '<div' competitions.html | wc -l)  closes: $(grep -o '</div>' competitions.html | wc -l)"
     ```
   - **Bare `&` scan** — a raw `&` not part of `&amp;`/`&lt;`/`&gt;`/`&quot;`/`&#...;` is invalid HTML:
     ```bash
     grep -noP '&(?!amp;|#|lt;|gt;|quot;)' competitions.html
     ```
     ~650 bare ampersands already exist in the file as of 2026-09 (mostly "Boys & Girls" style
     tag text) — this check is to catch *new* ones introduced by an edit, not a mandate to
     retroactively clean up the existing baseline unless asked.
   If either check turns up something on lines you just touched, the edit corrupted something —
   view and repair before continuing.
4. Show the changed file / diff after each change, without being asked.
5. Commit after each completed county, not just at the end. An interrupted session should never
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
div balance passes; every remaining `disabled` link reads "Entry closed"; county-count headers,
their linked URL, and any banner text all match reality (§5, "County header consistency"); no
card sits under a county its venue doesn't belong to, and any flagged miscategorisation has been
confirmed by Dan before removal (§5); committed and pushed.

---

## 8. The 2027 rollover (the reason most of this exists)

The finder is a mid-season snapshot — most cards are already past, and it empties toward zero
by December, exactly when parents plan the season (Dec–Mar). The real job is the **November
2026 rollover**, county by county, starting with the partnership/outreach footprint:
**Hertfordshire, Bedfordshire, Cambridgeshire, Middlesex, Essex** first.

Also carry forward from outside that priority list: **Tiverton (Devon)** and **Sherwood Forest
(Notts)** — both downgraded to "Link coming soon" on 2026-09-01 after their old "confirmed"
links turned out to be stale (§2 rule 2). Easy to forget since neither county is in the
priority-five; they still need a proper from-scratch search, not just a status-quo re-check.

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

---

## 11. Always ask before

- Pushing anything to GitHub.
- Deleting or restructuring existing competition cards. See §5 ("Data-integrity errors — flag,
  never remove unilaterally"): flag the card, its stated county, the club's real location, and
  the corrected county count, then wait for confirmation. Never remove a card unilaterally, even
  when the miscategorisation looks obvious.
- Changing the soft gate to a hard gate.
- Touching `about.html`'s photo set — one photo was deliberately removed; don't re-add without
  being asked.
