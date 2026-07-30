from bs4 import BeautifulSoup
from bs4.formatter import HTMLFormatter
import re

THUMBNAIL_IMAGE = "https://static.wikia.nocookie.net/gensin-impact/images/8/88/Splashscreen_Sunny_Summer_Fontinalia.png"


def read_template_file():
    file_contents = ""
    with open('data/characters.template.html') as f:
        file_contents = f.read()
    return file_contents


def read_characters_file():
    file_contents = ""
    with open('docs/characters.html') as f:
        file_contents = f.read()
    return file_contents


def write_characters_file(s: str):
    with open("docs/characters.html", "w") as f:
        f.write(s)


def generate_characters_page():
    output = read_template_file()

    # 1. Thumbnail
    search = r"\[THUMB\]"
    replace = THUMBNAIL_IMAGE
    output = re.sub(search, replace, output)

    # 2. Collapsible headers
    search = r"\[HEADER (.+);(.+)\]"
    replace = r"""<h2 class="collapsible-header" @click="showSection.\2 = !showSection.\2">
        \1
        <svg x-show="showSection.\2" width="15" height="15" viewBox="0 0 24 24" stroke-width="1.5" stroke="#c9d1d9" fill="#c9d1d9" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M18 15l-6 -6l-6 6h12" transform="rotate(180 12 12)" />
        </svg>
        <svg x-show="!showSection.\2" width="15" height="15" viewBox="0 0 24 24" stroke-width="1.5" stroke="#c9d1d9" fill="#c9d1d9" stroke-linecap="round" stroke-linejoin="round">
            <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
            <path d="M18 15l-6 -6l-6 6h12" transform="rotate(90 12 12)" />
        </svg>
    </h2>"""
    output = re.sub(search, replace, output)

    # 3. Character display template
    search = r"\[CHAR (.+)\]"
    replace = r"""<template x-for="char in filterCharacterData({\1})">
        <div @click="showCharSheet(char.name)" class="character-links">
            <img width="20" height="20" :src="char.photo">
            <span class="gi-font clickable" :class="char.element ? `el-${char.element.toLowerCase()}` : 'el-unknown'"
                x-text="char.display_name || char.name">
            </span>
            <template x-if="char.is_outdated"><sup>†</sup></template>
            <template x-if="char.arkhe === 'Pneuma'"><sup>Pn</sup></template>
            <template x-if="char.arkhe === 'Ousia'"><sup>Ou</sup></template>
            <template x-if="char.arkhe === 'Pneumousia'"><sup>PnOu</sup></template>
            <template x-if="char.arkhe === 'Unknown'"><sup>??</sup></template>
        </div>
    </template>"""
    output = re.sub(search, replace, output)

    # 4. Counter template
    search = r"\[COUNTER (.+)\]"
    replace = r"""<template x-for="[key, value] in Object.entries(groupCharacterData(\1))" :key="key">
        <div>
            <b x-text="key"></b> - <span x-text="value"></span>
        </div>
    </template>"""
    output = re.sub(search, replace, output)

    write_characters_file(output)


def generate_index_page():
    with open('data/index.template.html') as f:
        output = f.read()
    output = re.sub(r"\[THUMB\]", THUMBNAIL_IMAGE, output)
    with open("docs/index.html", "w") as f:
        f.write(output)


def update_domains_page():
    with open('docs/domains.html') as f:
        output = f.read()
    search = r'(<meta (?:property="og:image"|name="twitter:card") content=")[^"]*(">)'
    output = re.sub(search, r"\g<1>" + THUMBNAIL_IMAGE + r"\g<2>", output)
    with open("docs/domains.html", "w") as f:
        f.write(output)


def prettify_characters_page():
    output = read_characters_file()
    soup = BeautifulSoup(output, "html.parser")
    formatter = HTMLFormatter(indent=4)
    output = soup.prettify(formatter=formatter)
    # Keep punctuation attached to links instead of on its own line (a space would render)
    output = re.sub(r'</a>\n\s*\.', '</a>.', output)
    write_characters_file(output)