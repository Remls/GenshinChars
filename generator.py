import csv, urllib.parse
from datetime import datetime

# CONSTANTS
GENSHIN_WIKI = "https://genshin-impact.fandom.com/wiki/"
WEAPONS = ["Bow", "Catalyst", "Claymore", "Polearm", "Sword", "Unknown Weapon"]
ELEMENTS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo", "Unknown Element"]
RARITIES = ["5", "4", "Unknown Rarity"]
RARITY_ICONS = {"5": "⑤", "4": "④", "Unknown Rarity": "◯"}
GENDERS = ["Male", "Female", "Unknown Gender"]
GENDER_ICONS = {"Male": "♂", "Female": "♀", "Unknown Gender": "?"}
REGIONS = ["Mondstadt", "Liyue", "Inazuma", "Sumeru", "Fontaine", "Natlan", "Snezhnaya", "Khaenri'ah", "Unknown Region"]
REGION_ICONS = {
    "Mondstadt" : "Md",
    "Liyue"     : "Ly",
    "Inazuma"   : "In",
    "Sumeru"    : "Su",
    "Fontaine"  : "Fn",
    "Natlan"    : "Nt",
    "Snezhnaya" : "Sz",
    "Khaenri'ah": "Kh",
    "Unknown Region": "?"
}


# DATA STORES
table_data = {}
for w in WEAPONS:
    table_data[w] = {}
    for e in ELEMENTS:
        table_data[w][e] = []

rarity_data = {}
for r in RARITIES:
    rarity_data[r] = {}
    for w in WEAPONS:
        rarity_data[r][w] = 0
    for e in ELEMENTS:
        rarity_data[r][e] = 0
    rarity_data[r]["Total"] = 0

gender_data = {}
for g in GENDERS:
    gender_data[g] = {}
    for w in WEAPONS:
        gender_data[g][w] = 0
    for e in ELEMENTS:
        gender_data[g][e] = 0
    gender_data[g]["Total"] = 0

region_data = {}
for rg in REGIONS:
    region_data[rg] = {}
    for w in WEAPONS:
        region_data[rg][w] = 0
    for e in ELEMENTS:
        region_data[rg][e] = 0
    region_data[rg]["Total"] = 0

version_data = {}
with open('data/versions.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        version_data[row["version"]] = {
            "version": row["version"],
            "name": row["name"],
            "release_date": row["release_date"],
        }
character_version_data = []


# FUNCTIONS
def load_template() -> str:
    file_contents = ""
    with open('data/template.html') as f:
        file_contents = f.read()
    return file_contents

def get_title_with_image(key: str, ext = "svg") -> str:
    if key.startswith("Unknown"):
        return "Unknown"
    else:
        return f"<img width=\"50\" height=\"50\" src=\"assets/images/{key}.{ext}\"><br>{key}"

def get_wiki_link_to_char(char_name: str, display_name: str, rarity: str, element: str) -> str:
    display_name = display_name or char_name
    rarity = RARITY_ICONS[rarity] if rarity else RARITY_ICONS["Unknown Rarity"]
    element = element.lower() if element else "unknown"    
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
def get_rarity_data(key: str) -> str:
    return get_counter_data(rarity_data, RARITIES, RARITY_ICONS, key)
def get_gender_data(key: str) -> str:
    return get_counter_data(gender_data, GENDERS, GENDER_ICONS, key)
def get_region_data(key: str) -> str:
    return get_counter_data(region_data, REGIONS, REGION_ICONS, key)

def get_version(version: str) -> dict:
    return version_data[version] if version else None

def get_character_release_date(version: str, character_release_date: str) -> str:
    if character_release_date:
        if character_release_date == "?":
            return "Unknown"
        return character_release_date
    elif version:
        return version_data[version]["release_date"]
    else:
        return "Unknown"

def parse_and_reformat_date(date: str) -> str:
    date = datetime.strptime(date, "%Y-%m-%d")
    return date.strftime("%Y %B %-d")




