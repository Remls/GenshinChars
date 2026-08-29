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
        if row['display_version_number']:
            self.display_version_number = row['display_version_number']
        else:
            self.display_version_number = 'v' + self.version_number
        self.version_name = row['name']
        self.release_date = row['release_date'] or None

# Version data keyed by version number
version_data = {}
with open('data/versions.csv', newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        version_data[row["version"]] = Version(row)


class Character:
    # A ";"-separated column defines the form count. Shorter columns fall back to
    # their first value, so a single weapon or release covers every form
    FORM_COLUMNS = ['element', 'weapon', 'arkhe', 'display_name', 'release_version', 'release_date']

    def __init__(self, row: dict):
        self.input_row = row
        self.forms = self.build_forms(row)
        self.release_version = self.forms[0]['release_version']
        self.release_date = self.forms[0]['release_date']
        self.arkhe = self.forms[0]['arkhe']
        # A split display_name names the forms, not the character
        raw_display_name = row['display_name'] or ''
        self.display_name = None if ';' in raw_display_name else (raw_display_name or None)

    def build_forms(self, row: dict) -> list:
        split = {c: [v.strip() for v in (row[c] or '').split(';')] for c in self.FORM_COLUMNS}
        count = max(len(parts) for parts in split.values())
        forms = []
        for i in range(count):
            form = {}
            for column, parts in split.items():
                form[column] = parts[i if i < len(parts) else 0] or None
            form['release_date'] = self.resolve_release_date(
                form['release_version'], form['release_date']
            )
            forms.append(form)
        return forms

    @staticmethod
    def resolve_release_date(version, date):
        # release version known, exact date unknown
        if not version or not date:
            return None
        # release on same date as version
        if date == 'R':
            return version_data[version].release_date
        # released during the version but sometime after the version release date
        return date

    def get_version_data(self) -> Version:
        if self.release_version:
            return version_data[self.release_version]
        return None

    def get_char_slug(self) -> str:
        return self.input_row['name'].replace(" ", "_").lower()

    def get_char_slug_display_name(self) -> str:
        if not self.input_row['display_name']:
            return ''
        return self.input_row['display_name'].replace(" ", "_").lower()

    def is_released(self) -> bool:
        if not self.release_date:
            return False
        release = datetime.strptime(self.release_date, "%Y-%m-%d")
        return release <= datetime.now()
    
    def is_outdated(self) -> bool:
        if outdated_characters:
            return self.get_char_slug() in outdated_characters
        return False

    def get_character_image_link(self) -> str:
        char_name = self.get_char_slug()
        char_display_name = self.get_char_slug_display_name()
        if has_official_photo(char_name):
            url = f"https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/{char_name}.png"
        elif char_display_name and has_official_photo(char_display_name):
            url = f"https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/{char_display_name}.png"
        elif has_custom_photo(char_name):
            url = f"assets/images/characters/{char_name}.png"
        else:
            url = FALLBACK_PHOTO
        return url
        
    def get_character_full_image_link(self) -> str:
        char_name = self.get_char_slug()
        char_display_name = self.get_char_slug_display_name()
        if has_official_photo(char_name):
            url = f"https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/full/{char_name}.png"
        elif char_display_name and has_official_photo(char_display_name):
            url = f"https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/full/{char_display_name}.png"
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

