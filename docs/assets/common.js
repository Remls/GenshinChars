const MONTHS = [
    'January', 'February', 'March',
    'April', 'May', 'June',
    'July', 'August', 'September',
    'October', 'November', 'December'
]
const WEEKDAYS = [
    'Sunday', 'Monday', 'Tuesday',
    'Wednesday', 'Thursday',
    'Friday', 'Saturday'
]

// Wiki images live at static.wikia.nocookie.net/gensin-impact/images/{h}/{hh}/{filename},
// where {h}{hh} are the first hex chars of the MD5 of the filename. Computing that here
// lets us build thumbnail URLs for any item without calling the wiki API.
function md5Hex(str) {
    const utf8 = new TextEncoder().encode(str)
    const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296))
    const S = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ]
    const padded = (((utf8.length + 8) >> 6) + 1) << 6
    const bytes = new Uint8Array(padded)
    bytes.set(utf8)
    bytes[utf8.length] = 0x80
    const view = new DataView(bytes.buffer)
    const bitLen = utf8.length * 8
    view.setUint32(padded - 8, bitLen >>> 0, true)
    view.setUint32(padded - 4, Math.floor(bitLen / 4294967296), true)
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
    for (let chunk = 0; chunk < padded; chunk += 64) {
        const M = Array.from({ length: 16 }, (_, i) => view.getUint32(chunk + i * 4, true))
        let A = a0, B = b0, C = c0, D = d0
        for (let i = 0; i < 64; i++) {
            let F, g
            if (i < 16) { F = (B & C) | (~B & D); g = i }
            else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16 }
            else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16 }
            else { F = C ^ (B | ~D); g = (7 * i) % 16 }
            F = (F + A + K[i] + M[g]) | 0
            A = D; D = C; C = B
            B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) | 0
        }
        a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0
    }
    return [a0, b0, c0, d0].map(n => {
        let s = ''
        for (let j = 0; j < 4; j++) s += ((n >>> (j * 8)) & 0xff).toString(16).padStart(2, '0')
        return s
    }).join('')
}

const FALLBACK_PHOTO = 'assets/images/Fallback.png'

function foldedText(s) {
    const chars = []
    const map = []
    for (let i = 0; i < s.length; i++) {
        let n = s[i].normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
        if (n === '•') n = ' '
        for (const ch of n) {
            chars.push(ch)
            map.push(i)
        }
    }
    const text = []
    const indexes = []
    let prevSpace = false
    for (let j = 0; j < chars.length; j++) {
        const isSpace = /\s/.test(chars[j])
        if (isSpace && prevSpace) continue
        text.push(isSpace ? ' ' : chars[j])
        indexes.push(map[j])
        prevSpace = isSpace
    }
    return { text: text.join(''), map: indexes }
}

// A character image is either a file on the wiki or one in the game's own
// override directory. The CDN downsizes a bare wiki URL to about 200px when the
// browser sends a Referer, so anything displayed larger asks for an explicit
// width, which in turn needs referrerpolicy="no-referrer" on the tag
function characterImageUrl(image, wiki, localDir, thumbWidth = null) {
    if (!image) return FALLBACK_PHOTO
    if (image.wiki) return wikiFileUrl(image.wiki, wiki, thumbWidth)
    return `${localDir}/${image.local}`
}

// Colour variables for a character with several forms, filling seven slots by
// repeating the list. Paired with .el-multi, which cycles through them
function formColourSlots(colourVars) {
    if (colourVars.length < 2) return ''
    return Array.from({ length: 7 }, (_, i) =>
        `--form-${i + 1}: var(--${colourVars[i % colourVars.length]})`).join('; ')
}

function formColourStyle(colourVars) {
    const slots = formColourSlots(colourVars)
    return slots ? ` style="${slots}"` : ''
}

// Characters excluded from the tables unless the reader opts in, because their
// element or path is a player choice rather than a property of the character
const SPECIAL_CHARACTERS = {
    genshin: ['Traveler', 'Manekin', 'Manekina'],
    hsr: ['Trailblazer'],
}

