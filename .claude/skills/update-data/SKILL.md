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
| `data/domains.json` | Genshin domains, rewards, specialties |
| `data/hsr/characters.csv` | HSR characters |
| `data/hsr/versions.csv` | HSR versions |
| `data/hsr/domains.json` | HSR domains and rewards |
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
- `release_date`: `R` means "same day as the version's release date",
  blank means unknown.
- Leaked characters may leave any field blank; the UI buckets blanks under
  Unknown filters, rows, and columns. This is intentional and fully supported.
- Photos come from paimon.moe by `name`, with local overrides in
  `docs/assets/images/characters/` and `full-characters/` (lowercase filenames),
  and Fallback.png otherwise. Renaming a character invalidates its photo lookup.

### versions.csv (both games)

`version,display_version_number,name,release_date`. Include future versions
with projected dates (both games run 6-week patches). Future versions have no
name; the version filter's default is the LAST version that has a name, so name
a version only once it is official.

### hsr/characters.csv

`name,display_name,rarity,path,combat_type,gender,world,release_version,release_date`

- Multi-form characters (March 7th) put `; `-separated values in `path`,
  `combat_type`, and optionally `display_name` (mapped per form:
  `March 7th; March 7th (Hunt)`).
- Path is stored as `Hunt`, not `The Hunt` (display and wiki filenames map it
  back via `HSR_PATH_LABELS` in `docs/hsr/assets/domains.js` and characters.js).
- Gender is hand-maintained. The HSR wiki records no genders anywhere.
- The Trailblazer is excluded, like the Traveler on the Genshin side.

### domains.json (Genshin)

Top-level keys: `domains`, `rewards`, `specialties`. The old Telegram bot also
reads this file and only knows `domains` and `rewards` with the original five
types, so: new keys must be additive, `effect` must stay a plain string, and
never remove or rename the original structures.

- `domains[]`: `name`, `location` ("Subarea, Area" from the wiki's Domain/Enemy
  Infobox), `region`, `type`, `rewards` (list if static, or per-day dict
  `{mon: [...], ...}` for rotating types). Weekly boss entries put the official
  boss name in parentheses in `name`: `Confront Stormterror (Stormterror Dvalin)`.
- `rewards{}`: key prefixes by type: `w_` weapon mats, `t_` talent mats,
  `a_` artifacts, `nb_` normal boss, `wb_` weekly boss. Entries carry `name`
  plus either `characters` (list of characters.csv names) or `effect`
  (+ `effect_4pc` for artifact sets, official wiki wording).
- `specialties{}`: `s_` keys with `name`, `region`, `characters`. Unused
  specialties are kept. Ten unused artifact reward entries also exist by choice.
- Talent material family names use short forms; `WIKI_ALT_NAMES` in
  `docs/assets/domains.js` maps them to wiki titles (`Freedom` to
  `Teachings of Freedom`).

### hsr/domains.json

Top-level: `domains`, `rewards`. Types and reward prefixes:
`calyx_crimson`/`cr_`, `cavern_of_corrosion`/`cc_`, `planar_ornament`/`po_`,
`stagnant_shadow`/`ss_`, `echo_of_war`/`ew_`.

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

Filename conventions (after redirect resolution):

- Genshin: items `Item {name}.png`; artifact sets have no own image, use the
  flower piece from the set page's `|flower =` param; boss archive icons
  `{Boss} Icon.png` with colons dropped plus the `BOSS_ICON_ALIASES` map in
  `docs/assets/domains.js`; region emblems `Emblem {Region}.png` (none for
  Khaenri'ah, override map in common.js); version splashscreens
  `Splashscreen {Version Name}.png` (Genshin) / `Splash Screen {Version Name}.png`
  (HSR), used by THUMBNAIL_IMAGE in `generator/template_replacements.py`
  (update each patch) and by the version picker banners on both character pages.
- HSR: character icons `Character {name} Icon.png`; paths `Path {label}.png`
  (full `The Hunt`; no Finality icon exists, local fallback); combat types
  `Type {name}.png`; items and relic sets `Item {name}.png`; worlds
  `Icon {World}.png`; weekly boss thumbs `Icon Echo of War {name}.png`; DivU
  stage boss thumbs come from each enemy page's infobox `image` param.

The Genshin domains page resolves item/boss images at runtime through the API
and caches the result in localStorage keyed by the data's `last_updated` (so
caches refresh whenever CI commits new data). The HSR pages use filenames baked
into the data at authoring time instead; when adding HSR entries, resolve the
filenames yourself and store them.

### Where each kind of data lives on the wikis

- Genshin domain locations: `{{Domain Infobox}}` params `region`/`area`/
  `subarea`; some bosses use `{{Enemy Infobox}}` with a `location` param
  instead. Watch for multiple params on one line and `(Location)`-suffixed
  disambiguation titles: strip them.
- Genshin weekly boss official names: the `==Enemies==` section of the Trounce
  Domain page.
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
- Plain curl with a browser User-Agent works, no JS needed for what we use.
- Character index at `/characters/?lang=EN`; find slugs like
  `robin-summeretto-character` in the HTML.
- A character page's HTML contains `/{slug}-item/` links for every material.
  Match those against our reward names by slugifying both sides, and beware
  that Honey Hunter drops apostrophes (`the-fluffy-collectors-edition` is
  "The Fluffy Collector's Edition") and diacritics (`flower-of-laya` is
  "Flower of Ālaya").
- The page mixes in EXP items, Credit, boss mats, and trace tiers; the
  farmable-relevant ones are the ascension stone, the trace family, and the
  weekly material.

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
