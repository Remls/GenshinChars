from classes import Character, Version, version_data
from functions import get_version, get_current_timestamp
from datetime import datetime
import csv, json
import domain_images
import wiki_images


def release_sort_key(release_date, version_release_date, name):
    return (release_date or version_release_date or "9999-12-31", name)


def empty_strings_to_null(data):
    for k in data:
        if isinstance(data[k], Version):
            class_properties = vars(data[k])
            data[k] = empty_strings_to_null(class_properties)
            continue
        if not data[k] and not isinstance(data[k], bool):
            data[k] = None
    return data



# Characters whose gender the player picks have art per twin. Female first, so
# the modal shows them in the order the names sort
GENSHIN_TWINS = {"Traveler": ("Lumine", "Aether")}


def genshin_form_art(name: str, form: dict) -> list:
    twins = GENSHIN_TWINS.get(name)
    if not twins or not form.get("element"):
        return []
    return [f"Character {twin} Game {form['element']}.png" for twin in twins]


def genshin_images(characters: list) -> dict:
    """Resolve every Genshin character's chip icon and full art against the wiki.

    Icon candidates are tried per form first, so a character whose forms have
    their own art gets it; full art has no per-form variants.
    """
    wanted = []
    for char in characters:
        name = char.input_row["name"]
        wanted.append(f"{name} Icon.png")
        wanted.append(f"Character {name} Full Wish.png")
        wanted.append(f"Character {name} Game.png")
        for form in char.forms:
            if form["display_name"]:
                wanted.append(f"{form['display_name']} Icon.png")
            wanted.extend(genshin_form_art(name, form))
    resolved = wiki_images.resolve(wiki_images.GENSHIN_API, wanted)

    images = {}
    for char in characters:
        name = char.input_row["name"]
        slug = wiki_images.slugify(name)
        photos, form_art = [], []
        for form in char.forms:
            candidates = []
            if form["display_name"]:
                candidates.append(f"{form['display_name']} Icon.png")
            candidates.append(f"{name} Icon.png")
            photos.append(wiki_images.pick(
                candidates, resolved, "docs/assets/images/characters", slug
            ))
            form_art.append([
                {"wiki": resolved[c]}
                for c in genshin_form_art(name, form) if c in resolved
            ])
        images[name] = {
            "photo": photos[0],
            "form_photos": photos,
            "form_art": form_art,
            "full_photo": wiki_images.pick_all(
                [f"Character {name} Full Wish.png", f"Character {name} Game.png"],
                resolved, "docs/assets/images/full-characters", slug,
            ),
        }
    return images


# The wiki spells the path out where the data uses the short name
HSR_PATH_LABELS = {"Hunt": "The Hunt"}


def hsr_icon_candidates(name: str, form: dict) -> list:
    candidates = []
    if form.get("display_name"):
        candidates.append(f"Character {form['display_name']} Icon.png")
    if form.get("path"):
        label = HSR_PATH_LABELS.get(form["path"], form["path"])
        candidates.append(f"Character {name} ({label}) Icon.png")
    candidates.append(f"Character {name} Icon.png")
    return candidates


def hsr_form_art(name: str, form: dict, gender: str, multi_form: bool) -> list:
    """Splash art for a character whose forms have their own.

    A character with several paths has one per path, and an either-gendered one
    has that per gender as well. A single-path character has none, so asking
    would be a lookup that always misses.
    """
    if not form.get("path") or not multi_form:
        return []
    label = HSR_PATH_LABELS.get(form["path"], form["path"])
    if gender == "Either":
        return [f"Character {name} ({letter}) {label} Splash Art.png"
                for letter in ("F", "M")]
    return [f"Character {name} ({label}) Splash Art.png"]


def hsr_images(rows: list, forms_by_name: dict, genders: dict) -> dict:
    wanted = []
    for name, forms in forms_by_name.items():
        wanted.append(f"Character {name} Splash Art.png")
        for form in forms:
            wanted.extend(hsr_icon_candidates(name, form))
            wanted.extend(
                hsr_form_art(name, form, genders.get(name), len(forms) > 1))
    resolved = wiki_images.resolve(wiki_images.HSR_API, wanted)

    images = {}
    for name, forms in forms_by_name.items():
        slug = wiki_images.slugify(name)
        photos, form_art = [], []
        for form in forms:
            photos.append(wiki_images.pick(
                hsr_icon_candidates(name, form), resolved,
                "docs/hsr/assets/images/characters", slug,
            ))
            form_art.append([
                {"wiki": resolved[c]}
                for c in hsr_form_art(name, form, genders.get(name), len(forms) > 1)
                if c in resolved
            ])
        images[name] = {
            "photo": photos[0],
            "form_photos": photos,
            "form_art": form_art,
            "full_photo": wiki_images.pick_all(
                [f"Character {name} Splash Art.png"],
                resolved, "docs/hsr/assets/images/full-characters", slug,
            ),
        }
    return images