// Gender values and the glyphs the filter buttons show. "Either" is for
// characters whose gender the player picks, like the Traveler and the Trailblazer
const GENDERS = { Female: '♀', Male: '♂', Either: '⚥' }

// The CDN can pin a placeholder 404 for a file that was uploaded later, and it does
// not expire on its own (Item Frostfairy Flower.png served a 21-day-old placeholder
// under max-age=3600). A query string is a separate cache key at the edge, so bumping
// this token refetches every image from origin. Absent until the first reset, and
// stable between resets, so normal caching still applies.
const IMAGE_CACHE_TOKEN_KEY = 'imageCacheToken'

function resetImageCache() {
    const next = Number(localStorage.getItem(IMAGE_CACHE_TOKEN_KEY) || 0) + 1
    localStorage.clear()
    localStorage.setItem(IMAGE_CACHE_TOKEN_KEY, String(next))
}

// Bare wiki image URLs (no /revision/... suffix) are served regardless of referer.
// The scaled-thumbnail URLs are not, and need referrerpolicy="no-referrer".
function wikiFileUrl(filename, wiki = 'gensin-impact', thumbWidth = null) {
    filename = filename.replaceAll(' ', '_')
    const hash = md5Hex(filename)
    const encoded = encodeURIComponent(filename)
        .replaceAll("'", '%27').replaceAll('(', '%28').replaceAll(')', '%29')
    let url = `https://static.wikia.nocookie.net/${wiki}/images/${hash[0]}/${hash.slice(0, 2)}/${encoded}`
    if (thumbWidth) url += `/revision/latest/scale-to-width-down/${thumbWidth}`
    const token = localStorage.getItem(IMAGE_CACHE_TOKEN_KEY)
    if (token) url += `?cb=${token}`
    return url
}

// Wiki region emblem images are named "Emblem {Region}.png".
// The CDN answers requests for nonexistent files with a placeholder image instead
// of an error, so regions known to have no emblem need their own icon.
const REGION_ICON_OVERRIDES = { "Khaenri'ah": '🌑' }
function regionIconHtml(region) {
    if (REGION_ICON_OVERRIDES[region]) {
        return `<span>${REGION_ICON_OVERRIDES[region]}</span>`
    }
    const src = wikiFileUrl(`Emblem ${region}.png`, 'gensin-impact', 40)
    return `<img src="${src}" class="region-icon" width="20" height="20" loading="lazy"`
        + ` referrerpolicy="no-referrer"`
        + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
}

// "2022 November 2" for a full date, "November 2" for a birthday, which has no year
function formatDateLong(date) {
    if (!date) return 'Unknown'
    const parts = date.split('-')
    if (parts.length === 2) {
        return [MONTHS[parseInt(parts[0]) - 1], parseInt(parts[1])].join(' ')
    }
    return [parts[0], MONTHS[parseInt(parts[1]) - 1], parseInt(parts[2])].join(' ')
}

function formatVersionLabel(version, versionData, includeDate = false) {
    if (!version) return 'Unknown'
    version = versionData[version]
    let v = version.display_version_number
    if (version.version_name) v += `: ${version.version_name}`
    if (includeDate && version.release_date) v += ` (${formatDateLong(version.release_date)})`
    return v
}

// Talent materials are stored under the family name; the wiki files them under
// the tier page they share
const WIKI_ALT_NAMES = {
    'Freedom':      'Philosophies of Freedom',
    'Resistance':   'Philosophies of Resistance',
    'Ballad':       'Philosophies of Ballad',
    'Prosperity':   'Philosophies of Prosperity',
    'Diligence':    'Philosophies of Diligence',
    'Gold':         'Philosophies of Gold',
    'Transience':   'Philosophies of Transience',
    'Elegance':     'Philosophies of Elegance',
    'Light':        'Philosophies of Light',
    'Admonition':   'Philosophies of Admonition',
    'Ingenuity':    'Philosophies of Ingenuity',
    'Praxis':       'Philosophies of Praxis',
    'Equity':       'Philosophies of Equity',
    'Justice':      'Philosophies of Justice',
    'Order':        'Philosophies of Order',
    'Contention':   'Philosophies of Contention',
    'Kindling':     'Philosophies of Kindling',
    'Conflict':     'Philosophies of Conflict',
    'Moonlight':    'Philosophies of Moonlight',
    'Elysium':      'Philosophies of Elysium',
    'Vagrancy':     'Philosophies of Vagrancy',
    'Charity':      'Philosophies of Charity',
    'Fortitude':    'Philosophies of Fortitude',
    'Glory':        'Philosophies of Glory',
}

