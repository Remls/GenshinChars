import json
import os
import urllib.parse
import urllib.request

GENSHIN_API = "https://genshin-impact.fandom.com/api.php"
HSR_API = "https://honkai-star-rail.fandom.com/api.php"
USER_AGENT = "GenshinChars image resolver (https://chars.remls.io)"
BATCH_SIZE = 50


def query(api: str, titles: list, params: dict) -> dict:
    """Map each requested title to the page the API answered with, or None.

    Redirect and normalisation chains are followed, so the page carries the title
    the wiki really uses. That matters for files: a File page can be a redirect,
    and the CDN answers a redirect's name with a placeholder image rather than an
    error.
    """
    pages = {}
    unique = sorted(set(titles))
    for i in range(0, len(unique), BATCH_SIZE):
        pages.update(_query_batch(api, unique[i:i + BATCH_SIZE], params))
    return {title: pages.get(title) for title in titles}


def _query_batch(api: str, batch: list, params: dict) -> dict:
    search = urllib.parse.urlencode({
        "action": "query",
        "format": "json",
        "redirects": 1,
        "titles": "|".join(batch),
        **params,
    })
    request = urllib.request.Request(
        f"{api}?{search}", headers={"User-Agent": USER_AGENT}
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        data = json.load(response)
    # An error, including throttling, comes back as HTTP 200 with no "query".
    # Treating that as an empty answer would silently blank every image in the
    # batch and hand the result to CI as a real change.
    if "query" not in data:
        raise RuntimeError(f"Wiki API returned no results: {data}")
    result = data["query"]

    aliases = {}
    for step in ("normalized", "redirects"):
        for entry in result.get(step, []):
            aliases[entry["from"]] = entry["to"]

    def final_title(title):
        seen = set()
        while title in aliases and title not in seen:
            seen.add(title)
            title = aliases[title]
        return title

    by_title = {page["title"]: page for page in result.get("pages", {}).values()}
    pages = {}
    for title in batch:
        page = by_title.get(final_title(title))
        pages[title] = None if page is None or "missing" in page else page
    return pages


def resolve(api: str, filenames: list) -> dict:
    """Map each requested filename to the filename it really lives under.

    Missing files are absent from the result.
    """
    titles = [f"File:{name}" for name in filenames]
    pages = query(api, titles, {"prop": "imageinfo", "iiprop": "url"})
    resolved = {}
    for name in filenames:
        page = pages.get(f"File:{name}")
        if page and "imageinfo" in page:
            resolved[name] = page["title"][len("File:"):]
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
