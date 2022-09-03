import csv, urllib.parse

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


# FUNCTIONS
def get_title_with_image(key: str, ext = "svg") -> str:
    if key.startswith("Unknown"):
        return f"<b>Unknown</b>"
    else:
        return f"<img width=\"50\" height=\"50\" src=\"assets/{key}.{ext}\"><br><b>{key}</b>"

def get_wiki_link_to_char(char_name: str, display_name: str, rarity: str) -> str:
    display_name = display_name or char_name
    rarity = RARITY_ICONS[rarity] if rarity else RARITY_ICONS["Unknown Rarity"]
    link = GENSHIN_WIKI + urllib.parse.quote(char_name.replace(" ", "_"))
    return f"<a href=\"{link}\">{rarity}&nbsp;{display_name}</a>"

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




with open('chars.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        w = row['weapon']  or "Unknown Weapon"
        e = row['element'] or "Unknown Element"
        table_data[w][e].append(get_wiki_link_to_char(row['name'], row['display_name'], row['rarity']))
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

# Build output
output = """
<table>
<tr>
<th></th>
[HEADERS]
</tr>
[TABLE]
</table>

\* Does not include the Traveler.
"""

headers = []
for w in WEAPONS:
    headers.append(f"<th align=\"center\">{get_title_with_image(w, 'webp')}</th>")
headers.append(f"<th align=\"center\"><b>RARITY</b></th>")
headers.append(f"<th align=\"center\"><b>GENDER</b></th>")
headers.append(f"<th align=\"center\"><b>REGION</b></th>")
output = output.replace("[HEADERS]", "\n".join(headers))

table = []
for e in ELEMENTS:
    line = f"<tr><td align=\"center\">{get_title_with_image(e)}</td>"
    for w in WEAPONS:
        line += f"<td>{'<br>'.join(table_data[w][e])}</td>"

    # Rarity data for this element
    line += f"<td align=\"center\">{get_rarity_data(e)}</td>"
    # Gender data for this element
    line += f"<td align=\"center\">{get_gender_data(e)}</td>"
    # Region data for this element
    line += f"<td align=\"center\">{get_region_data(e)}</td>"

    line += "</tr>"
    table.append(line)

line = f"<tr><td align=\"center\"><b>RARITY</b></td>"
for w in WEAPONS:
    # Rarity data for this weapon type
    line += f"<td align=\"center\">{get_rarity_data(w)}</td>"
line += f"<td align=\"center\">{get_rarity_data('Total')}</td><td></td><td></td></tr>"
table.append(line)

line = f"<tr><td align=\"center\"><b>GENDER</b></td>"
for w in WEAPONS:
    # Gender data for this weapon type
    line += f"<td align=\"center\">{get_gender_data(w)}</td>"
line += f"<td></td><td align=\"center\">{get_gender_data('Total')}</td><td></td></tr>"
table.append(line)

line = f"<tr><td align=\"center\"><b>REGION</b></td>"
for w in WEAPONS:
    # Region data for this weapon type
    line += f"<td align=\"center\">{get_region_data(w)}</td>"
line += f"<td></td><td></td><td align=\"center\">{get_region_data('Total')}</td></tr>"
table.append(line)

output = output.replace("[TABLE]", "\n".join(table))

with open("README.md", "w") as f:
    f.write(output)