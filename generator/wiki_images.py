import json
import os
import urllib.parse
import urllib.request

GENSHIN_API = "https://genshin-impact.fandom.com/api.php"
HSR_API = "https://honkai-star-rail.fandom.com/api.php"
USER_AGENT = "GenshinChars image resolver (https://chars.remls.io)"
BATCH_SIZE = 50


def resolve(api: str, filenames: list) -> dict:
    """Map each requested filename to the filename it really lives under.

    Missing files are absent from the result. A File page can be a redirect, and
    the CDN answers a redirect's name with a placeholder image rather than an
    error, so the resolved name is the only safe one to store.
    """
    resolved = {}
    unique = sorted(set(filenames))
    for i in range(0, len(unique), BATCH_SIZE):
        batch = unique[i:i + BATCH_SIZE]
        resolved.update(_resolve_batch(api, batch))
    return resolved


def _resolve_batch(api: str, batch: list) -> dict:
    params = {
        "action": "query",
        "format": "json",
        "prop": "imageinfo",
        "iiprop": "url",
        "redirects": 1,
        "titles": "|".join(f"File:{name}" for name in batch),
    }
    request = urllib.request.Request(
        f"{api}?{urllib.parse.urlencode(params)}",
        headers={"User-Agent": USER_AGENT},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.load(response)
    query = data.get("query", {})

    # Requested title -> title the API answered under, following both chains
    aliases = {}
    for step in ("normalized", "redirects"):
        for entry in query.get(step, []):
            aliases[entry["from"]] = entry["to"]

    def final_title(title):
        seen = set()
        while title in aliases and title not in seen:
            seen.add(title)
            title = aliases[title]
        return title

    existing = {
        page["title"]
        for page in query.get("pages", {}).values()
        if "imageinfo" in page
    }
    resolved = {}
    for name in batch:
        title = final_title(f"File:{name}")
        if title in existing:
            resolved[name] = title[len("File:"):]
    return resolved


def pick(candidates: list, resolved: dict, local_dir: str, slug: str):
    """The wiki file if one exists, else a local override, else nothing."""
    for name in candidates:
        if name in resolved:
            return {"wiki": resolved[name]}
    if os.path.isfile(os.path.join(local_dir, f"{slug}.png")):
        return {"local": f"{slug}.png"}
    return None


def slugify(name: str) -> str:
    return name.replace(" ", "_").lower()


def pick_all(candidates: list, resolved: dict, local_dir: str, slug: str) -> list:
    """The same choice as pick, as a one-item list, or empty when nothing exists."""
    chosen = pick(candidates, resolved, local_dir, slug)
    return [chosen] if chosen else []
