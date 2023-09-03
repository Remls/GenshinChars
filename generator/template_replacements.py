from bs4 import BeautifulSoup
from bs4.formatter import HTMLFormatter
import re

THUMBNAIL_IMAGE = "https://static.wikia.nocookie.net/gensin-impact/images/6/69/Splashscreen_Windblume%27s_Breath.png"


def read_template_file():
    file_contents = ""
    with open('data/template.html') as f:
        file_contents = f.read()
    return file_contents


def read_index_file():
    file_contents = ""
    with open('docs/index.html') as f:
        file_contents = f.read()
    return file_contents


def write_index_file(s: str):
    with open("docs/index.html", "w") as f:
        f.write(s)


def generate_index_file():
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

    write_index_file(output)


def prettify():
    output = read_index_file()
    soup = BeautifulSoup(output, "html.parser")
    formatter = HTMLFormatter(indent=4)
    write_index_file(soup.prettify(formatter=formatter))