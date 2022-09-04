from classes import Character
from constants import WEAPONS, ELEMENTS, RARITIES, GENDERS, REGIONS, RARITY_ICONS, GENDER_ICONS, REGION_ICONS
from functions import load_template, get_title_with_image, get_wiki_link_to_char, get_counter_data
from datetime import datetime
import csv


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

character_version_data = []


# GENERATED FUNCTIONS
def get_rarity_data(key: str) -> str:
    return get_counter_data(rarity_data, RARITIES, RARITY_ICONS, key)
def get_gender_data(key: str) -> str:
    return get_counter_data(gender_data, GENDERS, GENDER_ICONS, key)
def get_region_data(key: str) -> str:
    return get_counter_data(region_data, REGIONS, REGION_ICONS, key)




with open('data/chars.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        char = get_wiki_link_to_char(row)
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
        character_version_data.append(Character(row))
    character_version_data.sort(reverse=True)

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
    line += f"<td class=\"totals-cells center\">{get_rarity_data(e)}</td>"
    # Gender data for this element
    line += f"<td class=\"totals-cells center\">{get_gender_data(e)}</td>"
    # Region data for this element
    line += f"<td class=\"totals-cells center\">{get_region_data(e)}</td>"

    line += "</tr>"
    table.append(line)

line = f"<tr><td class=\"label-column\"><b>RARITY</b></td>"
for w in WEAPONS:
    # Rarity data for this weapon type
    line += f"<td class=\"totals-cells center\">{get_rarity_data(w)}</td>"
line += f"<td class=\"transparent-rb totals-cells center\">{get_rarity_data('Total')}</td>"
line += "<td class=\"transparent-rb totals-cells\"></td>"
line += "<td class=\"transparent-b totals-cells\"></td></tr>"
table.append(line)

line = f"<tr><td class=\"label-column\"><b>GENDER</b></td>"
for w in WEAPONS:
    # Gender data for this weapon type
    line += f"<td class=\"totals-cells center\">{get_gender_data(w)}</td>"
line += "<td class=\"transparent-rb totals-cells\"></td>"
line += f"<td class=\"transparent-rb totals-cells center\">{get_gender_data('Total')}</td>"
line += "<td class=\"transparent-b totals-cells\"></td></tr>"
table.append(line)

line = f"<tr><td class=\"label-column\"><b>REGION</b></td>"
for w in WEAPONS:
    # Region data for this weapon type
    line += f"<td class=\"totals-cells center\">{get_region_data(w)}</td>"
line += "<td class=\"transparent-r totals-cells\"></td>"
line += "<td class=\"transparent-r totals-cells\"></td>"
line += f"<td class=\"totals-cells center\">{get_region_data('Total')}</td></tr>"
table.append(line)

output = output.replace("[TABLE]", "\n".join(table))

character_version_table = []
for cv in character_version_data:
    line = "<tr>"
    line += f"<td>{get_wiki_link_to_char(cv.input_row)}</td>"
    if cv.release_version:
        ver = cv.get_version_data()
        if ver.version_name:
            line += f"<td>v{ver.version_number}: {ver.version_name}</td>"
        else:
            line += f"<td>v{ver.version_number}</td>"
        if cv.release_date:
            line += f"<td>{cv.get_formatted_release_date()}</td>"
        else:
            line += f"<td class=\"center\"><span class=\"text-unknown\">Unknown</span></td>"
    else:
        line += f"<td class=\"center\" colspan=\"2\"><span class=\"text-unknown\">Unknown</span></td>"
    line += "</tr>"
    character_version_table.append(line)
output = output.replace("[VERSION_TABLE]", "\n".join(character_version_table))

output = output.replace("[LAST_UPDATED]", str(datetime.utcnow()))

with open("docs/index.html", "w") as f:
    f.write(output)