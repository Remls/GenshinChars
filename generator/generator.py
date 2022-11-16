from classes import Character, version_data
from functions import get_version, get_current_timestamp, load_template
import csv, json, re

character_version_data = []
with open('data/chars.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        char = Character(row)
        character_version_data.append(char)
    character_version_data.sort(reverse=True)

output = load_template()
search = r"\[CHAR (.+)\]"
replace = r"""<template x-for="char in filterCharacterData({\1})">
    <div @click="showCharSheet(char.name)" class="character-links">
        <img width="20" height="20" :src="getPortraitPhoto(char.photo)">
        <span class="gi-font clickable" :class="char.element ? `el-${char.element.toLowerCase()}` : 'el-unknown'"
            x-text="char.display_name || char.name">
        </span>
    </div>
</template>"""
output = re.sub(search, replace, output)
with open("docs/index.html", "w") as f:
    f.write(output)

with open("docs/assets/data.json", "w") as f:
    chars = {}
    for el in character_version_data:
        char_data = el.input_row
        # char_data["release_version"] = el.get_version_data()
        char_data["release_date"] = el.release_date
        char_data["photo"] = el.get_character_image_filename()
        char_data["is_released"] = el.is_released()
        # Cleanup missing strings
        for k in char_data:
            if not char_data[k] and not isinstance(char_data[k], bool):
                char_data[k] = None
        chars[el.input_row["name"]] = char_data
    data = {
        "version": get_version(),
        "last_updated": get_current_timestamp(),
        "characters": chars,
        "versions": version_data
    }
    f.write(json.dumps(data, default=vars, separators=(',', ':')))