const DOMAIN_TYPES = {
    weapon_ascension_mats: {
        button_label: 'Weapon mats',
        icon: 'Icon Inventory Weapons.png',
        short: 'w',
        string: 'Weapon ascension materials',
        title: 'Domains of Forgery',
        description: 'Provides weapon ascension materials',
        changing_rewards: true,
    },
    talent_upgrade_mats: {
        button_label: 'Talent mats',
        icon: 'Icon Archive Books.png',
        short: 't',
        string: 'Talent upgrade materials',
        title: 'Domains of Mastery',
        description: 'Provides character talent level-up materials',
        changing_rewards: true,
    },
    artifacts: {
        button_label: 'Artifacts',
        icon: 'Icon Inventory Artifacts.png',
        short: 'a',
        string: 'Artifacts',
        title: 'Domains of Blessing',
        description: 'Provides artifacts',
        changing_rewards: false,
    },
    common_enemy_drops: {
        button_label: 'Common enemies',
        icon: 'Icon Archive Living Beings.png',
        short: 'c',
        string: 'Common enemy drops',
        title: 'Common enemy drops',
        description: 'Provides character ascension and talent level-up materials',
        changing_rewards: false,
        source: 'common_enemy_drops',
        no_regions: true,
    },
    normal_bosses: {
        button_label: 'Normal bosses',
        icon: 'Icon Rolling Crossfire.png',
        short: 'nb',
        string: 'Normal bosses',
        title: 'Normal bosses',
        description: 'Provides character ascension materials',
        changing_rewards: false,
    },
    weekly_bosses: {
        button_label: 'Weekly bosses',
        icon: 'Icon Tutorial Monster.png',
        short: 'wb',
        string: 'Weekly bosses',
        title: 'Weekly bosses',
        description: 'Provides character talent level-up materials (Lv7+)',
        changing_rewards: false,
    },
    regional_specialties: {
        button_label: 'Specialties',
        icon: 'Icon Inventory Materials.png',
        short: 's',
        string: 'Regional specialties',
        title: 'Regional specialties',
        description: 'Provides character ascension materials',
        changing_rewards: false,
        source: 'specialties',
    },
    other_materials: {
        button_label: 'Other mats',
        icon: 'Icon Inventory Precious Items.png',
        short: 'o',
        string: 'Other materials',
        title: 'Other materials',
        description: 'Other miscellaneous ascension materials that are not farmable',
        changing_rewards: false,
        source: 'other_materials',
        no_regions: true,
    },
}

const HSR_DOMAIN_TYPES = {
    calyx_crimson: {
        button_label: 'Trace mats',
        short: 't',
        icon: 'Icon Calyx Crimson.png',
        string: 'Trace materials',
        title: 'Crimson Calyxes',
        page_prefix: 'Calyx (Crimson)',
        description: 'Provides trace materials',
    },
    cavern_of_corrosion: {
        short: 'r',
        icon: 'Icon Cavern of Corrosion.png',
        string: 'Relics',
        title: 'Caverns of Corrosion',
        page_prefix: 'Cavern of Corrosion',
        description: 'Provides relic sets',
    },
    planar_ornament: {
        short: 'p',
        icon: 'Icon Divergent Universe Protean Hero.png',
        string: 'Planar ornaments',
        title: 'Divergent Universe',
        description: 'Provides planar ornament sets',
    },
    common_enemy_drops: {
        button_label: 'Common enemies',
        short: 'c',
        icon: 'Icon Enemy.png',
        light_glyph: true,
        string: 'Common enemy drops',
        title: 'Common enemy drops',
        description: 'Provides character ascension and trace level-up materials',
        source: 'common_enemy_drops',
        no_worlds: true,
    },
    stagnant_shadow: {
        short: 'nb',
        icon: 'Icon Stagnant Shadow.png',
        string: 'Normal bosses',
        title: 'Normal bosses',
        page_prefix: 'Stagnant Shadow',
        description: 'Provides character ascension materials',
    },
    echo_of_war: {
        short: 'wb',
        icon: 'Icon Echo of War Enemy.png',
        string: 'Weekly bosses',
        title: 'Weekly bosses',
        page_prefix: 'Echo of War',
        description: 'Provides trace level-up materials (Lv9+ and bonus abilities)',
    },
    other_materials: {
        button_label: 'Other mats',
        short: 'o',
        icon: 'Icon Other Materials.png',
        light_glyph: true,
        string: 'Other materials',
        title: 'Other materials',
        description: 'Other miscellaneous ascension materials that are not farmable',
        source: 'other_materials',
        no_worlds: true,
    },
}

