from classes import Character, Version, version_data
from functions import get_version, get_current_timestamp
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


def generate_data_file():
    # Read and sort character data
    character_version_data = []
    with open('data/chars.csv', newline='') as f:
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
    with open("docs/assets/data.json", "w") as f:
        f.write(json.dumps(data, indent=4, default=vars))
