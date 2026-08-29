---
name: update-data
description: Guide for updating GenshinChars data (characters, versions, domains, HSR) from the wikis and Honey Hunter, with data schemas, wiki API recipes, image pitfalls, and verification steps.
---

# Keeping GenshinChars data up-to-date

Site: chars.remls.io. Four pages: /characters, /domains, /hsr/characters, /hsr/domains.
/ redirects to /characters, /hsr redirects to /hsr/characters.

## Architecture

Source files (hand-edited, the only files you normally touch):

| File | Feeds |
|---|---|
| `data/characters.csv` | Genshin characters |
| `data/versions.csv` | Genshin versions |
| `data/domains.json` | Genshin domains, rewards, enemy drops, specialties, other materials |
| `data/hsr/characters.csv` | HSR characters |
| `data/hsr/versions.csv` | HSR versions |
| `data/hsr/domains.json` | HSR domains, rewards, enemy drops, other materials |
| `data/characters.template.html` | Genshin characters page markup |
| `data/index.template.html` | / redirect page |

Generated files (never hand-edit, CI overwrites them): `docs/characters.html`,
`docs/index.html`, `docs/assets/characters.json`, `docs/assets/domains.json`,
`docs/hsr/assets/characters.json`, `docs/hsr/assets/domains.json`. The generator
also rewrites the og:image metas inside `docs/domains.html` in place.

Generator: `python generator/main.py` (needs `pip install -r requirements.txt`,
notably bs4). CI (`.github/workflows/main.yml`) runs it on every push to main,
then commits an allowlist of generated files as "Update data". CI skips the
commit when the only changes are `"version"` and `"last_updated"` lines.
Consequence: after editing a source file, do NOT hand-sync the generated JSON.
Let CI produce a real diff so the site's "Last updated" timestamp refreshes.
If you hand-sync for local testing, `git checkout` the generated file before
pushing.

Local preview: a dev server runs on port 3000 serving the repo root, so pages
live at `localhost:3000/docs/characters` etc. Browsers cache aggressively;
force-refresh an asset from the console with `fetch(url, {cache: 'reload'})`
then reload, or use the "Reset picture cache" footer link (clears localStorage).

## Data schemas

### characters.csv (Genshin)

`name,display_name,rarity,element,arkhe,weapon,region,gender,birthday,release_version,release_date`

- `name` is the primary key. It must match the wiki page name, or at least a
  redirect to it. Prefer the canonical page name (see the Columbina incident
  below). `domains.json` character lists must use these exact names.
- `display_name` is what the UI shows; blank when identical to `name`.
- `arkhe` is `Pneuma`, `Ousia`, `Pneumousia`, or blank for the characters that
  have none, which is everyone outside Fontaine. It is a per-form column, since
  the wiki gives an arkhe to individual Traveler elements, not to the Traveler.
- `release_date`: `R` means "same day as the version's release date",
  blank means unknown.
- Leaked characters may leave any field blank; the UI buckets blanks under
  Unknown filters, rows, and columns. This is intentional and fully supported.
- Photos come from the wiki, resolved at generate time by `generator/wiki_images.py`
  and stored as `{"wiki": filename}` or `{"local": filename}`. Chip icons are
  `{name} Icon.png` on Genshin and `Character {name} Icon.png` on HSR, tried per
  form first so multi-form characters get their own art. Full art is
  `Character {name} Full Wish.png` then `Character {name} Game.png` on Genshin,
  `Character {name} Splash Art.png` on HSR. A local override in the game's
  `assets/images/characters/` or `full-characters/` (lowercase filenames) is used
  when the wiki has nothing, and Fallback.png otherwise. Renaming a character
  invalidates its photo lookup.

### versions.csv (both games)

`version,display_version_number,name,release_date`. Include future versions
with projected dates (both games run 6-week patches). Future versions have no
name; the version filter's default is the LAST version that has a name, so name
a version only once it is official.