// The reverse of the domains data: what each character needs, keyed by the name
// the reward lists use. Multi-form characters are named both plainly, for what
// every form needs, and per form. "order" runs in domain type order, then in
// data order within a type.
function buildCharacterMaterials(domainsData, game) {
    const types = game === 'hsr' ? HSR_DOMAIN_TYPES : DOMAIN_TYPES
    const typeKeys = Object.keys(types)
    // Every group but "rewards" is named by the type that renders it
    const groupTypes = {}
    typeKeys.forEach(key => {
        if (types[key].source) groupTypes[types[key].source] = key
    })
    const groups = ['rewards', ...Object.keys(groupTypes)]
    const entries = []
    groups.forEach(group => {
        Object.values(domainsData[group] || {}).forEach((entry, index) => {
            const rank = typeKeys.indexOf(entry.type || groupTypes[group])
            entries.push({ entry, rank: rank === -1 ? typeKeys.length : rank, index })
        })
    })
    entries.sort((a, b) => a.rank - b.rank || a.index - b.index)
    const materials = {}
    entries.forEach(({ entry }, order) => {
        (entry.characters || []).forEach(name => {
            if (!materials[name]) materials[name] = []
            materials[name].push({ name: entry.name, image: entry.image, order })
        })
    })
    return materials
}

const HSR_WIKI = 'https://honkai-star-rail.fandom.com/wiki/'
// The wiki is honkai-star-rail.fandom.com but its image CDN bucket is "houkai"
const HSR_WIKI_IMAGES = 'houkai-star-rail'
// Data uses the short name. The wiki and the grid label use the full one
const HSR_PATH_LABELS = { 'Hunt': 'The Hunt' }
// The wiki has no path icon for these
const HSR_MISSING_PATH_ICONS = ['Finality']

// A chip stays a wiki link, so middle click, modifier click and long press still
// reach the wiki. Only a plain left click is taken over.
function charSheetChipClick(event, character, form = null) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    event.preventDefault()
    openCharSheet(character, form)
}

// Character sheet. One component for both games and every page, holding all of
// its own state, so a page's loop variables cannot shadow the fields it shows.
//
// A field reads from the form when the value varies between forms and from the
// character when it does not. "optional" fields drop their row when empty;
// every other empty value shows as a grey Unknown.
const CHAR_SHEET_GAMES = {
    genshin: {
        wiki: 'https://genshin-impact.fandom.com/wiki/',
        wikiImages: 'gensin-impact',
        artDir: 'assets/images/full-characters',
        itemAltNames: WIKI_ALT_NAMES,
        colourKey: 'element',
        colourPrefix: 'el',
        formKey: 'element',
        formIconLocal: 'assets/images/{label}.svg',
        fields: [
            { label: 'Birthday', from: 'char', key: 'birthday', format: 'date' },
            { label: 'Element', from: 'form', key: 'element' },
            { label: 'Arkhe', from: 'form', key: 'arkhe', optional: true },
            { label: 'Gender', from: 'char', key: 'gender' },
            { label: 'Rarity', from: 'char', key: 'rarity', format: 'rarity' },
            { label: 'Region', from: 'char', key: 'region' },
            { label: 'Weapon', from: 'form', key: 'weapon' },
            { label: 'Release Version', from: 'form', key: 'release_version', format: 'version' },
            { label: 'Release Date', from: 'form', key: 'release_date', format: 'date' },
        ],
    },
    hsr: {
        wiki: HSR_WIKI,
        wikiImages: HSR_WIKI_IMAGES,
        artDir: 'assets/images/full-characters',
        itemFile: 'Item {name}.png',
        colourKey: 'combat_type',
        colourPrefix: 'ct',
        formKey: 'path',
        formLabels: HSR_PATH_LABELS,
        formIconWiki: 'Path {label}.png',
        formIconMissing: HSR_MISSING_PATH_ICONS,
        fields: [
            { label: 'Path', from: 'form', key: 'path', labels: HSR_PATH_LABELS },
            { label: 'Combat Type', from: 'form', key: 'combat_type' },
            { label: 'Gender', from: 'char', key: 'gender' },
            { label: 'Rarity', from: 'char', key: 'rarity', format: 'rarity' },
            { label: 'World', from: 'char', key: 'world' },
            { label: 'Release Version', from: 'form', key: 'release_version', format: 'version' },
            { label: 'Release Date', from: 'form', key: 'release_date', format: 'date' },
        ],
    },
}

