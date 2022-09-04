import urllib.parse
from constants import RARITY_ICONS

GENSHIN_WIKI = "https://genshin-impact.fandom.com/wiki/"


def load_template() -> str:
    file_contents = ""
    with open('data/template.html') as f:
        file_contents = f.read()
    return file_contents

def get_title_with_image(key: str, ext: str = "svg") -> str:
    if key.startswith("Unknown"):
        return "Unknown"
    else:
        return f"<img width=\"50\" height=\"50\" src=\"assets/images/{key}.{ext}\"><br>{key}"

def get_wiki_link_to_char(char: dict) -> str:
    char_name = char['name']
    display_name = char['display_name'] or char_name
    rarity = RARITY_ICONS[char['rarity']] if char['rarity'] else RARITY_ICONS["Unknown Rarity"]
    element = char['element'].lower() if char['element'] else "unknown"
    link = GENSHIN_WIKI + urllib.parse.quote(char_name.replace(" ", "_"))
    return f"<a class=\"el-{element}\" href=\"{link}\">{rarity} <span class=\"gi-font\">{display_name}</span></a>"

def get_counter_data(data: dict, possible_keys: list, key_icons: dict, input: str) -> str:
    display = []
    for k in possible_keys:
        count = data[k][input]
        icon = key_icons[k]
        if count > 0:
            display.append(f"<b>{icon}</b> {count}")
    return '<br>'.join(display)