const HSR_WIKI = 'https://honkai-star-rail.fandom.com/wiki/'
// The wiki is honkai-star-rail.fandom.com but its image CDN bucket is "houkai"
const HSR_WIKI_IMAGES = 'houkai-star-rail'
const HSR_FALLBACK = '../assets/images/Fallback.png'

const HSR_DOMAIN_TYPES = {
    calyx_crimson: {
        short: 't',
        icon: 'Icon Calyx Crimson.png',
        string: 'Trace mats',
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
}
const HSR_DOMAIN_WORLDS = [
    'All', 'Herta Space Station', 'Jarilo-VI', 'The Xianzhou Luofu',
    'Penacony', 'Amphoreus', 'Planarcadia',
]

document.addEventListener('alpine:init', () => {
    Alpine.data('hsrDomainSheet', () => ({
        HSR_DOMAIN_TYPES,
        HSR_DOMAIN_WORLDS,

        allData: {},
        characterLookup: {},
        rewardSources: {},

        showSection: {
            filters: true,
        },

        searchQuery: '',
        selectedType: 'calyx_crimson',
        selectedWorld: 'All',

        fetchAllData() {
            this.initInfoTooltips()
            Promise.all([
                fetch('./assets/domains.json').then(r => r.json()),
                fetch('./assets/characters.json').then(r => r.json()),
            ]).then(([domainsData, charactersData]) => {
                this.allData = domainsData
                this.buildCharacterLookup(charactersData)
                this.buildRewardSources()
                this.setFiltersFromUrl()
                ;['searchQuery', 'selectedType', 'selectedWorld'].forEach(prop => {
                    this.$watch(prop, () => this.syncFiltersToUrl())
                })
            })
        },

        buildCharacterLookup(charactersData) {
            const lookup = {}
            Object.values(charactersData['characters'] || {}).forEach(c => {
                lookup[c.name] = {
                    displayName: c.display_name || c.name,
                    combatType: c.forms[0].combat_type,
                }
                // Multi-path forms can be referenced by their form display name
                c.forms.forEach(f => {
                    if (!f.display_name || f.display_name === (c.display_name || c.name)) return
                    const pathLabel = f.path === 'Hunt' ? 'The Hunt' : f.path
                    lookup[f.display_name] = {
                        displayName: f.display_name,
                        combatType: f.combat_type,
                        iconName: `Character ${c.name} (${pathLabel}) Icon.png`,
                        wikiName: `${c.name}/${pathLabel}`,
                    }
                })
            })
            this.characterLookup = lookup
        },

        buildRewardSources() {
            const sources = {}
            this.allData.domains.forEach(domain => {
                domain.rewards.forEach(key => {
                    if (!sources[key]) sources[key] = []
                    sources[key].push(domain)
                })
            })
            this.rewardSources = sources
        },

        setFiltersFromUrl() {
            const urlParams = new URLSearchParams(window.location.search)
            const type = urlParams.get('t')
            Object.entries(HSR_DOMAIN_TYPES).forEach(([key, details]) => {
                if (type === details.short) this.selectedType = key
            })
            const world = urlParams.get('w')
            if (world) {
                HSR_DOMAIN_WORLDS.forEach(w => {
                    if (world.toLowerCase() === w.toLowerCase()) this.selectedWorld = w
                })
            }
            const query = urlParams.get('q')
            if (query) this.searchQuery = query
        },

        syncFiltersToUrl() {
            const params = new URLSearchParams()
            if (this.searching()) {
                params.set('q', this.searchQuery)
            } else {
                params.set('t', HSR_DOMAIN_TYPES[this.selectedType].short)
                if (this.selectedWorld !== 'All') {
                    params.set('w', this.selectedWorld.toLowerCase())
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

        typeDetails() {
            return HSR_DOMAIN_TYPES[this.selectedType]
        },

        filteredDomains() {
            return (this.allData.domains || []).filter(domain => {
                if (domain.type !== this.selectedType) return false
                if (this.selectedWorld !== 'All' && domain.region !== this.selectedWorld) return false
                return true
            })
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
            ranges.sort((a, b) => a[0] - b[0] || b[1] - a[1])
            let html = ''
            let pos = 0
            ranges.forEach(([start, end]) => {
                if (start < pos) return
                html += this.escapeHtml(s.slice(pos, start))
                    + '<mark>' + this.escapeHtml(s.slice(start, end)) + '</mark>'
                pos = end
            })
            return html + this.escapeHtml(s.slice(pos))
        },

        wikiUrl(title) {
            return HSR_WIKI + encodeURIComponent(title.replaceAll(' ', '_'))
        },

        wikiTitleLink(html, title) {
            return `<a href="${this.wikiUrl(title)}">${html}</a>`
        },

        thumbHtml(filename, cssClass = 'item-thumb') {
            const src = wikiFileUrl(filename, HSR_WIKI_IMAGES)
            return `<img src="${src}" class="${cssClass}" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${HSR_FALLBACK}'">`
        },

        itemThumbHtml(reward) {
            return this.thumbHtml(reward.image || `Item ${reward.name}.png`)
        },

        wikiLinkHtml(item) {
            const displayName = `<span class="gi-font">${this.highlight(item)}</span>`
            return this.wikiTitleLink(displayName, item)
        },

        characterChipHtml(name) {
            const info = this.characterLookup[name]
            const displayName = info ? info.displayName : name
            const colorClass = info && info.combatType ? `ct-${info.combatType.toLowerCase()}` : 'el-unknown'
            const iconName = (info && info.iconName) || `Character ${name} Icon.png`
            const src = wikiFileUrl(iconName, HSR_WIKI_IMAGES)
            let chip = `<img src="${src}" width="20" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${HSR_FALLBACK}'">`
            chip += `<span class="gi-font ${colorClass}">${this.highlight(displayName)}</span>`
            const wikiName = (info && info.wikiName) || name
            return `<a href="${this.wikiUrl(wikiName)}" class="char-chip">${chip}</a>`
        },

        wikiPageFor(domain) {
            if (domain.page) return domain.page
            const prefix = HSR_DOMAIN_TYPES[domain.type].page_prefix
            if (domain.type === 'calyx_crimson') {
                return `${prefix}: ${domain.name} (${domain.location})`
            }
            return `${prefix}: ${domain.name}`
        },

        domainThumbFile(domain) {
            if (domain.type === 'echo_of_war') return `Icon Echo of War ${domain.name}.png`
            return domain.image
        },

        domainLabelHtml(domain, suffix = '') {
            const file = this.domainThumbFile(domain)
            const thumbClass = file.startsWith('Item') || file.startsWith('Icon') ? 'item-thumb' : 'domain-shot'
            const thumb = this.thumbHtml(file, thumbClass)
            let name = `<span class="gi-font">${this.highlight(domain.name)}</span>`
            name = this.wikiTitleLink(name, this.wikiPageFor(domain))
            if (domain.type === 'planar_ornament') {
                const boss = domain.boss[0]
                const bossHtml = this.wikiTitleLink(`<span class="gi-font">${this.highlight(boss)}</span>`, boss)
                return `${thumb} ${bossHtml}${suffix}`
            }
            if (domain.boss && domain.boss.length > 0) {
                const bosses = domain.boss
                    .map(b => this.wikiTitleLink(`<span class="gi-font">${this.highlight(b)}</span>`, b))
                    .join(', ')
                return `${thumb} ${bosses}${suffix}<br><span class="domain-paren">${name}</span>`
            }
            return `${thumb} ${name}${suffix}`
        },

        domainNameHtml(domain) {
            return `${this.typeIconHtml(domain.type)} ${this.domainLabelHtml(domain)}`
        },

        typeIconHtml(type) {
            return this.thumbHtml(HSR_DOMAIN_TYPES[type].icon)
        },

        worldIconHtml(world) {
            return this.thumbHtml(`Icon ${world}.png`, 'region-icon')
        },

        locationHtml(domain) {
            if (domain.type === 'planar_ornament') {
                const name = `<span class="gi-font">${this.highlight(domain.name)}</span>`
                return this.wikiTitleLink(name, this.wikiPageFor(domain))
            }
            const segments = domain.location ? domain.location.split(', ') : []
            segments.push(domain.region)
            return segments.map(s => this.highlight(s)).join(',<br>')
        },

        rewardSourceHtml(rewardKey) {
            const sources = this.rewardSources[rewardKey] || []
            return sources.map(source => {
                const locationText = source.type === 'planar_ornament'
                    ? `${source.name}, ${source.location}`
                    : (source.location ? `${source.location}, ${source.region}` : source.region)
                return `${this.domainLabelHtml(source)}`
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
            text += `${this.itemThumbHtml(reward)} ${this.wikiLinkHtml(reward.name)}`
            if (reward.effect) {
                text += ` ${this.setEffectsButtonHtml(reward)}`
            }
            if (reward.characters && reward.characters.length > 0) {
                text += reward.characters
                    .map(c => `<div class="reward-char">${this.characterChipHtml(c)}</div>`)
                    .join('')
            } else if (reward.characters) {
                text += ' <span class="text-unknown">(not used by any character yet)</span>'
            }
            return text
        },

        // Info button revealing the full set description, on tap or hover
        setEffectsButtonHtml(reward) {
            let content = `<span class="pc-badge">2</span> ${this.highlight(reward.effect)}`
            if (reward.effect_4pc) {
                content += `<br><span class="pc-badge">4</span> ${this.highlight(reward.effect_4pc)}`
            }
            return `<span class="info-button" role="button" tabindex="0" aria-label="Full set description">i</span>`
                + `<span class="info-tooltip">${content}</span>`
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

        matchesQuery(s) {
            if (!s) return false
            const folded = foldedText(s).text
            return this.searchTerms().some(term => folded.includes(term))
        },

        characterMatchesQuery(name) {
            if (this.matchesQuery(name)) return true
            const info = this.characterLookup[name]
            return info ? this.matchesQuery(info.displayName) : false
        },

        searchedDomains() {
            if (!this.searching()) return []
            return (this.allData.domains || []).filter(domain =>
                this.matchesQuery(domain.name)
                || this.matchesQuery(domain.location)
                || this.matchesQuery(domain.region)
                || (domain.boss || []).some(b => this.matchesQuery(b))
            )
        },

        searchedRewardEntries() {
            if (!this.searching()) return []
            return Object.entries(this.allData.rewards || {}).filter(([key, reward]) => {
                if (this.matchesQuery(reward.name)) return true
                if (this.matchesQuery(reward.effect)) return true
                if (this.matchesQuery(reward.effect_4pc)) return true
                if (!reward.characters) return false
                return reward.characters.some(c => this.characterMatchesQuery(c))
            })
        },

        resetCache() {
            localStorage.clear()
            location.reload()
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