let charSheetConfig = null

function configureCharSheet(game, versionData, materials = {}) {
    charSheetConfig = { ...CHAR_SHEET_GAMES[game], versionData, materials }
}

function openCharSheet(character, form = null) {
    window.dispatchEvent(new CustomEvent('char-sheet', { detail: { character, form } }))
}

const EXTERNAL_LINK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"'
    + ' stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'
    + '<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>'

const CHAR_SHEET_MARKUP = `
<div class="modal char-sheet" x-data="charModal" x-cloak x-show="open"
    x-transition x-transition.duration.500ms
    @char-sheet.window="show($event.detail)"
    @keydown.escape.window="open = false">
    <div class="char-sheet-dialog" @click.outside="open = false">
        <div class="char-sheet-art">
            <template x-for="src in art" :key="src">
                <img :src="src" referrerpolicy="no-referrer">
            </template>
        </div>
        <div class="char-sheet-body">
            <div class="char-sheet-title">
                <span class="gi-font" :class="titleClass" x-text="title"></span>
                <a class="char-sheet-wiki" :href="wikiLink" title="Open the wiki article"
                    >${EXTERNAL_LINK_ICON}</a>
            </div>
            <template x-if="forms.length > 1">
                <div class="char-sheet-forms">
                    <template x-for="option in formOptions()" :key="option.index">
                        <button type="button" class="icon-button"
                            :class="{ selected: option.index === formIndex }"
                            @click="selectForm(option.index)">
                            <img :src="option.icon" width="20" height="20" loading="lazy"
                                referrerpolicy="no-referrer"
                                onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">
                            <span class="icon-button-label" x-text="option.label"></span>
                        </button>
                    </template>
                </div>
            </template>
            <div class="char-sheet-fields">
                <template x-for="(half, i) in fieldHalves()" :key="i">
                    <table>
                        <tbody>
                            <template x-for="field in half" :key="field.label">
                                <tr>
                                    <td class="label-column" x-text="field.label"></td>
                                    <td>
                                        <span :class="{ 'text-unknown': field.unknown }"
                                            x-text="field.value"></span>
                                    </td>
                                </tr>
                            </template>
                        </tbody>
                    </table>
                </template>
            </div>
            <template x-if="materials.length">
                <div class="char-sheet-materials">
                    <template x-for="item in materials" :key="item.name">
                        <a class="char-sheet-material" :href="item.href">
                            <img :src="item.src" width="64" height="64" loading="lazy"
                                referrerpolicy="no-referrer"
                                onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">
                            <span class="gi-font" x-text="item.name"></span>
                        </a>
                    </template>
                </div>
            </template>
            <template x-if="notes">
                <div class="char-sheet-notes">
                    <ul>
                        <template x-for="note in notes" :key="note">
                            <li x-text="note"></li>
                        </template>
                    </ul>
                </div>
            </template>
        </div>
    </div>
</div>`