`version` is always the number. `display_version_number` is the marketing name
when one exists: Genshin's 6.0 through 6.7 are `Luna I` through `Luna VIII`.
The Genshin wiki's `Category:Released in Version X` uses that display name, not
the number, so mapping a wiki category back to a sortable version means going
through the roman numeral.

### hsr/characters.csv

`name,display_name,rarity,path,combat_type,gender,world,release_version,release_date`

- Multi-form characters (March 7th) put `; `-separated values in `path`,
  `combat_type`, and optionally `display_name` (mapped per form:
  `March 7th; March 7th (Hunt)`), `release_version` and `release_date`
  (`1.0; 2.4` and `R; R`, each form resolving `R` against its own version).
  Forms are zipped by position, and a shorter list falls back to its first
  value. The character's own `release_version`/`release_date` are the first
  form's, so sorting and released/unreleased state follow the debut. The
  version filter drops forms released after the selected version, and the
  character with them once none are left.
- Path is stored as `Hunt`, not `The Hunt` (display and wiki filenames map it
  back via `HSR_PATH_LABELS`, defined in both `docs/assets/common.js` and
  `generator/json_generator.py`).
- Gender is hand-maintained. The HSR wiki records no genders anywhere. Values
  are `Male`, `Female`, `Either` for characters whose gender the player picks,
  or blank. The filter buttons and their glyphs come from `GENDERS` in
  `docs/assets/common.js`, shared by both games.
- The Trailblazer is excluded, like the Traveler on the Genshin side.

### Which tier names a material family (both games)

Many materials come in a family of tiers sharing one drop source: Genshin weapon
mats run 2/3/4/5 star, its talent books and enemy drops 1/2/3, HSR's trace and
enemy families 2/3/4. One name stands for the whole family, and in both games it
is the **highest** tier: `Scattered Piece of Decarabian's Dream`, not
`Tile of Decarabian's Tower`; `Flower of Eternity`, not `Seed of Abundance`.

Two exceptions. Genshin talent books display the bare family name (`Freedom`),
which carries no tier, and only the wiki link and thumbnail resolve to one, via
`WIKI_ALT_NAMES` pointing at `Philosophies of X`. Single-drop sources, boss
materials and regional specialties, have no family and no choice to make.

A reward key is an opaque id, not a slug of the name. Several were coined from a
lower tier and were deliberately left alone when the names moved up (`w_tile`
now names a Dream, `w_tooth` a Nostalgia), so do not rename a key to chase its
name. Renaming one means editing every `domains[].rewards` day array that cites
it, which is the only thing that reads a key.

### domains.json (Genshin)

Top-level keys: `domains`, `rewards`, `common_enemy_drops`, `specialties`,
`other_materials`. The old Telegram bot also reads this file and only knows
`domains` and `rewards` with the original five types, so: new keys must be
additive, `effect` must stay a plain string, and never remove or rename the
original structures. Anything that is not a domain, and so has no location,
belongs in its own top-level key rather than as an extra type inside `domains[]`,
which is what `common_enemy_drops`, `specialties` and `other_materials` do.

- `domains[]`: `name`, `location` ("Subarea, Area" from the wiki's Domain/Enemy
  Infobox), `region`, `type`, `rewards` (list if static, or per-day dict
  `{mon: [...], ...}` for rotating types). Weekly boss entries put the official
  boss name in parentheses in `name`: `Confront Stormterror (Stormterror Dvalin)`.
- `rewards{}`: key prefixes by type: `w_` weapon mats, `t_` talent mats,
  `a_` artifacts, `nb_` normal boss, `wb_` weekly boss. Entries carry `name`
  plus either `characters` (list of characters.csv names) or `effect`
  (+ `effect_4pc` for artifact sets, official wiki wording).
