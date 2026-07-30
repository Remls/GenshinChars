from classes import Character, Version, version_data
from functions import get_version, get_current_timestamp
from datetime import datetime
import csv, json


def empty_strings_to_null(data):
    for k in data:
        if isinstance(data[k], Version):
            class_properties = vars(data[k])
            data[k] = empty_strings_to_null(class_properties)
            continue
        if not data[k] and not isinstance(data[k], bool):
            data[k] = None
    return data


def generate_characters_file():
    # Read and sort character data
    character_version_data = []
    with open('data/characters.csv', newline='') as f:
        reader = csv.DictReader(f)
        for row in reader:
            char = Character(row)
            character_version_data.append(char)
        character_version_data.sort(reverse=True)

    # Format data for JSON
    chars = {}
    for el in character_version_data:
        el: Character = el
        char_data = el.input_row
        char_data["arkhe"] = el.arkhe
        char_data["release_date"] = el.release_date
        char_data["photo"] = el.get_character_image_link()
        char_data["full_photo"] = el.get_character_full_image_link()
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
            # A single display_name covers the character; ";"-separated ones map to forms
            display_parts = [d.strip() for d in row["display_name"].split(";")]
            display_name = row["display_name"] or None
            if len(display_parts) > 1:
                display_name = display_parts[0] or None
                for i, form in enumerate(forms):
                    if i < len(display_parts) and display_parts[i]:
                        form["display_name"] = display_parts[i]
            release_date = row["release_date"] or None
            if release_date == "R":
                release_date = versions[row["release_version"]]["release_date"]
            characters.append({
                "name": row["name"],
                "display_name": display_name,
                "rarity": row["rarity"] or None,
                "forms": forms,
                "gender": row["gender"] or None,
                "world": row["world"] or None,
                "release_version": row["release_version"] or None,
                "release_date": release_date,
                "is_released": bool(release_date) and release_date <= datetime.now().strftime("%Y-%m-%d"),
            })
    # Newest releases first; characters with no known date before those
    characters.sort(key=lambda c: (c["release_date"] or "9999-12-31", c["name"]), reverse=True)

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
    data = {
        "version": get_version(),
        "last_updated": get_current_timestamp(),
        **domains_data,
    }
    with open("docs/assets/domains.json", "w") as f:
        f.write(json.dumps(data, indent=4, ensure_ascii=False))
