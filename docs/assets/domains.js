const DOMAIN_TYPES = {
    weapon_ascension_mats: {
        icon: '⚔',
        short: 'w',
        string: 'Weapon ascension materials',
        title: 'Domains of Forgery',
        description: 'Provides weapon ascension materials',
        changing_rewards: true,
    },
    talent_upgrade_mats: {
        icon: '📖',
        short: 't',
        string: 'Talent upgrade materials',
        title: 'Domains of Mastery',
        description: 'Provides character talent level-up materials',
        changing_rewards: true,
    },
    artifacts: {
        icon: '🏺',
        short: 'a',
        string: 'Artifacts',
        title: 'Domains of Blessing',
        description: 'Provides artifacts',
        changing_rewards: false,
    },
    normal_bosses: {
        icon: '🐲',
        short: 'nb',
        string: 'Normal bosses',
        title: 'Normal bosses',
        description: 'Provides character ascension materials',
        changing_rewards: false,
    },
    weekly_bosses: {
        icon: '🐉',
        short: 'wb',
        string: 'Weekly bosses',
        title: 'Weekly bosses',
        description: 'Provides character talent level-up materials (Lv7+)',
        changing_rewards: false,
    },
    regional_specialties: {
        icon: '🌸',
        short: 'rs',
        string: 'Regional specialties',
        title: 'Regional specialties',
        description: 'Provides character ascension materials',
        changing_rewards: false,
        overworld: true,
    },
}
const DOMAIN_REGIONS = {
    'All':       { short: 'a' },
    'Mondstadt': { short: 'm' },
    'Liyue':     { short: 'l' },
    'Inazuma':   { short: 'i' },
    'Sumeru':    { short: 'su' },
    'Fontaine':  { short: 'f' },
    'Natlan':    { short: 'n' },
    'Nod-Krai':  { short: 'nk' },
    'Snezhnaya': { short: 'sn' },
}
const DOMAIN_DAYS = {
    sun: 'Sunday',
    mon: 'Monday',
    tue: 'Tuesday',
    wed: 'Wednesday',
    thu: 'Thursday',
    fri: 'Friday',
    sat: 'Saturday',
}
const GENSHIN_WIKI = 'https://genshin-impact.fandom.com/wiki/'
const WIKI_ALT_NAMES = {
    // Talent materials
    'Freedom':      'Teachings of Freedom',
    'Resistance':   'Teachings of Resistance',
    'Ballad':       'Teachings of Ballad',
    'Prosperity':   'Teachings of Prosperity',
    'Diligence':    'Teachings of Diligence',
    'Gold':         'Teachings of Gold',
    'Transience':   'Teachings of Transience',
    'Elegance':     'Teachings of Elegance',
    'Light':        'Teachings of Light',
    'Admonition':   'Teachings of Admonition',
    'Ingenuity':    'Teachings of Ingenuity',
    'Praxis':       'Teachings of Praxis',
    'Equity':       'Teachings of Equity',
    'Justice':      'Teachings of Justice',
    'Order':        'Teachings of Order',
    'Contention':   'Teachings of Contention',
    'Kindling':     'Teachings of Kindling',
    'Conflict':     'Teachings of Conflict',
    'Moonlight':    'Teachings of Moonlight',
    'Elysium':      'Teachings of Elysium',
    'Vagrancy':     'Teachings of Vagrancy',
    'Charity':      'Teachings of Charity',
    'Fortitude':    'Teachings of Fortitude',
    'Glory':        'Teachings of Glory',
}
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

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
// For displaying availability: weekdays first, Sunday (everything drops) last
const DAY_DISPLAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const FALLBACK_PHOTO = 'assets/images/Fallback.png'
const DOMAIN_MONTHS = [
    'January', 'February', 'March',
    'April', 'May', 'June',
    'July', 'August', 'September',
    'October', 'November', 'December'
]
const DOMAIN_WEEKDAYS = [
    'Sunday', 'Monday', 'Tuesday',
    'Wednesday', 'Thursday',
    'Friday', 'Saturday'
]