- `common_enemy_drops{}`: `c_` keys with `name`, `type`, `enemies`,
  `characters`. The materials ordinary overworld enemies drop, 19 families of
  three tiers. `enemies` is a list because a few families drop from more than
  one group. No region, so no `region` field and `no_regions` on the type.
- `specialties{}`: `s_` keys with `name`, `region`, `characters`. Unused
  specialties are kept. Ten unused artifact reward entries also exist by choice.
- `other_materials{}`: `o_` keys with `name`, `type`, `characters`. For
  ascension materials that are not farmable at all. Rendered from its own filter
  button with no region filter (`no_regions` on the type).
- Not-yet-revealed content uses `"???"` placeholders: domain `name`/`location`
  and reward/specialty `name` may all be `"???"` (the site skips image lookups
  for names starting with `???`). Give such rewards a descriptive key
  (`nb_snezhnaya_1`, `a_snezhnaya_1`) and rename the `name` once official.
- Talent material family names use short forms; `WIKI_ALT_NAMES` maps them to
  wiki titles (`Freedom` to the tier page). It is duplicated in
  `docs/assets/common.js` (link targets on the domains page and in the character
  sheet) and `generator/domain_images.py` (which page the thumbnail is read
  from). Edit both or the icon and the link disagree.

### hsr/domains.json

Top-level: `domains`, `rewards`, `common_enemy_drops`, `other_materials`. Types
and reward prefixes: `calyx_crimson`/`cr_`, `cavern_of_corrosion`/`cc_`,
`planar_ornament`/`po_`, `common_enemy_drops`/`c_`, `stagnant_shadow`/`ss_`,
`echo_of_war`/`ew_`, `other_materials`/`o_`.

- `common_enemy_drops{}` mirrors the Genshin group: `name`, `type`, `enemies`,
  `characters`, 11 families of three tiers, no world.

- `domains[]`: `name`, `location`, `region` (world), `type`, `image` (exact wiki
  filename shown as the row thumbnail), optional `page` (overrides the wiki link
  target, used by planar stages: `Divergent Universe#Untoppled Walls`), optional
  `boss` (list; rendered boss-first with the domain name in grey underneath for
  weekly bosses, boss-only for planar stages where `name` is the stage).
- Keep each type's entries in release order. The introduction version is the
  first argument of `{{Change History|X.Y}}` at the bottom of each wiki page.
- `rewards{}`: `name` + `characters`, or `effect` (+ `effect_4pc` for cavern
  relic sets; planar sets have only `effect`). Optional `image` overrides the
  computed `Item {name}.png` filename when the real file differs.
- Wiki page titles are reconstructed as `{page_prefix}: {name}` (crimson
  calyxes append ` ({location})`), so `name`/`location` must match wiki naming.

## Wiki APIs (both fandom wikis)

Endpoints: `https://genshin-impact.fandom.com/api.php` and
`https://honkai-star-rail.fandom.com/api.php`. Works with plain
urllib/curl; add `origin=*` for CORS and a User-Agent. WebFetch may be blocked;
scripts are more reliable. Batch up to 50 titles per query with
`titles=a|b|c` and always pass `redirects=1`, then resolve the
`normalized` + `redirects` chains back to your requested titles.

Useful queries:

- Wikitext: `action=query&prop=revisions&rvprop=content&rvslots=main`
- Category listing: `action=query&list=categorymembers&cmtitle=Category:X&cmlimit=500`
  (follow `continue`)
- File existence and true URL: `prop=imageinfo&iiprop=url`
- All files by prefix: `list=allimages&aiprefix=X`
- Page categories: `prop=categories&cllimit=max`. WARNING: `cllimit` caps the
  TOTAL across all pages in a batch (500), so large batches silently truncate.
  Use small batches (10 pages) and follow `continue`.

Wikitext cleaning recipe for effect/bonus text: strip `<br>` to space, unwrap
`{{Color|...}}` (keep last argument, repeat for nesting), `{{Electro}}`-style
element templates to their name, `[[A|B]]` to B, `[[A]]` to A, drop bold
quotes and tags, collapse whitespace.

