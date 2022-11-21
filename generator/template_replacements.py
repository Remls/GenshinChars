import re

THUMBNAIL_IMAGE = "https://static.wikia.nocookie.net/gensin-impact/images/3/30/Splashscreen_Akasha_Pulses%2C_the_Kalpa_Flame_Rises.png"


def generate_index_file():
    # Read
    output = ""
    with open('data/template.html') as f:
        output = f.read()

    # 1. Thumbnail
    search = r"\[THUMB\]"
    replace = THUMBNAIL_IMAGE
    output = re.sub(search, replace, output)

    # 2. Character display template
    search = r"\[CHAR (.+)\]"
    replace = r"""<template x-for="char in filterCharacterData({\1})">
        <div @click="showCharSheet(char.name)" class="character-links">
            <img width="20" height="20" :src="getPortraitPhoto(char.photo)">
            <span class="gi-font clickable" :class="char.element ? `el-${char.element.toLowerCase()}` : 'el-unknown'"
                x-text="char.display_name || char.name">
            </span>
        </div>
    </template>"""
    output = re.sub(search, replace, output)

    # 3. Counter template
    search = r"\[COUNTER (.+)\]"
    replace = r"""<template x-for="[key, value] in Object.entries(groupCharacterData(\1))" :key="key">
        <div>
            <b x-text="key"></b> - <span x-text="value"></span>
            <br/>
        </div>
    </template>"""
    output = re.sub(search, replace, output)

    # Write
    with open("docs/index.html", "w") as f:
        f.write(output)