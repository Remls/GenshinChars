import csv, urllib.parse

GENSHIN_WIKI = "https://genshin-impact.fandom.com/wiki/"
WEAPONS = ["Bow", "Catalyst", "Claymore", "Polearm", "Sword"]
ELEMENTS = ["Anemo", "Geo", "Electro", "Dendro", "Hydro", "Pyro", "Cryo"]


def generate_image(key: str, ext = "svg") -> str:
    return f"<img width=\"50\" height=\"50\" src=\"assets/{key}.{ext}\">"

def get_wiki_link_to_char(char: str) -> str:
    link = GENSHIN_WIKI + urllib.parse.quote(char.replace(" ", "_"))
    return f"<a href=\"{link}\">{char}</a>"


# Create 2D dict
data = {}
for w in WEAPONS:
    data[w] = {}
    for e in ELEMENTS:
        data[w][e] = [];

with open('chars.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        w = row['weapon']
        e = row['element']
        if w and e:
            data[w][e].append(get_wiki_link_to_char(row['name']))

# Build output
output = """
<table>
<tr>
<th></th>
[HEADERS]
</tr>
[TABLE]
</table>
"""

headers = []
for w in WEAPONS:
    headers.append(f"<th align=\"center\">{generate_image(w, 'webp')}</th>")
output = output.replace("[HEADERS]", "\n".join(headers))

table = []
for e in ELEMENTS:
    line = f"<tr><td align=\"center\">{generate_image(e)}</td>"
    for w in WEAPONS:
        line += f"<td>{',<br>'.join(data[w][e])}</td>"
    line += "</tr>"
    table.append(line)
output = output.replace("[TABLE]", "\n".join(table))
    

with open("README.md", "w") as f:
    f.write(output)