with open('data/chars.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        char = get_wiki_link_to_char(row['name'], row['display_name'], row['rarity'], row['element'])
        w = row['weapon']  or "Unknown Weapon"
        e = row['element'] or "Unknown Element"
        table_data[w][e].append(char)
        r = row['rarity']  or "Unknown Rarity"
        rarity_data[r][w] += 1
        rarity_data[r][e] += 1
        rarity_data[r]["Total"] += 1
        g = row['gender']  or "Unknown Gender"
        gender_data[g][w] += 1
        gender_data[g][e] += 1
        gender_data[g]["Total"] += 1
        rg = row['region'] or "Unknown Region"
        region_data[rg][w] += 1
        region_data[rg][e] += 1
        region_data[rg]["Total"] += 1
        character_version_data.append({
            "character": char,
            "release_version": get_version(row['release_version']),
            # Can't be NoneType or else it doesn't sort
            "release_date": get_character_release_date(row['release_version'], row['release_date'])
        })
    character_version_data = sorted(character_version_data, key=lambda c: c['release_date'], reverse=True)

# Build output
output = load_template()

headers = []
for w in WEAPONS:
    headers.append(f"<th width=\"12%\">{get_title_with_image(w, 'webp')}</th>")
headers.append(f"<th>RARITY</th>")
headers.append(f"<th>GENDER</th>")
headers.append(f"<th>REGION</th>")
output = output.replace("[HEADERS]", "\n".join(headers))

table = []
for e in ELEMENTS:
    line = f"<tr><td class=\"label-column\">{get_title_with_image(e)}</td>"
    for w in WEAPONS:
        line += f"<td>{'<br>'.join(table_data[w][e])}</td>"

    # Rarity data for this element
    line += f"<td class=\"center\">{get_rarity_data(e)}</td>"
    # Gender data for this element
    line += f"<td class=\"center\">{get_gender_data(e)}</td>"
    # Region data for this element
    line += f"<td class=\"center\">{get_region_data(e)}</td>"

    line += "</tr>"
    table.append(line)

line = f"<tr><td class=\"label-column\"><b>RARITY</b></td>"
for w in WEAPONS:
    # Rarity data for this weapon type
    line += f"<td class=\"center\">{get_rarity_data(w)}</td>"
line += f"<td class=\"center\">{get_rarity_data('Total')}</td><td></td><td></td></tr>"
table.append(line)

line = f"<tr><td class=\"label-column\"><b>GENDER</b></td>"
for w in WEAPONS:
    # Gender data for this weapon type
    line += f"<td class=\"center\">{get_gender_data(w)}</td>"
line += f"<td></td><td class=\"center\">{get_gender_data('Total')}</td><td></td></tr>"
table.append(line)

line = f"<tr><td class=\"label-column\"><b>REGION</b></td>"
for w in WEAPONS:
    # Region data for this weapon type
    line += f"<td class=\"center\">{get_region_data(w)}</td>"
line += f"<td></td><td></td><td class=\"center\">{get_region_data('Total')}</td></tr>"
table.append(line)

output = output.replace("[TABLE]", "\n".join(table))

character_version_table = []
for row in character_version_data:
    line = "<tr>"
    line += f"<td>{row['character']}</td>"
    if row["release_version"]:
        if row["release_version"]["name"]:
            line += f"<td>v{row['release_version']['version']}: {row['release_version']['name']}</td>"
        else:
            line += f"<td>v{row['release_version']['version']}</td>"
    else:
        line += f"<td>Unknown</td>"
    date = row["release_date"]
    if date != "Unknown":
        date = parse_and_reformat_date(date)
    line += f"<td>{date}</td>"
    line += "</tr>"
    character_version_table.append(line)
output = output.replace("[VERSION_TABLE]", "\n".join(character_version_table))

output = output.replace("[LAST_UPDATED]", str(datetime.utcnow()))

with open("dist/index.html", "w") as f:
    f.write(output)