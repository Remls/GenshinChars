from datetime import datetime
from functools import cache
from functions import load_photo_cache_from_file, add_to_photo_cache_file, load_outdated_characters_list
import csv
import os
import requests

FALLBACK_PHOTO = "assets/images/Fallback.png"

def prGreen(s):
    print(f"\033[92m {s}\033[00m")

def prRed(s):
    print(f"\033[91m {s}\033[00m")


photo_cache = load_photo_cache_from_file()
outdated_characters = load_outdated_characters_list()

@cache
def has_official_photo(char_name: str) -> bool:
    print(f"Loading {char_name} (official) ...", end='')
    if photo_cache:
        if char_name in photo_cache:
            prGreen(" O (cache)")
            return True
        else:
            prRed(" X (cache)")
            return False
    url = f"https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/{char_name}.png"
    r = requests.get(url)
    if r.ok:
        prGreen(" O")
        add_to_photo_cache_file(char_name)
        return True
    else:
        prRed(" X")
        return False

@cache
def has_custom_photo(char_name: str, full_photo = False) -> bool:
    print(f"Loading {char_name} (custom {'full' if full_photo else 'portrait'}) ...", end='')
    folder_name = "full-characters" if full_photo else "characters"
    expected_filename = f"docs/assets/images/{folder_name}/{char_name}.png"
    if os.path.isfile(expected_filename):
        prGreen(" O")
        return True
    else:
        prRed(" X")
        return False

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

        if self.release_version:
            # release version known, exact date unknown
            if not row['release_date']:
                self.release_date = None
            # release on same date as version
            elif row['release_date'] == 'R':
                self.release_date = self.get_version_data().release_date
            # released during the version but sometime after the version release date
            else:
                self.release_date = row['release_date']
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
                {self.get_character_image()} <span class="gi-font el-{element} clickable">{display_name}</span>{'<sup>†</sup>' if self.is_outdated() else ''}
            </div>"""

    def get_char_slug(self) -> str:
        return self.input_row['name'].replace(" ", "_").lower()

    def is_released(self) -> bool:
        if not self.release_date:
            return False
        release = datetime.strptime(self.release_date, "%Y-%m-%d")
        return release <= datetime.now()
    
    def is_outdated(self) -> bool:
        if outdated_characters:
            return self.get_char_slug() in outdated_characters
        return False

    def get_character_image(self) -> str:
        return f"<img width=\"20\" height=\"20\" src=\"{self.get_character_image_link()}\">"

    def get_character_image_link(self) -> str:
        char_name = self.get_char_slug()
        if has_official_photo(char_name):
            url = f"https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/{char_name}.png"
        elif has_custom_photo(char_name):
            url = f"assets/images/characters/{char_name}.png"
        else:
            url = FALLBACK_PHOTO
        return url
        
    def get_character_full_image_link(self) -> str:
        char_name = self.get_char_slug()
        if has_official_photo(char_name):
            url = f"https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/full/{char_name}.png"
        elif has_custom_photo(char_name, True):
            url = f"assets/images/full-characters/{char_name}.png"
        else:
            url = FALLBACK_PHOTO
        return url

    def get_formatted_release_date(self) -> str:
        if self.release_date:
            date = datetime.strptime(self.release_date, "%Y-%m-%d")
            return date.strftime("%Y %B %-d")
        return None

    def get_formatted_birthday(self) -> str:
        birthday = self.input_row['birthday']
        if birthday:
            if birthday == "02-29":
                # Fuck you, Bennett
                return "February 29"
            date = datetime.strptime(birthday, "%m-%d")
            return date.strftime("%B %-d")
        return None
    
    def get_notes(self) -> list:
        char_name = self.get_char_slug()
        print(f"Loading {char_name} (notes) ...", end='')
        expected_filename = f"data/notes/{char_name}.txt"
        if os.path.isfile(expected_filename):
            prGreen(" O")
            lines = []
            with open(expected_filename) as file:
                for line in file:
                    lines.append(line.strip())
            return lines
        else:
            prRed(" X")
            return []

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
