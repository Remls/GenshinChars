import csv, urllib.parse

GENSHIN_WIKI = "https://genshin-impact.fandom.com/wiki/"
WEAPONS = ["Bow", "Catalyst", "Claymore", "Polearm", "Sword", "Unknown"]
ELEMENTS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo", "Unknown"]
RARITIES = ["5", "4", "Unknown"]


def get_title_with_image(key: str, ext = "svg") -> str:
    if key == "Unknown":
        return f"<b>{key}</b>"
    else:
        return f"<img width=\"50\" height=\"50\" src=\"assets/{key}.{ext}\"><br><b>{key}</b>"

def get_wiki_link_to_char(char_name: str, display_name: str) -> str:
    if not display_name:
        display_name = char_name
    link = GENSHIN_WIKI + urllib.parse.quote(char_name.replace(" ", "_"))
    return f"<a href=\"{link}\">{display_name}</a>"


table_data = {}
for w in WEAPONS:
    table_data[w] = {}
    for e in ELEMENTS:
        table_data[w][e] = [];

rarity_data = {}
for r in RARITIES:
    rarity_data[r] = {}
    for w in WEAPONS:
        rarity_data[r][w] = 0;
    for e in ELEMENTS:
        rarity_data[r][e] = 0;

with open('chars.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        w = row['weapon']  or "Unknown"
        e = row['element'] or "Unknown"
        table_data[w][e].append(get_wiki_link_to_char(row['name'], row['display_name']))
        for r in RARITIES:
            if row['rarity'] == r:
                rarity_data[r][w] += 1
                rarity_data[r][e] += 1
                break

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
output = output.replace("[HEADERS]", "\n".join(headers))

table = []
for e in ELEMENTS:
    line = f"<tr><td align=\"center\">{get_title_with_image(e)}</td>"
    for w in WEAPONS:
        line += f"<td>{',<br>'.join(table_data[w][e])}</td>"
    rarity_display = []
    for r in RARITIES:
        r = f"{r}✭" if r != "Unknown" else r
        rarity_display.append(f"{r} {rarity_data[r][e]}")
    line += f"<td>{'<br>'.join(rarity_display)}</td>"
    line += "</tr>"
    table.append(line)
output = output.replace("[TABLE]", "\n".join(table))

with open("README.md", "w") as f:
    f.write(output)