def generate_characters_file():
    # Read and sort character data
    character_version_data = []
    with open('data/characters.csv', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            char = Character(row)
            character_version_data.append(char)
        character_version_data.sort(key=lambda c: release_sort_key(
            c.release_date,
            c.get_version_data().release_date if c.get_version_data() else None,
            c.input_row["name"],
        ), reverse=True)

    images = genshin_images(character_version_data)

    # Format data for JSON
    chars = {}
    for el in character_version_data:
        el: Character = el
        char_data = el.input_row
        char_data["arkhe"] = el.arkhe
        char_data["forms"] = el.forms
        # Character-level values are the debut form's, so sorting and the
        # character sheet keep working on single-form characters
        for column in ("element", "weapon", "release_version"):
            char_data[column] = el.forms[0][column]
        char_data["display_name"] = el.display_name
        char_data["release_date"] = el.release_date
        resolved_images = images[el.input_row["name"]]
        char_data["photo"] = resolved_images["photo"]
        char_data["full_photo"] = resolved_images["full_photo"]
        for form, photo, art in zip(
            el.forms, resolved_images["form_photos"], resolved_images["form_art"]
        ):
            form["photo"] = photo
            form["full_photo"] = art or resolved_images["full_photo"]
        char_data["is_released"] = el.is_released()
        char_data["is_outdated"] = el.is_outdated()
        char_data["notes"] = el.get_notes()
        chars[el.input_row["name"]] = empty_strings_to_null(char_data)
    data = {
        "version": get_version(),
        "last_updated": get_current_timestamp(),
        "characters": chars,
        "versions": empty_strings_to_null(version_data)
    }

    # Write to JSON file
    with open("docs/assets/characters.json", "w") as f:
        f.write(json.dumps(data, indent=4, default=vars, ensure_ascii=False))


def generate_hsr_characters_file():
    versions = {}
    with open('data/hsr/versions.csv', newline='') as f:
        for row in csv.DictReader(f):
            versions[row["version"]] = {
                "version_number": row["version"],
                "display_version_number": row["display_version_number"] or "v" + row["version"],
                "version_name": row["name"] or None,
                "release_date": row["release_date"] or None,
            }

    characters = []
    with open('data/hsr/characters.csv', newline='') as f:
        for row in csv.DictReader(f):
            paths = [p.strip() for p in row["path"].split(";") if p.strip()]
            types = [t.strip() for t in row["combat_type"].split(";") if t.strip()]
            forms = [
                {"path": p or None, "combat_type": t or None}
                for p, t in zip(paths, types)
            ] or [{"path": None, "combat_type": None}]
            display_parts = [d.strip() for d in row["display_name"].split(";")]
            # A split display_name names the forms, not the character
            display_name = None if len(display_parts) > 1 else (row["display_name"] or None)
            if len(display_parts) > 1:
                for i, form in enumerate(forms):
                    if i < len(display_parts) and display_parts[i]:
                        form["display_name"] = display_parts[i]
            # A single release covers every form. ";"-separated ones map to forms
            release_versions = [v.strip() for v in row["release_version"].split(";")]
            release_dates = [d.strip() for d in row["release_date"].split(";")]
            for i, form in enumerate(forms):
                form_version = release_versions[i if i < len(release_versions) else 0]
                form_date = release_dates[i if i < len(release_dates) else 0]
                if form_date == "R":
                    form_date = versions[form_version]["release_date"]
                form["release_version"] = form_version or None
                form["release_date"] = form_date or None
            release_version = release_versions[0]
            release_date = release_dates[0] or None
            if release_date == "R":
                release_date = versions[release_version]["release_date"]
            characters.append({
                "name": row["name"],
                "display_name": display_name,
                "rarity": row["rarity"] or None,
                "forms": forms,
                "gender": row["gender"] or None,
                "world": row["world"] or None,
                "release_version": release_version or None,
                "release_date": release_date,
                "is_released": bool(release_date) and release_date <= datetime.now().strftime("%Y-%m-%d"),
            })
    images = hsr_images(
        characters,
        {c["name"]: c["forms"] for c in characters},
        {c["name"]: c["gender"] for c in characters},
    )
    for character in characters:
        resolved = images[character["name"]]
        character["photo"] = resolved["photo"]
        character["full_photo"] = resolved["full_photo"]
        for form, photo, art in zip(
            character["forms"], resolved["form_photos"], resolved["form_art"]
        ):
            form["photo"] = photo
            form["full_photo"] = art or resolved["full_photo"]

    # Newest releases first. Unreleased characters use their version's projected
    # date, and characters with no version at all come before those
    characters.sort(key=lambda c: release_sort_key(
        c["release_date"],
        (versions.get(c["release_version"]) or {}).get("release_date"),
        c["name"],
    ), reverse=True)

    data = {
        "version": get_version(),
        "last_updated": get_current_timestamp(),
        "characters": {c["name"]: c for c in characters},
        "versions": versions,
    }
    with open("docs/hsr/assets/characters.json", "w") as f:
        f.write(json.dumps(data, indent=4, ensure_ascii=False))


def generate_hsr_domains_file():
    with open('data/hsr/domains.json') as f:
        domains_data = json.load(f)
    data = {
        "version": get_version(),
        "last_updated": get_current_timestamp(),
        **domains_data,
    }
    with open("docs/hsr/assets/domains.json", "w") as f:
        f.write(json.dumps(data, indent=4, ensure_ascii=False))


def generate_domains_file():
    with open('data/domains.json') as f:
        domains_data = json.load(f)

    # Image filenames are resolved here rather than in the browser, the way the
    # HSR data already carries them
    print("Resolving domain images ...")
    groups = [domains_data["rewards"],
              domains_data.get("specialties", {}),
              domains_data.get("other_materials", {})]
    images = domain_images.item_images(*groups)
    for group in groups:
        for entry in group.values():
            entry["image"] = images.get(entry["name"])
    for domain, resolved in domain_images.domain_images(domains_data["domains"]).items():
        for entry in domains_data["domains"]:
            if entry["name"] == domain:
                entry.update(resolved)

    data = {
        "version": get_version(),
        "last_updated": get_current_timestamp(),
        **domains_data,
    }
    with open("docs/assets/domains.json", "w") as f:
        f.write(json.dumps(data, indent=4, ensure_ascii=False))
