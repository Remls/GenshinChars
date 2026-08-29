import re

import wiki_images

API = wiki_images.GENSHIN_API

# Talent materials are stored under the family name; the wiki files them under
# the tier page they share
WIKI_ALT_NAMES = {
    'Freedom':      'Teachings of Freedom',
    'Resistance':   'Teachings of Resistance',
    'Ballad':       'Teachings of Ballad',
    'Prosperity':   'Teachings of Prosperity',
    'Diligence':    'Teachings of Diligence',
    'Gold':         'Teachings of Gold',
    'Transience':   'Teachings of Transience',
    'Elegance':     'Teachings of Elegance',
    'Light':        'Teachings of Light',
    'Admonition':   'Teachings of Admonition',
    'Ingenuity':    'Teachings of Ingenuity',
    'Praxis':       'Teachings of Praxis',
    'Equity':       'Teachings of Equity',
    'Justice':      'Teachings of Justice',
    'Order':        'Teachings of Order',
    'Contention':   'Teachings of Contention',
    'Kindling':     'Teachings of Kindling',
    'Conflict':     'Teachings of Conflict',
    'Moonlight':    'Teachings of Moonlight',
    'Elysium':      'Teachings of Elysium',
    'Vagrancy':     'Teachings of Vagrancy',
    'Charity':      'Teachings of Charity',
    'Fortitude':    'Teachings of Fortitude',
    'Glory':        'Teachings of Glory',
}

# Bosses whose archive icon file ("{name} Icon.png") uses a different base name
# than their wiki page
BOSS_ICON_ALIASES = {
    'Stormterror Dvalin': 'Stormterror',
    'Childe':             'Childe P3',
    'Rhodeia of Loch':    'Oceanid',
}

# Artifact set pages have no image of their own, so a piece stands in
PIECE_SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet']


def _title_of(name):
    return WIKI_ALT_NAMES.get(name, name)


def _strip(name):
    return re.sub(r'\s*\([^)]*\)$', '', name)


def _paren(name):
    match = re.search(r'\(([^)]*)\)$', name)
    return match.group(1) if match else None


def item_images(*groups: dict) -> dict:
    """Map every reward, specialty and other-material name to its wiki image
    filename, or None.

    Guessing filenames is not enough: some drop characters like ":", artifact
    sets have no image of their own, and the CDN answers requests for
    nonexistent files with a placeholder image instead of an error.
    """
    names = {entry["name"] for group in groups for entry in group.values()}
    queryable = sorted(name for name in names if not name.startswith("???"))

    images = {}
    without_image = []
    pages = wiki_images.query(
        API, [_title_of(name) for name in queryable],
        {"prop": "pageimages", "piprop": "name"},
    )
    for name in queryable:
        page = pages.get(_title_of(name))
        if page is None:
            images[name] = None
        # Only trust item images. A page's lead image can be something else
        # entirely, such as a version promo on an artifact set page
        elif page.get("pageimage", "").startswith("Item_"):
            images[name] = page["pageimage"]
        else:
            without_image.append(name)

    pages = wiki_images.query(
        API, [_title_of(name) for name in without_image],
        {"prop": "revisions", "rvprop": "content", "rvslots": "main"},
    )
    for name in without_image:
        page = pages.get(_title_of(name)) or {}
        wikitext = ""
        revisions = page.get("revisions")
        if revisions:
            wikitext = revisions[0].get("slots", {}).get("main", {}).get("*", "")
        piece = None
        for slot in PIECE_SLOTS:
            match = re.search(r'\|\s*%s\s*=\s*([^\n|}]+)' % slot, wikitext)
            if match:
                piece = match.group(1).strip()
                break
        images[name] = f"Item_{piece.replace(' ', '_')}.png" if piece else None
    return images


def domain_images(domains: list) -> dict:
    """Map every domain name to its thumbnail, the page its name links to, and
    the boss it shows, if any.

    The parenthetical part of a weekly boss name is the boss, whose page has a
    portrait. The stripped name is the page the row links to.
    """
    entries = {}
    for domain in domains:
        if domain["name"].startswith("???") or domain["name"] in entries:
            continue
        entries[domain["name"]] = domain["type"]

    titles = set()
    boss_titles = set()
    for name, domain_type in entries.items():
        titles.add(_strip(name))
        boss = _paren(name)
        if boss:
            titles.add(boss)
            boss_titles.add(boss)
        elif domain_type == "normal_bosses":
            boss_titles.add(_strip(name))

    pages = wiki_images.query(
        API, sorted(titles), {"prop": "pageimages", "piprop": "name"}
    )

    def icon_file_for(title):
        page = pages.get(title)
        final_title = page["title"] if page else title
        base = (BOSS_ICON_ALIASES.get(title)
                or BOSS_ICON_ALIASES.get(final_title)
                or final_title)
        return f"{base.replace(':', '')} Icon.png"

    # Bosses have in-game archive icons, which read better than the artwork the
    # page itself carries
    icon_titles = sorted({icon_file_for(title) for title in boss_titles})
    icon_pages = wiki_images.query(
        API, [f"File:{title}" for title in icon_titles], {}
    )
    icon_files = {}
    for title in icon_titles:
        page = icon_pages.get(f"File:{title}")
        if page:
            icon_files[title] = page["title"][len("File:"):]

    def image_of(title):
        page = pages.get(title)
        return page.get("pageimage") if page else None

    def boss_image_of(title):
        resolved = icon_files.get(icon_file_for(title))
        if resolved:
            return resolved.replace(" ", "_")
        return image_of(title)

    resolved = {}
    for name, domain_type in entries.items():
        link_title = _strip(name)
        boss_name = _paren(name)
        boss = None
        if boss_name:
            # Boss rows always show a boss portrait, never the domain
            boss = {"name": boss_name, "has_page": pages.get(boss_name) is not None}
            image = boss_image_of(boss_name)
        elif domain_type == "normal_bosses":
            image = boss_image_of(link_title)
        else:
            image = image_of(link_title)
        resolved[name] = {
            "image": image,
            "link": link_title if pages.get(link_title) else None,
            "boss": boss,
        }
    return resolved
