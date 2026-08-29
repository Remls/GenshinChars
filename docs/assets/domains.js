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
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
// For displaying availability: weekdays first, Sunday (everything drops) last
const DAY_DISPLAY_ORDER = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

document.addEventListener('alpine:init', () => {
    Alpine.data('domainSheet', () => ({
        DOMAIN_TYPES,
        DOMAIN_REGIONS,
        DOMAIN_DAYS,

        // Data
        allData: { domains: [], rewards: {}, specialties: {}, other_materials: {} },
        includedSpecials: [],
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
                this.buildImageMaps()
                configureCharSheet('genshin', charactersData.versions,
                    buildCharacterMaterials(domainsData))
                // The day filter starts on the current server day
                this.selectedDay = this.serverDay
                this.setFiltersFromUrl()
                ;['searchQuery', 'selectedType', 'selectedRegion', 'selectedDay', 'includedSpecials'].forEach(prop => {
                    this.$watch(prop, () => this.syncFiltersToUrl())
                })
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

        // Thumbnails come from the data, resolved by the generator. Indexed by
        // name here because that is what the reward and domain rows carry.
        buildImageMaps() {
            const items = {}
            ;[this.allData.rewards, this.allData.specialties, this.allData.other_materials]
                .forEach(group => Object.values(group || {})
                    .forEach(entry => { items[entry.name] = entry.image }))
            this.itemImages = items
            const domains = {}
            this.allData.domains.forEach(d => {
                domains[d.name] = { image: d.image, link: d.link, boss: d.boss }
            })
            this.domainImages = domains
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
                const elements = [...new Set(c.forms.map(f => f.element).filter(Boolean))]
                const info = {
                    fullName: c.name,
                    displayName: c.display_name || c.name,
                    element: c.element,
                    colours: elements.map(e => `el-${e.toLowerCase()}`),
                    photo: characterImageUrl(c.photo, 'gensin-impact', 'assets/images/characters', 40),
                    record: c,
                    form: null,
                }
                lookup[c.name.toLowerCase()] = info
                if (c.display_name) lookup[c.display_name.toLowerCase()] = info
                // Multi-form characters are named per form in the reward lists, and
                // each form carries its own element and art
                c.forms.forEach(f => {
                    if (!f.display_name || f.display_name === info.displayName) return
                    lookup[f.display_name.toLowerCase()] = {
                        fullName: c.name,
                        displayName: f.display_name,
                        element: f.element,
                        photo: characterImageUrl(
                            f.photo || c.photo, 'gensin-impact', 'assets/images/characters', 40
                        ),
                        record: c,
                        form: f,
                    }
                })
            })
            this.characterLookup = lookup
        },

        resolveCharacter(name) {
            return this.characterLookup[name.toLowerCase()] || null
        },

        // Special characters stay out of every list until the reader opts in.
        // Their entries are either the plain name or one form of it
        isSpecial(name, special) {
            return name === special || name.startsWith(`${special} (`)
        },

        visibleCharacters(names) {
            // A search reaches past every filter, this one included
            if (this.searching()) return names || []
            return (names || []).filter(name => {
                const special = SPECIAL_CHARACTERS.genshin.find(s => this.isSpecial(name, s))
                return !special || this.includedSpecials.includes(special)
            })
        },

        toggleSpecial(name) {
            this.includedSpecials = this.includedSpecials.includes(name)
                ? this.includedSpecials.filter(n => n !== name)
                : [...this.includedSpecials, name]
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
            if (region) {
                DOMAIN_REGIONS.forEach(r => {
                    if (region.toLowerCase() === r.toLowerCase()) this.selectedRegion = r
                })
            }
            const day = urlParams.get('d')
            if (DAY_KEYS.includes(day)) this.selectedDay = day
            const specials = (urlParams.get('s') || '').split(',')
            this.includedSpecials = SPECIAL_CHARACTERS.genshin.filter(
                name => specials.some(x => x.toLowerCase() === name.toLowerCase())
            )
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
            if (this.includedSpecials.length > 0) {
                params.set('s', this.includedSpecials.map(n => n.toLowerCase()).join(','))
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
            resetImageCache()
            location.reload()
        },

        typeDetails() {
            return DOMAIN_TYPES[this.selectedType]
        },

        typeHasChangingRewards() {
            return this.typeDetails().changing_rewards
        },

        // Which top-level key of the data the selected type renders from
        typeSource() {
            return this.typeDetails().source || 'domains'
        },

        typeHasRegions() {
            return !this.typeDetails().no_regions
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
            const characters = this.visibleCharacters(specialty.characters)
            if (characters.length === 0) {
                return '<span class="text-unknown">Not used by any character yet</span>'
            }
            return characters.map(c => `<div>${this.characterChipHtml(c)}</div>`).join('')
        },

        filteredOtherMaterials() {
            return Object.values(this.allData.other_materials || {})
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


        // Thumbnails render at 20px, domain shots at 36x20. The CDN refuses scaled
        // URLs when a Referer arrives, so the tags opt out of sending one
        itemThumbHtml(item) {
            const filename = this.itemImages[item]
            const src = filename ? wikiFileUrl(filename, 'gensin-impact', 40) : FALLBACK_PHOTO
            return `<img src="${src}" class="item-thumb" width="20" height="20" loading="lazy"`
                + ` referrerpolicy="no-referrer"`
                + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
        },


        wikiLinkHtml(item) {
            const displayName = this.highlight(item)
            if (item === '???') return displayName
            return `<a href="${this.wikiLink(item)}" class="clickable">${displayName}</a>`
        },

        characterChipHtml(name) {
            const info = this.resolveCharacter(name)
            const colours = (info && info.colours) || []
            const elementClass = colours.length > 1
                ? 'el-multi'
                : ((info && info.element) ? `el-${info.element.toLowerCase()}` : 'el-unknown')
            let chip = ''
            if (info) {
                chip += `<img src="${info.photo}" width="20" height="20" loading="lazy"`
                    + ` referrerpolicy="no-referrer"`
                    + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
            }
            const displayName = info ? info.displayName : name
            chip += `<span class="gi-font ${elementClass}"${formColourStyle(colours)}>`
                + `${this.highlight(displayName)}</span>`
            if (name === '???') return `<span class="char-chip">${chip}</span>`
            // The chip stays a wiki link; a plain left click opens the sheet. The
            // name travels as a data attribute, since the markup is a string
            return `<a href="${this.wikiLink(info ? info.fullName : name)}" class="char-chip"`
                + ` data-char="${this.escapeHtml(name)}"`
                + ` @click="openCharSheetFromChip($event)">${chip}</a>`
        },

        // A name the CSV does not carry resolves to nothing, so its chip stays a
        // plain link to the wiki
        openCharSheetFromChip(event) {
            const info = this.resolveCharacter(event.currentTarget.dataset.char)
            if (!info) return
            charSheetChipClick(event, info.record, info.form)
        },

        wikiTitleLink(html, title) {
            return `<a href="${GENSHIN_WIKI + encodeURIComponent(title.replaceAll(' ', '_'))}" class="clickable">${html}</a>`
        },

        // Thumbnail plus linked name(s) for a domain, by its name in the data.
        // Boss rows render as "[thumb] Boss name" with the domain below in grey.
        domainLabelHtml(domainName, suffix = '') {
            const info = this.domainImages[domainName] || {}
            const thumbClass = (info.image && info.image.startsWith('Domain_')) ? 'domain-shot' : 'item-thumb'
            const width = thumbClass === 'domain-shot' ? 80 : 40
            const src = info.image ? wikiFileUrl(info.image, 'gensin-impact', width) : FALLBACK_PHOTO
            const thumb = `<img src="${src}" class="${thumbClass}" height="20" loading="lazy"`
                + ` referrerpolicy="no-referrer"`
                + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`

            if (info.boss) {
                let bossHtml = `<span class="gi-font">${this.highlight(info.boss.name)}</span>`
                if (info.boss.has_page) bossHtml = this.wikiTitleLink(bossHtml, info.boss.name)
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
            return `<img src="${wikiFileUrl(icon, 'gensin-impact', 40)}" class="item-thumb${invertClass}" width="20" height="20" loading="lazy"`
                + ` referrerpolicy="no-referrer"`
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
            if (reward.characters && this.visibleCharacters(reward.characters).length > 0) {
                text += this.visibleCharacters(reward.characters)
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
                return this.visibleCharacters(reward.characters).some(c => this.characterMatchesQuery(c))
            })
        },

        searchedSpecialties() {
            if (!this.searching()) return []
            return Object.values(this.allData.specialties || {}).filter(specialty =>
                this.matchesQuery(specialty.name)
                || this.matchesQuery(specialty.region)
                || this.visibleCharacters(specialty.characters).some(c => this.characterMatchesQuery(c))
            )
        },

        searchedOtherMaterials() {
            if (!this.searching()) return []
            return Object.values(this.allData.other_materials || {}).filter(material =>
                this.matchesQuery(material.name)
                || this.visibleCharacters(material.characters).some(c => this.characterMatchesQuery(c))
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