### Images: the rules that prevent every past bug

- CDN buckets are misspelled: `gensin-impact` and `houkai-star-rail`
  (`static.wikia.nocookie.net/{bucket}/images/{h}/{hh}/{file}` where `h`/`hh`
  are the first MD5 hex chars of the underscored filename; `md5Hex`/
  `wikiFileUrl` in `docs/assets/common.js` compute this).
- Use bare URLs. `/revision/...` URLs are referer-protected: they 404 (or serve
  the placeholder) when the browser sends a Referer header. Exception: scaled
  thumbnails (`{bare}/revision/latest/scale-to-width-down/{px}`) may be used
  with `referrerpolicy="no-referrer"` on the img tag, as the version pickers do.
- The placeholder 404 is served with `cache-control: public, max-age=3600` and
  is cached by both the browser and the CDN edge. After fixing a broken image
  URL scheme, requests can keep returning the cached placeholder for up to an
  hour; change the URL (e.g. a different thumbnail width) to bust it instead of
  waiting or blaming the fix.
- The CDN answers requests for nonexistent files with an HTTP 404 that has a
  valid webp body, so `<img onerror>` never fires and junk renders. Therefore
  NEVER guess filenames. Case matters mid-title too: 1.0's splashscreen is
  `Splashscreen Welcome To Teyvat.png` (capital "To"), not the version's
  official "Welcome to Teyvat" spelling.
- A File page existing does not mean the file exists under that name: File
  pages can be redirects. Always resolve to the final title via `redirects=1`
  and use that filename. Real examples: `Item Traveler's Guide.png` is really
  `Item Travelers Guide.png`, `Character Trailblazer Icon.png` is really
  `Character Trailblazer (Destruction) Icon.png`, `Coral Defenders Icon.png`
  is really `Bathysmal Vishap Herd Icon.png`, and enemy images drop colons and
  quotes (`Enemy Borisin Warhead: Hoolay.png` is `Enemy Borisin Warhead Hoolay.png`).
- The converse also fails: `imageinfo` can return a URL whose file then 404s
  when fetched (`Item Frostfairy Flower.png` had a File page and an infobox
  reference but no uploaded file). A returned URL is not proof; fetch it.
- A just-revealed character has no wiki images at all for the first days
  (reveal-day Pearl had only her Introduction card); character pages render the
  fake-404 placeholder until editors upload the icon, then heal on their own.

Filename conventions (after redirect resolution):

