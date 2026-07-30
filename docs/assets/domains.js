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
    normal_bosses: {
        button_label: 'Normal bosses',
        icon: 'Icon Archive Living Beings.png',
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
        overworld: true,
    },
}
const DOMAIN_REGIONS = [
    'All', 'Mondstadt', 'Liyue', 'Inazuma', 'Sumeru',
    'Fontaine', 'Natlan', 'Nod-Krai', 'Snezhnaya',
]
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
// Bosses whose archive icon file ("{name} Icon.png") uses a different base name
// than their wiki page
const BOSS_ICON_ALIASES = {
    'Stormterror Dvalin': 'Stormterror',
    'Childe':             'Childe P3',
    'Rhodeia of Loch':    'Oceanid',
}

const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
// For displaying availability: weekdays first, Sunday (everything drops) last
const DAY_DISPLAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

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
        domainImages: {},

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
            this.initInfoTooltips()
            this.serverDay = this.getServerDay()
            Promise.all([
                fetch('./assets/domains.json').then(r => r.json()),
                fetch('./assets/characters.json').then(r => r.json()),
            ]).then(([domainsData, charactersData]) => {
                this.allData = domainsData
                this.buildCharacterLookup(charactersData)
                this.buildRewardSources()
                // Set here (not on init) so all bindings exist by the time this runs
                this.selectedDay = this.serverDay
                this.setFiltersFromUrl()
                ;['searchQuery', 'selectedType', 'selectedRegion', 'selectedDay'].forEach(prop => {
                    this.$watch(prop, () => this.syncFiltersToUrl())
                })
                this.resolveWikiImages().catch(() => {})
            })
        },

        // Info buttons are rendered inside x-html strings, so their behavior is
        // delegated: hover shows the tooltip, tap/click pins it open. Tooltips are
        // position: fixed to escape the table wrapper's overflow clipping.
        initInfoTooltips() {
            const hide = tooltip => {
                tooltip.classList.remove('open')
                tooltip.style.display = 'none'
            }
            const hideAll = except => {
                document.querySelectorAll('.info-tooltip').forEach(el => {
                    if (el !== except) hide(el)
                })
            }
            const show = (button, tooltip) => {
                tooltip.style.display = 'block'
                const margin = 8
                const rect = button.getBoundingClientRect()
                const left = Math.min(rect.left, window.innerWidth - tooltip.offsetWidth - margin)
                let top = rect.bottom + 6
                if (top + tooltip.offsetHeight > window.innerHeight - margin) {
                    top = Math.max(margin, rect.top - tooltip.offsetHeight - 6)
                }
                tooltip.style.left = `${Math.max(margin, left)}px`
                tooltip.style.top = `${top}px`
            }
            document.addEventListener('click', e => {
                if (e.target.closest('.info-tooltip')) return
                const button = e.target.closest('.info-button')
                const tooltip = button && button.nextElementSibling
                hideAll(tooltip)
                if (!tooltip) return
                if (tooltip.classList.toggle('open')) show(button, tooltip)
                else tooltip.style.display = 'none'
            })
            document.addEventListener('mouseover', e => {
                const button = e.target.closest('.info-button')
                const tooltip = button && button.nextElementSibling
                if (tooltip && !tooltip.classList.contains('open')) show(button, tooltip)
            })
            document.addEventListener('mouseout', e => {
                const button = e.target.closest('.info-button')
                const tooltip = button && button.nextElementSibling
                if (tooltip && !tooltip.classList.contains('open')) tooltip.style.display = 'none'
            })
            window.addEventListener('scroll', () => hideAll(null), { passive: true })
        },

        // Resolve real image filenames from the wiki API, for items and for
        // domains/bosses. Guessing filenames is not enough: artifact sets have no
        // image of their own (we use their flower piece), some filenames drop
        // characters like ":", and the CDN answers requests for nonexistent files
        // with a placeholder image instead of an error. Results are cached per
        // data version.
        async resolveWikiImages() {
            const cacheKey = 'domains_wiki_images'
            const version = this.allData.last_updated
            try {
                const cached = JSON.parse(localStorage.getItem(cacheKey))
                if (cached && cached.version === version) {
                    this.itemImages = cached.items
                    this.domainImages = cached.domains
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

            // Domains and bosses: the parenthetical part of weekly boss names is
            // the boss, whose page has a portrait; the stripped name is the page
            // the row should link to
            const strip = name => name.replace(/\s*\([^)]*\)$/, '')
            const paren = name => {
                const m = name.match(/\(([^)]*)\)$/)
                return m ? m[1] : null
            }
            const domainEntries = []
            const seenDomains = new Set()
            this.allData.domains.forEach(dm => {
                if (dm.name.startsWith('???') || seenDomains.has(dm.name)) return
                seenDomains.add(dm.name)
                domainEntries.push({ name: dm.name, type: dm.type })
            })
            const titles = new Set()
            const bossTitles = new Set()
            domainEntries.forEach(({ name, type }) => {
                titles.add(strip(name))
                const bossLabel = paren(name)
                if (bossLabel) { titles.add(bossLabel); bossTitles.add(bossLabel) }
                else if (type === 'normal_bosses') bossTitles.add(strip(name))
            })
            const pages3 = await batched([...titles], { prop: 'pageimages', piprop: 'name' })
            const imageOf = title => {
                const page = pages3[title]
                if (!page || 'missing' in page) return null
                return page.pageimage || null
            }

            // Bosses have in-game archive icons named "{Boss} Icon.png" (colons
            // dropped), which look better than the pageimages artwork
            const iconFileFor = title => {
                const page = pages3[title]
                const finalTitle = (page && page.title) || title
                const base = BOSS_ICON_ALIASES[title] || BOSS_ICON_ALIASES[finalTitle] || finalTitle
                return `${base.replaceAll(':', '')} Icon.png`
            }
            const iconTitles = [...new Set([...bossTitles].map(iconFileFor))]
            const pages4 = await batched(iconTitles.map(t => `File:${t}`), {})
            const iconExists = {}
            iconTitles.forEach(t => {
                const page = pages4[`File:${t}`]
                iconExists[t] = !!(page && !('missing' in page))
            })
            const bossImageOf = title => {
                const iconFile = iconFileFor(title)
                if (iconExists[iconFile]) return iconFile.replaceAll(' ', '_')
                return imageOf(title)
            }

            const domainMap = {}
            domainEntries.forEach(({ name, type }) => {
                const linkTitle = strip(name)
                const linkPage = pages3[linkTitle]
                const bossLabel = paren(name)
                let image = null
                let boss = null
                if (bossLabel) {
                    // Boss rows always show a boss portrait, never the domain
                    boss = {
                        name: bossLabel,
                        hasPage: !!(pages3[bossLabel] && !('missing' in pages3[bossLabel])),
                    }
                    image = bossImageOf(bossLabel)
                } else if (type === 'normal_bosses') {
                    image = bossImageOf(linkTitle)
                } else {
                    image = imageOf(linkTitle)
                }
                domainMap[name] = {
                    image,
                    link: linkPage && !('missing' in linkPage) ? linkTitle : null,
                    boss,
                }
            })

            this.itemImages = map
            this.domainImages = domainMap
            try {
                localStorage.setItem(cacheKey, JSON.stringify({ version, items: map, domains: domainMap }))
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

        // Index characters from characters.json by both full name and display name,
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
                    entry = { name: domain.name, location: domain.location, region: domain.region, days: day ? [] : null }
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
            DOMAIN_REGIONS.forEach(key => {
                if (region === key.toLowerCase()) this.selectedRegion = key
            })
            const day = urlParams.get('d')
            if (DAY_KEYS.includes(day)) this.selectedDay = day
            const query = urlParams.get('q')
            if (query) this.searchQuery = query
        },

        syncFiltersToUrl() {
            const params = new URLSearchParams()
            if (this.searching()) {
                params.set('q', this.searchQuery)
            } else {
                params.set('t', DOMAIN_TYPES[this.selectedType].short)
                if (this.selectedRegion !== 'All') {
                    params.set('re', this.selectedRegion.toLowerCase())
                }
                if (this.typeHasChangingRewards()) {
                    params.set('d', this.selectedDay)
                }
            }
            history.replaceState(null, '', `?${params.toString()}`)
        },

        searchTerms() {
            return this.searchQuery.split(',')
                .map(term => foldedText(term).text.trim())
                .filter(term => term !== '')
        },

        searching() {
            return this.searchTerms().length > 0
        },

        resetCache() {
            localStorage.clear()
            location.reload()
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
            return specialty.characters.map(c => `<div>${this.characterChipHtml(c)}</div>`).join('')
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

        // Escape, and mark the parts matching the current search terms
        highlight(s) {
            const folded = foldedText(s)
            const ranges = []
            this.searchTerms().forEach(term => {
                const index = folded.text.indexOf(term)
                if (index !== -1) {
                    ranges.push([folded.map[index], folded.map[index + term.length - 1] + 1])
                }
            })
            ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1])  // longest first on ties
            let html = ''
            let pos = 0
            ranges.forEach(([start, end]) => {
                if (start < pos) return  // overlaps an already marked range
                html += this.escapeHtml(s.slice(pos, start))
                    + '<mark>' + this.escapeHtml(s.slice(start, end)) + '</mark>'
                pos = end
            })
            return html + this.escapeHtml(s.slice(pos))
        },

        wikiLink(item) {
            const wikiName = WIKI_ALT_NAMES[item] || item
            return GENSHIN_WIKI + encodeURIComponent(wikiName.replaceAll(' ', '_'))
        },


        itemThumbHtml(item) {
            const filename = this.itemImages[item]
            const src = filename ? wikiFileUrl(filename) : FALLBACK_PHOTO
            return `<img src="${src}" class="item-thumb" width="20" height="20" loading="lazy"`
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

        wikiTitleLink(html, title) {
            return `<a href="${GENSHIN_WIKI + encodeURIComponent(title.replaceAll(' ', '_'))}" class="clickable">${html}</a>`
        },

        // Thumbnail plus linked name(s) for a domain, by its name in the data.
        // Boss rows render as "[thumb] Boss name" with the domain below in grey.
        domainLabelHtml(domainName, suffix = '') {
            const info = this.domainImages[domainName] || {}
            const thumbClass = (info.image && info.image.startsWith('Domain_')) ? 'domain-shot' : 'item-thumb'
            const src = info.image ? wikiFileUrl(info.image) : FALLBACK_PHOTO
            const thumb = `<img src="${src}" class="${thumbClass}" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`

            if (info.boss) {
                let bossHtml = `<span class="gi-font">${this.highlight(info.boss.name)}</span>`
                if (info.boss.hasPage) bossHtml = this.wikiTitleLink(bossHtml, info.boss.name)
                const strippedName = domainName.replace(/\s*\([^)]*\)$/, '')
                let domainHtml = `<span class="gi-font">${this.highlight(strippedName)}</span>`
                if (info.link) domainHtml = this.wikiTitleLink(domainHtml, info.link)
                return `${thumb} ${bossHtml}${suffix}<br><span class="domain-paren">${domainHtml}</span>`
            }

            let name = `<span class="gi-font">${this.highlight(domainName)}</span>`
            if (info.link) name = this.wikiTitleLink(name, info.link)
            return `${thumb} ${name}${suffix}`
        },

        typeIconHtml(type) {
            const icon = DOMAIN_TYPES[type].icon
            const invertClass = icon.startsWith('Item ') ? '' : ' type-icon'
            return `<img src="${wikiFileUrl(icon)}" class="item-thumb${invertClass}" width="20" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
        },

        domainNameHtml(domain) {
            return `${this.typeIconHtml(domain.type)} ${this.domainLabelHtml(domain.name)}`
        },

        locationHtml(domain) {
            const icon = regionIconHtml(domain.region)
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
                const days = source.days
                    ? ` <span class="source-days">(${this.formatDays(source.days)})</span>`
                    : ''
                const locationText = source.location ? `${source.location}, ${source.region}` : source.region
                return `${regionIconHtml(source.region)} ${this.domainLabelHtml(source.name, days)}`
                    + `<br><span class="domain-paren">${this.highlight(locationText)}</span>`
            }).join('<br>')
        },

        rewardListHtml(rewardKeys) {
            return rewardKeys.map(key => `<li>${this.formatRewardByKey(key)}</li>`).join('')
        },

        formatRewardByKey(rewardKey) {
            const reward = this.allData.rewards[rewardKey]
            if (!reward) return `<span class="text-unknown">${this.escapeHtml(rewardKey)}</span>`
            return this.formatReward(reward)
        },

        formatReward(reward, withRewardType = false) {
            let text = ''
            if (withRewardType && reward.type) {
                text += `${this.typeIconHtml(reward.type)} `
            }
            text += `${this.itemThumbHtml(reward.name)} ${this.wikiLinkHtml(reward.name)}`
            if (reward.effect_4pc) {
                text += ` ${this.setEffectsButtonHtml(reward)}`
            }
            if (reward.characters && reward.characters.length > 0) {
                text += reward.characters
                    .map(c => `<div class="reward-char">${this.characterChipHtml(c)}</div>`)
                    .join('')
            } else if (reward.effect && !reward.effect_4pc) {
                text += ` (${this.highlight(reward.effect)})`
            }
            return text
        },

        // Info button revealing the full set description, on tap or hover
        setEffectsButtonHtml(reward) {
            const content = `<span class="pc-badge">2</span> ${this.highlight(reward.effect)}`
                + `<br><span class="pc-badge">4</span> ${this.highlight(reward.effect_4pc)}`
            return `<span class="info-button" role="button" tabindex="0" aria-label="Full set description">i</span>`
                + `<span class="info-tooltip">${content}</span>`
        },

        matchesQuery(s) {
            if (!s) return false
            const folded = foldedText(s).text
            return this.searchTerms().some(term => folded.includes(term))
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
                if (this.matchesQuery(reward.effect_4pc)) return true
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
            const wd = WEEKDAYS[date.getDay()]
            const y = date.getFullYear()
            const m = MONTHS[date.getMonth()]
            const d = date.getDate()
            const h = this.zeroPad(date.getHours())
            const mn = this.zeroPad(date.getMinutes())
            const s = this.zeroPad(date.getSeconds())
            return `${wd}, ${d} ${m} ${y} ${h}:${mn}:${s}`
        },
    }))
})
