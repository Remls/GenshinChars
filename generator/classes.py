from datetime import datetime
import csv
import requests

FALLBACK_PHOTO = "assets/images/Fallback.png"
# Cache is shared between full photo and profile photo
# (It assumes that if one exists, the other will as well)
photo_results_cache = {}

class Version:
    def __init__(self, row: dict):
        self.version_number = row['version']
        self.version_name = row['name']
        self.release_date = row['release_date'] or None

# List of version data, for use with Character.get_version_data()
version_data = {}
with open('data/versions.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        version_data[row["version"]] = Version(row)


class Character:
    def __init__(self, row: dict):
        self.input_row = row
        self.release_version = row['release_version'] or None

        if row['release_date']:
            if row['release_date'] == '?':
                self.release_date = None
            else:
                self.release_date = row['release_date']
        elif self.release_version:
            self.release_date = self.get_version_data().release_date
        else:
            self.release_date = None

    def get_version_data(self) -> Version:
        if self.release_version:
            return version_data[self.release_version]
        return None

    def get_formatted_char_name(self) -> str:
        char_name = self.input_row['name']
        display_name = self.input_row['display_name'] or char_name
        element = self.input_row['element'].lower() if self.input_row['element'] else "unknown"
        return f"""<div @click="showCharSheet('{char_name}')" class="character-links">
                {self.get_character_image()} <span class="gi-font el-{element} clickable">{display_name}</span>
            </div>"""

    def get_character_image(self) -> str:
        char_name = self.input_row['name'].replace(" ", "_").lower()
        url = f"https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/{char_name}.png"
        if char_name in photo_results_cache:
            if photo_results_cache[char_name] == False:
                url = FALLBACK_PHOTO
        else:
            print(f"Loading {char_name} ...")
            r = requests.get(url)
            photo_results_cache[char_name] = r.ok
            if not r.ok:
                url = FALLBACK_PHOTO
        return f"<img width=\"20\" height=\"20\" src=\"{url}\">"

    def get_link_to_full_character_image(self) -> str:
        char_name = self.input_row['name'].replace(" ", "_").lower()
        url = f"https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/full/{char_name}.png"
        if char_name in photo_results_cache:
            if photo_results_cache[char_name] == False:
                url = None
        else:
            print(f"Loading {char_name} ...")
            r = requests.get(url)
            photo_results_cache[char_name] = r.ok
            if not r.ok:
                url = None
        return url

    def get_formatted_release_date(self) -> str:
        if self.release_date:
            date = datetime.strptime(self.release_date, "%Y-%m-%d")
            return date.strftime("%Y %B %-d")
        return None

    def __eq__(self, other) -> bool:
        return (self.release_version == other.release_version and
            self.release_date == other.release_date)
    
    def __lt__(self, other) -> bool:
        if self.release_version:
            if other.release_version:
                if self.release_date:
                    if other.release_date:
                        return self.release_date < other.release_date
                    else:
                        # other is bigger because it is None
                        return True
                else:
                    if other.release_date:
                        # self is bigger because it is None
                        return False
                    else:
                        # they are both None, so compare versions now
                        return self.release_version < other.release_version
            else:
                # other is bigger because it is None
                return True
        else:
            # self is bigger because it is None, or
            # they are both None and therefore equal
            return False