document.addEventListener('alpine:init', () => {
    Alpine.data('domainSheet', () => ({
        DOMAIN_TYPES,
        DOMAIN_REGIONS,
        DOMAIN_DAYS,

        // Data
        allData: { domains: [], rewards: {}, specialties: {} },
        characterLookup: {},
        rewardSources: {},
        itemImages: {},

        // Section collapses
        showSection: {
            filters: true,
        },

        // Filters
        searchQuery: '',
        selectedType: 'weapon_ascension_mats',
        selectedRegion: 'All',
        selectedDay: 'sun',
        serverDay: 'sun',

        fetchAllData() {
            this.serverDay = this.getServerDay()
            Promise.all([
                fetch('./assets/domains.json').then(r => r.json()),
                fetch('./assets/data.json').then(r => r.json()),
            ]).then(([domainsData, charactersData]) => {
                this.allData = domainsData
                this.buildCharacterLookup(charactersData)
                this.buildRewardSources()
                // Set here (not on init) so all bindings exist by the time this runs
                this.selectedDay = this.serverDay
                this.setFiltersFromUrl()
                this.resolveItemImages().catch(() => {})
            })
        },

        // Resolve each item's real image filename from the wiki API. Guessing
        // "Item {name}.png" is not enough: artifact sets have no image of their own
        // (we use their flower piece), some filenames drop characters like ":",
        // and the CDN answers requests for nonexistent files with a placeholder
        // image instead of an error. Results are cached per data version.
        async resolveItemImages() {
            const cacheKey = 'domains_item_images'
            const version = this.allData.last_updated
            try {
                const cached = JSON.parse(localStorage.getItem(cacheKey))
                if (cached && cached.version === version) {
                    this.itemImages = cached.map
                    return
                }
            } catch (e) {}

            const titleOf = name => WIKI_ALT_NAMES[name] || name
            const names = new Set()
            Object.values(this.allData.rewards).forEach(r => names.add(r.name))
            Object.values(this.allData.specialties || {}).forEach(s => names.add(s.name))
            const queryable = [...names].filter(n => !n.startsWith('???'))

            // Batched API query; returns requested-title -> page object
            const apiQuery = async (titles, params) => {
                const search = new URLSearchParams({
                    action: 'query', format: 'json', origin: '*', redirects: '1',
                    titles: titles.join('|'), ...params,
                })
                const data = await fetch(`https://genshin-impact.fandom.com/api.php?${search}`)
                    .then(r => r.json())
                const rename = {}
                ;(data.query.normalized || []).forEach(x => { rename[x.from] = x.to })
                ;(data.query.redirects || []).forEach(x => { rename[x.from] = x.to })
                const byTitle = {}
                Object.values(data.query.pages || {}).forEach(p => { byTitle[p.title] = p })
                const result = {}
                titles.forEach(t => {
                    let final = t
                    const seen = new Set()
                    while (rename[final] && !seen.has(final)) { seen.add(final); final = rename[final] }
                    result[t] = byTitle[final]
                })
                return result
            }
            const batched = async (items, params) => {
                let pages = {}
                for (let i = 0; i < items.length; i += 50) {
                    const part = await apiQuery(items.slice(i, i + 50), params)
                    pages = { ...pages, ...part }
                }
                return pages
            }

            // Phase 1: the page's own image (drops, specialties)
            const map = {}
            const noImage = []
            const pages = await batched(queryable.map(titleOf), { prop: 'pageimages', piprop: 'name' })
            queryable.forEach(name => {
                const page = pages[titleOf(name)]
                if (!page || 'missing' in page) map[name] = null
                // Only trust item images; a page's lead image can be something
                // else entirely (e.g. a version promo on artifact set pages)
                else if (page.pageimage && page.pageimage.startsWith('Item_')) map[name] = page.pageimage
                else noImage.push(name)
            })

            // Phase 2: pages without an own image are artifact sets; use a piece
            // (flower where available) from the set infobox
            const PIECE_SLOTS = ['flower', 'plume', 'sands', 'goblet', 'circlet']
            const pages2 = await batched(noImage.map(titleOf), { prop: 'revisions', rvprop: 'content', rvslots: 'main' })
            noImage.forEach(name => {
                const page = pages2[titleOf(name)]
                const wikitext = page?.revisions?.[0]?.slots?.main?.['*'] || ''
                let piece = null
                for (const slot of PIECE_SLOTS) {
                    const m = wikitext.match(new RegExp(`\\|\\s*${slot}\\s*=\\s*([^\\n|}]+)`))
                    if (m) { piece = m[1].trim(); break }
                }
                map[name] = piece ? `Item_${piece.replaceAll(' ', '_')}.png` : null
            })

            this.itemImages = map
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ version, map }))
            } catch (e) {}
        },

        // In-game day rolls over at 04:00 server time (Asia server, UTC+8)
        getServerDay() {
            const serverTime = new Date(
                new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
            )
            serverTime.setHours(serverTime.getHours() - 4)
            return DAY_KEYS[serverTime.getDay()]
        },

        // Index characters from data.json by both full name and display name,
        // so short names used in domain data ("Childe", "Flins") resolve
        buildCharacterLookup(charactersData) {
            const lookup = {}
            Object.values(charactersData.characters || {}).forEach(c => {
                const info = {
                    fullName: c.name,
                    displayName: c.display_name || c.name,
                    element: c.element,
                    photo: c.photo,
                }
                lookup[c.name.toLowerCase()] = info
                if (c.display_name) lookup[c.display_name.toLowerCase()] = info
            })
            this.characterLookup = lookup
        },

        resolveCharacter(name) {
            return this.characterLookup[name.toLowerCase()] || null
        },

        // Map each reward key to the domains that drop it, with days if rotating
        buildRewardSources() {
            const sources = {}
            const add = (rewardKey, domain, day) => {
                if (!sources[rewardKey]) sources[rewardKey] = []
                let entry = sources[rewardKey].find(s => s.name === domain.name)
                if (!entry) {
                    entry = { name: domain.name, region: domain.region, days: day ? [] : null }
                    sources[rewardKey].push(entry)
                }
                if (day && entry.days && !entry.days.includes(day)) entry.days.push(day)
            }
            this.allData.domains.forEach(domain => {
                if (Array.isArray(domain.rewards)) {
                    domain.rewards.forEach(key => add(key, domain, null))
                } else {
                    Object.entries(domain.rewards).forEach(([day, keys]) => {
                        keys.forEach(key => add(key, domain, day))
                    })
                }
            })
            this.rewardSources = sources
        },

        setFiltersFromUrl() {
            const urlParams = new URLSearchParams(window.location.search)
            const type = urlParams.get('t')
            Object.entries(DOMAIN_TYPES).forEach(([key, details]) => {
                if (type === details.short) this.selectedType = key
            })
            const region = urlParams.get('re')
            Object.entries(DOMAIN_REGIONS).forEach(([key, details]) => {
                if (region === details.short) this.selectedRegion = key
            })
            const day = urlParams.get('d')
            if (DAY_KEYS.includes(day)) this.selectedDay = day
            const query = urlParams.get('q')
            if (query) this.searchQuery = query
        },

        searching() {
            return this.searchQuery.trim() !== ''
        },

        typeDetails() {
            return DOMAIN_TYPES[this.selectedType]
        },

        typeHasChangingRewards() {
            return this.typeDetails().changing_rewards
        },

        typeIsOverworld() {
            return !!this.typeDetails().overworld
        },

        filteredDomains() {
            return this.allData.domains.filter(domain => {
                if (domain.type !== this.selectedType) return false
                if (this.selectedRegion !== 'All' && domain.region !== this.selectedRegion) return false
                return true
            })
        },

        // Rewards is a list if the same rewards everyday, otherwise it's a dict keyed by day
        rewardKeysFor(domain) {
            if (Array.isArray(domain.rewards)) return domain.rewards
            return domain.rewards[this.selectedDay] || []
        },

        filteredSpecialties() {
            return Object.values(this.allData.specialties || {}).filter(specialty =>
                this.selectedRegion === 'All' || specialty.region === this.selectedRegion
            )
        },

        specialtyCharactersHtml(specialty) {
            if (specialty.characters.length === 0) {
                return '<span class="text-unknown">Not used by any character yet</span>'
            }
            return specialty.characters.map(c => this.characterChipHtml(c)).join(', ')
        },

        allRewardKeysFor(domain) {
            if (Array.isArray(domain.rewards)) return domain.rewards
            const keys = []
            Object.values(domain.rewards).forEach(dayRewards => {
                dayRewards.forEach(key => {
                    if (!keys.includes(key)) keys.push(key)
                })
            })
            return keys
        },

        escapeHtml(s) {
            return s.replaceAll('&', '&amp;')
                .replaceAll('<', '&lt;')
                .replaceAll('>', '&gt;')
                .replaceAll('"', '&quot;')
        },

        // Escape, and mark the part matching the current search query
        highlight(s) {
            const query = this.searchQuery.trim()
            if (!query) return this.escapeHtml(s)
            const index = s.toLowerCase().indexOf(query.toLowerCase())
            if (index === -1) return this.escapeHtml(s)
            return this.escapeHtml(s.slice(0, index))
                + '<mark>' + this.escapeHtml(s.slice(index, index + query.length)) + '</mark>'
                + this.escapeHtml(s.slice(index + query.length))
        },

        wikiLink(item) {
            const wikiName = WIKI_ALT_NAMES[item] || item
            return GENSHIN_WIKI + encodeURIComponent(wikiName.replaceAll(' ', '_'))
        },

        // Bare wiki image URLs (no /revision/... suffix) are served regardless of referer;
        // the scaled-thumbnail URLs are not, so use the full-size images (5-20 KB each).
        wikiFileUrl(filename) {
            filename = filename.replaceAll(' ', '_')
            const hash = md5Hex(filename)
            const encoded = encodeURIComponent(filename)
                .replaceAll("'", '%27').replaceAll('(', '%28').replaceAll(')', '%29')
            return `https://static.wikia.nocookie.net/gensin-impact/images/${hash[0]}/${hash.slice(0, 2)}/${encoded}`
        },

        itemThumbHtml(item) {
            const filename = this.itemImages[item]
            const src = filename ? this.wikiFileUrl(filename) : FALLBACK_PHOTO
            return `<img src="${src}" class="item-thumb" width="20" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
        },

        // Wiki region emblem images are named "Emblem {Region}.png"
        regionIconHtml(region) {
            const src = this.wikiFileUrl(`Emblem ${region}.png`)
            return `<img src="${src}" class="region-icon" width="20" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
        },

        wikiLinkHtml(item) {
            const displayName = this.highlight(item)
            if (item === '???') return displayName
            return `<a href="${this.wikiLink(item)}" class="clickable">${displayName}</a>`
        },

        characterChipHtml(name) {
            const info = this.resolveCharacter(name)
            const elementClass = (info && info.element)
                ? `el-${info.element.toLowerCase()}`
                : 'el-unknown'
            let chip = ''
            if (info) {
                chip += `<img src="${info.photo}" width="20" height="20" loading="lazy"`
                    + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
            }
            chip += `<span class="gi-font ${elementClass}">${this.highlight(name)}</span>`
            if (name === '???') return `<span class="char-chip">${chip}</span>`
            return `<a href="${this.wikiLink(info ? info.fullName : name)}" class="char-chip">${chip}</a>`
        },

        domainNameHtml(domain) {
            return `${DOMAIN_TYPES[domain.type].icon} <span class="gi-font">${this.highlight(domain.name)}</span>`
        },

        locationHtml(domain) {
            const icon = this.regionIconHtml(domain.region)
            const segments = domain.location ? domain.location.split(', ') : []
            segments.push(domain.region)
            const lines = segments.map(s => this.highlight(s))
            return `${icon} ${lines.join(',<br>')}`
        },

        formatDays(days) {
            const ordered = DAY_DISPLAY_ORDER.filter(day => days.includes(day))
            return ordered.map(day => DOMAIN_DAYS[day].slice(0, 3)).join(', ')
        },

        // "Where to get it" for a reward: domain name(s), with days if rotating
        rewardSourceHtml(rewardKey) {
            const sources = this.rewardSources[rewardKey] || []
            return sources.map(source => {
                const icon = this.regionIconHtml(source.region)
                let text = `${icon} <span class="gi-font">${this.escapeHtml(source.name)}</span>`
                if (source.days) text += ` <span class="source-days">(${this.formatDays(source.days)})</span>`
                return text
            }).join('<br>')
        },

        formatRewardByKey(rewardKey) {
            const reward = this.allData.rewards[rewardKey]
            if (!reward) return `<span class="text-unknown">${this.escapeHtml(rewardKey)}</span>`
            return this.formatReward(reward)
        },

        formatReward(reward, withRewardType = false) {
            let text = ''
            if (withRewardType && reward.type) {
                text += `${DOMAIN_TYPES[reward.type].icon} `
            }
            text += `${this.itemThumbHtml(reward.name)} ${this.wikiLinkHtml(reward.name)}`
            if (reward.characters && reward.characters.length > 0) {
                const chips = reward.characters.map(c => this.characterChipHtml(c))
                text += ` (${chips.join(', ')})`
            } else if (reward.effect) {
                text += ` (${this.highlight(reward.effect)})`
            }
            return text
        },

        matchesQuery(s) {
            if (!s) return false
            return s.toLowerCase().includes(this.searchQuery.toLowerCase().trim())
        },

        characterMatchesQuery(name) {
            if (this.matchesQuery(name)) return true
            const info = this.resolveCharacter(name)
            if (!info) return false
            return this.matchesQuery(info.fullName) || this.matchesQuery(info.displayName)
        },

        searchedDomains() {
            if (!this.searching()) return []
            return this.allData.domains.filter(domain =>
                this.matchesQuery(domain.name)
                || this.matchesQuery(domain.location)
                || this.matchesQuery(domain.region)
            )
        },

        searchedRewardEntries() {
            if (!this.searching()) return []
            return Object.entries(this.allData.rewards).filter(([key, reward]) => {
                if (this.matchesQuery(reward.name)) return true
                if (this.matchesQuery(WIKI_ALT_NAMES[reward.name])) return true
                if (this.matchesQuery(reward.effect)) return true
                if (!reward.characters) return false
                return reward.characters.some(c => this.characterMatchesQuery(c))
            })
        },

        searchedSpecialties() {
            if (!this.searching()) return []
            return Object.values(this.allData.specialties || {}).filter(specialty =>
                this.matchesQuery(specialty.name)
                || this.matchesQuery(specialty.region)
                || specialty.characters.some(c => this.characterMatchesQuery(c))
            )
        },

        zeroPad(n) {
            return String(n).padStart(2, '0')
        },

        lastUpdatedFormatted() {
            const lastUpdated = this.allData['last_updated']
            if (!lastUpdated) return ''
            const date = new Date(lastUpdated)
            const wd = DOMAIN_WEEKDAYS[date.getDay()]
            const y = date.getFullYear()
            const m = DOMAIN_MONTHS[date.getMonth()]
            const d = date.getDate()
            const h = this.zeroPad(date.getHours())
            const mn = this.zeroPad(date.getMinutes())
            const s = this.zeroPad(date.getSeconds())
            return `${wd}, ${d} ${m} ${y} ${h}:${mn}:${s}`
        },
    }))
})
