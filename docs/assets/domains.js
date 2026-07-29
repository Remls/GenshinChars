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
}
const DOMAIN_REGIONS = {
    'All':       { icon: '🅰️', short: 'a' },
    'Mondstadt': { icon: '💚', short: 'm' },
    'Liyue':     { icon: '🧡', short: 'l' },
    'Inazuma':   { icon: '💜', short: 'i' },
    'Sumeru':    { icon: '🤎', short: 'su' },
    'Fontaine':  { icon: '💙', short: 'f' },
    'Natlan':    { icon: '❤️', short: 'n' },
    'Nod-Krai':  { icon: '🩶', short: 'nk' },
    'Snezhnaya': { icon: '🤍', short: 'sn' },
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
    // Characters
    'Childe':    'Tartaglia',
    'Kazuha':    'Kaedehara Kazuha',
    'Ayaka':     'Kamisato Ayaka',
    'Ayato':     'Kamisato Ayato',
    'Sara':      'Kujou Sara',
    'Ei':        'Raiden Shogun',
    'Kokomi':    'Sangonomiya Kokomi',
    'Itto':      'Arataki Itto',
    'Miko':      'Yae Miko',
    'Shinobu':   'Kuki Shinobu',
    'Heizou':    'Shikanoin Heizou',
    'Mizuki':    'Yumemizuki Mizuki',
    'Columbina': 'Columbina Hyposelenia',

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
        allData: { domains: [], rewards: {} },
        characterLookup: {},
        rewardSources: {},

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
            })
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
            const altName = WIKI_ALT_NAMES[name] || ''
            return this.characterLookup[name.toLowerCase()]
                || this.characterLookup[altName.toLowerCase()]
                || null
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
            return `<a href="${this.wikiLink(name)}" class="char-chip">${chip}</a>`
        },

        domainNameHtml(domain) {
            return `${DOMAIN_TYPES[domain.type].icon} <span class="gi-font">${this.highlight(domain.name)}</span>`
        },

        locationHtml(domain) {
            const icon = DOMAIN_REGIONS[domain.region].icon
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
                const icon = DOMAIN_REGIONS[source.region].icon
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
            text += this.wikiLinkHtml(reward.name)
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
            if (this.matchesQuery(WIKI_ALT_NAMES[name])) return true
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
