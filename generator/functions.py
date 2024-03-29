import subprocess
from datetime import datetime


def load_photo_cache_from_file() -> list:
    file_contents = ""
    try:
        with open('data/_photo_cache') as f:
            file_contents = f.read()
    except FileNotFoundError:
        pass
    if not file_contents:
        return []
    return file_contents.split("\n")


def add_to_photo_cache_file(char_name: str):
    with open('data/_photo_cache', 'a') as f:
        f.write(char_name + "\n")


def load_outdated_characters_list() -> list:
    file_contents = ""
    try:
        with open('data/_outdated') as f:
            file_contents = f.read()
    except FileNotFoundError:
        pass
    if not file_contents:
        return []
    return file_contents.split("\n")


def get_version() -> str:
    return subprocess.check_output(["git", "describe", "--always"]).decode('ascii').strip()


def get_current_timestamp() -> str:
    return datetime.utcnow().isoformat() + "Z"