- Genshin: items `Item {name}.png`; artifact sets have no own image, use the
  flower piece from the set page's `|flower =` param; boss archive icons
  `{Boss} Icon.png` with colons dropped plus the `BOSS_ICON_ALIASES` map in
  `generator/domain_images.py`; region emblems `Emblem {Region}.png` (none for
  Khaenri'ah, override map in common.js); version splashscreens
  `Splashscreen {Version Name}.png` (Genshin) / `Splash Screen {Version Name}.png`
  (HSR), used by THUMBNAIL_IMAGE in `generator/template_replacements.py`
  (update each patch) and by the version picker banners on both character pages.
- HSR: character icons `Character {name} Icon.png`; paths `Path {label}.png`
  (full `The Hunt`; no Finality icon exists, local fallback); combat types
  `Type {name}.png`; items and relic sets `Item {name}.png`; worlds
  `Icon {World}.png`; weekly boss thumbs `Icon Echo of War {name}.png`; DivU
  stage boss thumbs come from each enemy page's infobox `image` param.

Both games ship filenames in the data, but by different routes. Genshin resolves
them at generate time: `generator/domain_images.py` queries the wiki and writes
an `image` onto every entry of `rewards`, `specialties` and `other_materials`,
plus `image`/`link`/`boss` onto each domain, and the page just reads them. So a
Genshin entry is authored with no `image` at all. HSR has no such generator step,
`generate_hsr_domains_file()` copies the file straight through, so HSR entries
carry hand-resolved filenames: resolve them yourself and store them. HSR rewards
may omit `image` when the computed `Item {name}.png` is already right.

No frontend code calls the wiki API. The only localStorage use is the
image-cache-busting token in `docs/assets/common.js`, which the "Reset picture
cache" footer link bumps.

### Where each kind of data lives on the wikis

- Genshin domain locations: `{{Domain Infobox}}` params `region`/`area`/
  `subarea`; some bosses use `{{Enemy Infobox}}` with a `location` param
  instead. Watch for multiple params on one line and `(Location)`-suffixed
  disambiguation titles: strip them.
- Genshin weekly boss official names: the `==Enemies==` section of the Trounce
  Domain page.
- Genshin character usage of materials: page categories `Ascends with {item}`
  and `Talents Leveled with {item}`, the mirror of the HSR ones below. Every
  tier of a family carries the same categories, so any tier resolves the same
  character list.
- The Traveler splits two ways, and the data follows the wiki. Ascension is
  element-independent, so only the main `Traveler` page carries `Ascends with`
  and the entry uses the bare name, as `s_windwheel_aster` already does. Talents
  are per element, carried on the `Traveler (Anemo)`-style pages, and those
  entries use the form name. One element can appear under two families. Reading
  the main page alone gives the union of all eight and is wrong for both uses.
- Item rarity: Genshin's `{{Item Infobox}}` calls it `quality`, HSR's calls it
  `rarity`. Genshin also has `group`/`group2` params naming the item's family
  (`Slime Materials`), which HSR has no equivalent for.
- Genshin enemy drops: `Category:General Enemy Drops` (19 families of 3) and
  `Category:Elite Enemy Drops` (~33 families). Elite drops are weapon ascension
  materials only, no playable character uses one, so a character site cares only
  about the general set. The `... Enemy Drops by Group` subcategories are
  miscategorized and cannot be trusted (`Frostnight Scion Materials` and others
  sit under *General* while their items are all *Elite*): enumerate from the
  item categories instead. The dropping enemy comes from the item infobox's
  `source1..N`, at enemy-group level; the `{{Dropped By}}` section is a DPL
  table of individual variants and is far too granular (`Damaged Mask` lists 28).
- HSR common enemy drops, the equivalent set: items in both
  `Category:Trace Material` and `Category:Character Ascension Material`, 11
  families of 3 plus `Tears of Souls`, which is a universal substitute with no
  family and no characters.
- Artifact and relic set bonuses: `|2pcBonus =` / `|4pcBonus =` in the set
  page infobox.
- HSR domains: `{{Domain Infobox}}` (`title`, `world`, `area`, `drops` with
  `drops_delim`, `boss` for echoes). Categories: `Calyx (Crimson)`,
  `Stagnant Shadow`, `Cavern of Corrosion`, `Echo of War`.
- HSR versions: `Category:Version Info` members `Version/X.Y`, each with
  `{{Version Infobox}}` params `title` and `release_date`.
- HSR release versions of characters: derive from release date against version
  windows, cross-check the `Released in Version X.Y` category.
- HSR character usage of materials: page categories `Ascends with {item}`
  (stagnant shadow stones) and `Traces Leveled with {item}` (crimson calyx
  tiers and weekly materials). Multi-path characters carry these categories on
  their per-path SUBPAGES (`March 7th/Preservation`, `March 7th/The Hunt`),
  their main page has none, so scrape the subpages for them.
- Divergent Universe stages: the `==Stages==` table on the `Divergent Universe`
  page (Stage, Boss, Rewards columns; note some rows lack the `id=` attribute,
  so do not anchor parsing on it).

## Honey Hunter (leaked data)

For unreleased characters the wikis lack build data; Honey Hunter has it.

- HSR: `https://starrail.honeyhunterworld.com/?lang=EN`. Genshin:
  `https://gensh.honeyhunterworld.com/?lang=EN`.
- **curl no longer works.** Every request answers 403, including with a full
  browser header set (User-Agent, Accept, Sec-Fetch-*). Use Claude in Chrome:
  navigate the tab, then read the page with `javascript_tool`. The pages are
  server-rendered, so one `javascript_tool` call per page is enough.
- The two sites use different URL schemes, and only HSR matches the older docs:
  - HSR: index at `/characters/?lang=EN`, slugs like `pearl-character`,
    `screwllum-character`. Item links are `/{slug}-item/`. Match those against
    our reward names by slugifying both sides, and beware that Honey Hunter
    drops apostrophes (`the-fluffy-collectors-edition` is "The Fluffy
    Collector's Edition") and diacritics (`flower-of-laya` is "Flower of Ālaya").
  - Genshin: index at `/fam_chars/?lang=EN`, slugs are
    `{internal codename}_{id}` (`vesna_143`, `columbina_904`, and for older
    characters the HoYo codename rather than the English name: `qin_017` is
    Jean, `ambor_008` is Amber). Item links are `/i_{id}/` or `/i_n{id}/`, and
    the link text is the item's display name, so names come straight off the
    page with no slug matching.
- The Genshin `/fam_chars/` index renders only part of its list into the DOM.
  For a character that has not released, go through `/new-in-{version}/?lang=EN`
  instead, dashed (`/new-in-7-1/?lang=EN`), which links every new character,
  weapon and item for that version.
- Reading a Genshin character page's materials. The item name is in the `img`
  alt, NOT the link text: some pages label the link with the item name, others
  leave it empty and put the quantity there instead, so filtering on link text
  silently returns nothing and reads as "no data yet".

  ```js
  [...new Set([...document.querySelectorAll('a[href*="/i_"] img')]
      .map(i => i.getAttribute('alt') || i.getAttribute('title') || ''))]
      .filter(Boolean)
  ```

- The page mixes in EXP items, Mora/Credit, boss mats, and book tiers; the
  farmable-relevant ones are the ascension stone, the talent or trace family,
  the local specialty, the common enemy drop family, and the weekly material.
- A character appearing on a "New in" page does not mean its build is known.
  The row's Ascension Materials column is empty until the data lands, and the
  character page then has no material tables at all, only the card and talents.
  Check both characters of a patch separately rather than assuming one stands
  for the version.

## yatta.moe / Project Amber (leaked data)

Second leak source, useful when Honey Hunter lags: `https://gi.yatta.moe/en`
(Genshin) and `https://sr.yatta.moe/en` (HSR). Plain curl still works here.

- Character list: `https://gi.yatta.moe/api/v2/en/avatar` returns JSON with
  `data.items` keyed by avatar id, each carrying `name` and a `release`
  timestamp. Detail is at `/api/v2/en/avatar/{id}`.
- The `/api/v2/en/changelog` endpoint 404s, and the per-version changelog page
  route documented previously (`/en/changelog?v=70`) no longer resolves.
- Amber trails Honey Hunter on unreleased characters: as of Genshin 7.0 its
  avatar list stops at the current live version and carries no beta characters
  at all. Treat it as a naming source for items, not a build source.

## Reading leak material infographics

Farming-total cards (Telegram leakers) carry fixed standard totals: 7.1M mora,
419 Hero's Wit, 3 crowns, 1/9/9/6 gems, 9/63/114 talent mats, 46 boss drops,
168 specialties, 18 weekly drops, 36/96/129 common drops. The only information
is WHICH items appear. Identify them by visually matching tile icons against
wiki `Item {name}.png` files (crop and zoom the card if needed). Talent family
emblems persist across tiers, so match the emblem, not the book or scroll
style; Snezhnaya families are scrolls (Charity cotton bloom, Fortitude
four-petal star, Glory torch).

## Where the front end reads the data from

Both games' type tables, `DOMAIN_TYPES` and `HSR_DOMAIN_TYPES`, live in
`docs/assets/common.js`, which all four pages load. Each entry carries
`button_label` (the short label on the selected filter button), `string` (its
tooltip), `title` (the section heading), `icon`, `short` (the `?t=` code, and
by convention the reward key prefix), and for a type rendered from its own
top-level key, `source` plus `no_regions`/`no_worlds`. `button_label` is
optional on HSR, which falls back to `string`.

Object key order in those tables is the order of the filter buttons, and now
also the order of the character sheet's material grid: `buildCharacterMaterials`
ranks each entry by its type's position, then by position within the group. So
the order of keys inside `rewards` no longer has to be maintained to match the
buttons, which the HSR file had never done.

Genshin type icons take an `invert` filter unless the filename starts with
`Item `, since the menu glyphs are dark and the site is not. Check a new icon is
actually a monochrome glyph before using it.

Character lists are stored sorted by the primary name and re-sorted for display
by `sortedByDisplayName` in each game's `domains.js`, keyed on
`foldedText(displayName)`, so accents and separators sort as letters. Keep the
file sorted by the stored name; the page handles the rest.

Enemy names in `common_enemy_drops` are link targets, so each must be a real
page title. Plural forms usually resolve through a wiki redirect but not always
(`Landcruisers` and `Automatons` do not). Where the label and the page title
genuinely differ, add to `ENEMY_WIKI_ALT_NAMES` in `docs/assets/domains.js` or
`HSR_ENEMY_WIKI_ALT_NAMES` in `docs/hsr/assets/domains.js`, the same pattern
`WIKI_ALT_NAMES` uses for talent books.

## Common workflows

New Genshin version: add the version row (or name an existing future row) in
`data/versions.csv`, extend future projections, update `THUMBNAIL_IMAGE` in
`generator/template_replacements.py` to the new splashscreen (verify the file
on the wiki first).

Naming a version (either game) makes the version picker derive and request its
splashscreen file. Verify the file first (`imageinfo`, exact case). If the name
differs from the derived one or the wiki has no file yet (the CDN placeholder
would render instead of a plain text row), add an entry to
`SPLASHSCREEN_OVERRIDES` (`docs/assets/characters.js`) or
`HSR_SPLASH_SCREEN_OVERRIDES` (`docs/hsr/assets/characters.js`): the value is
the real filename, or null for "no file". Genshin 1.0 is the standing example
(`Splashscreen Welcome To Teyvat.png`, capital "To").

New character (either game): add the CSV row. If released, wiki infobox has
everything (HSR: `rarity`, `path`, `combatType`, `world`, `release_date`; forms
via `path2`/`combatType2`...). If leaked, take what Honey Hunter has and leave
the rest blank. Then wire their materials into the game's domains.json
character lists (use primary CSV names, not display names).

New domain/boss/set: fetch the infobox, resolve every image filename through
`imageinfo`, insert in release order, add reward entries with official effect
text, and for Genshin remember the bot compatibility rules.

## Verification checklist before pushing

1. `python3 -c "import json; json.load(open('data/domains.json')); json.load(open('data/hsr/domains.json'))"`
2. `node --check` any edited JS.
3. Referential integrity: every domain reward key exists in `rewards`; every
   character named in rewards/specialties exists in the game's characters CSV.
4. Load the affected pages on `localhost:3000/docs/...` with cache-reload and
   check for broken images (`img.complete && img.naturalWidth === 0`) and
   console 404s. A 404 in the console with a visible image means a fake-404
   placeholder: fix the filename, do not trust the render.
5. Push with `git pull --rebase && git push`, then `gh run watch` the CI run.
   Confirm the "Update data" commit appears when you changed source data (if CI
   skipped it, the published timestamp did not refresh and something hand-synced
   the generated files prematurely).