document.addEventListener('alpine:init', () => {
    Alpine.data('charModal', () => ({
        open: false,
        character: null,
        forms: [],
        formIndex: 0,
        title: null,
        titleClass: '',
        wikiLink: '',
        art: [],
        fields: [],
        notes: null,
        materials: [],

        show({ character, form }) {
            this.character = character
            this.forms = character.forms || []
            this.notes = character.notes
            // Without a form the debut one stands in, since a character record
            // carries no path or combat type of its own
            this.selectForm(Math.max(0, this.forms.indexOf(form)))
            this.open = true
        },

        selectForm(index) {
            const config = charSheetConfig
            const character = this.character
            this.formIndex = index
            const form = this.forms[index] || character
            this.title = character.name
            // The primary name is the one that matches a wiki page. A form's
            // display name need not.
            this.wikiLink = config.wiki
                + encodeURIComponent(character.name.replaceAll(' ', '_'))
            // Full art loads unscaled, so the tag needs referrerpolicy="no-referrer":
            // the CDN downsizes a bare URL to about 200px when a Referer arrives
            this.art = (form.full_photo || []).map(image => characterImageUrl(
                image, config.wikiImages, config.artDir
            ))
            this.fields = config.fields
                .map(field => this.buildField(field, character, form, config))
                .filter(Boolean)
            // The name takes the selected form's colour
            const colour = form[config.colourKey]
            this.titleClass = colour
                ? `${config.colourPrefix}-${colour.toLowerCase()}`
                : 'el-unknown'
            this.materials = this.buildMaterials(character, form, config)
        },

        // One entry per form, labelled by whatever distinguishes them: the element
        // in Genshin, the path in HSR
        formOptions() {
            const config = charSheetConfig
            return this.forms.map((form, index) => {
                const value = form[config.formKey]
                const label = (config.formLabels && config.formLabels[value])
                    || value || 'Unknown'
                return { index, label, icon: this.formIconUrl(value, label, config) }
            })
        },

        formIconUrl(value, label, config) {
            if (!value) return FALLBACK_PHOTO
            if (config.formIconLocal) {
                return config.formIconLocal.replace('{label}', label)
            }
            if ((config.formIconMissing || []).includes(value)) return FALLBACK_PHOTO
            return wikiFileUrl(
                config.formIconWiki.replace('{label}', label), config.wikiImages, 40
            )
        },

        // A form's materials sit under its own name, and what every form needs
        // sits under the character's, so the sheet shows both
        buildMaterials(character, form, config) {
            const own = config.materials[character.name] || []
            const perForm = (form.display_name
                && config.materials[form.display_name]) || []
            const seen = new Set()
            return [...own, ...perForm]
                .filter(item => !seen.has(item.name) && seen.add(item.name))
                .sort((a, b) => a.order - b.order)
                .map(item => ({
                    name: item.name,
                    href: config.wiki + encodeURIComponent(
                        ((config.itemAltNames || {})[item.name] || item.name)
                            .replaceAll(' ', '_')),
                    src: this.itemImageUrl(item, config),
                }))
        },

        // HSR names its item files after the item; Genshin's are resolved by the
        // generator and stored, so an unresolved one has no file at all
        itemImageUrl(item, config) {
            const file = item.image
                || (config.itemFile && config.itemFile.replace('{name}', item.name))
            return file ? wikiFileUrl(file, config.wikiImages, 128) : FALLBACK_PHOTO
        },

        buildField(field, character, details, config) {
            const raw = (field.from === 'form' ? details : character)[field.key]
            if (!raw) {
                return field.optional ? null : { label: field.label, value: 'Unknown', unknown: true }
            }
            let value = field.labels ? (field.labels[raw] || raw) : raw
            if (field.format === 'date') value = formatDateLong(raw)
            if (field.format === 'version') value = formatVersionLabel(raw, config.versionData)
            if (field.format === 'rarity') value = `${raw}-star`
            return { label: field.label, value, unknown: false }
        },

        // Two tables side by side cost half the height of one. An odd count puts
        // the extra row in the left half.
        fieldHalves() {
            const half = Math.ceil(this.fields.length / 2)
            return [this.fields.slice(0, half), this.fields.slice(half)]
        },
    }))

    document.body.insertAdjacentHTML('beforeend', CHAR_SHEET_MARKUP)
})
