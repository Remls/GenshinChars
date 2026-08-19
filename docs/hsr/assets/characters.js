const HSR_WIKI = 'https://honkai-star-rail.fandom.com/wiki/'
// The wiki is honkai-star-rail.fandom.com but its image CDN bucket is "houkai"
const HSR_WIKI_IMAGES = 'houkai-star-rail'
const HSR_FALLBACK = '../assets/images/Fallback.png'
const HSR_PATHS = [
    'Abundance', 'Destruction', 'Elation', 'Erudition', 'Finality', 'Harmony',
    'Hunt', 'Nihility', 'Preservation', 'Remembrance',
]
// Data uses the short name; the wiki (and the grid label) uses the full one
const HSR_PATH_LABELS = { 'Hunt': 'The Hunt' }
// The wiki has no path icon for these
const HSR_MISSING_PATH_ICONS = ['Finality']
// Splash screen filenames derive from the version name; exceptions go here.
// null means no file exists (the CDN renders a placeholder for missing files,
// so they must be skipped, not guessed)
const HSR_SPLASH_SCREEN_OVERRIDES = {
    '4.5': null,
}
const HSR_COMBAT_TYPES = [
    'Fire', 'Ice', 'Imaginary', 'Lightning', 'Physical', 'Quantum', 'Wind',
]
const HSR_WORLDS = [
    'Astral Express', 'Herta Space Station', 'Jarilo-VI', 'Xianzhou Alliance',
    'Penacony', 'Amphoreus', 'Cosmic', 'Glamoth', 'Planarcadia', 'Pteruges-V',
    'Punklorde', 'Sigonia-IV', 'Another World',
]

document.addEventListener('alpine:init', () => {
    Alpine.data('hsrCharSheet', () => ({
        HSR_PATHS,
        HSR_COMBAT_TYPES,
        HSR_WORLDS,

        allData: {},
        characterData: {},
        versionData: {},

        showSection: {
            filters: true,
            pathTypeTable: true,
            releaseOrderTable: true,
        },

        selectedVersion: null,
        selectedRarity: null,
        selectedGender: null,
        selectedWorld: null,
        defaultVersion: null,
        urlSyncReady: false,
        showVersionPicker: false,

        fetchAllData() {
            fetch('./assets/characters.json')
                .then(r => r.json())
                .then(d => {
                    this.allData = d
                    this.versionData = d['versions']
                    this.setFiltersFromUrl()
                    this.updateCharacterData()
                    this.urlSyncReady = true
                })
        },

        setFiltersFromUrl() {
            // Default is the last version with a name
            Object.values(this.versionData).forEach(v => {
                if (v.version_name) this.defaultVersion = v.version_number
            })
            this.selectedVersion = this.defaultVersion

            const urlParams = new URLSearchParams(window.location.search)
            const version = urlParams.get('v')
            if (version) {
                if (version.toLowerCase() === 'all') this.selectedVersion = null
                else if (this.versionData[version]) this.selectedVersion = version
            }
            const rarity = urlParams.get('r')
            if (['4', '5', 'unknown'].includes(rarity)) {
                this.selectedRarity = this.upperCaseFirst(rarity)
            }
            const gender = urlParams.get('g')
            if (['female', 'male', 'unknown'].includes(gender)) {
                this.selectedGender = this.upperCaseFirst(gender)
            }
            const world = urlParams.get('w')
            if (world) {
                HSR_WORLDS.forEach(w => {
                    if (world.toLowerCase() === w.toLowerCase()) this.selectedWorld = w
                })
                if (world.toLowerCase() === 'unknown') this.selectedWorld = 'Unknown'
            }
        },

        syncFiltersToUrl() {
            if (!this.urlSyncReady) return
            const params = new URLSearchParams()
            if (this.selectedVersion !== this.defaultVersion) {
                params.set('v', this.selectedVersion || 'all')
            }
            if (this.selectedRarity) params.set('r', this.selectedRarity.toLowerCase())
            if (this.selectedGender) params.set('g', this.selectedGender.toLowerCase())
            if (this.selectedWorld) params.set('w', this.selectedWorld.toLowerCase())
            const query = params.toString()
            history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
        },

        updateCharacterData() {
            // <select> can change this to a string, so change it back
            if (this.selectedVersion === 'null') this.selectedVersion = null
            if (this.selectedWorld === 'null') this.selectedWorld = null
            let characterData = Object.values(this.allData['characters'] || {})
            if (this.selectedVersion) {
                characterData = characterData.filter(
                    c => this.versionAIsBeforeOrEqualToVersionB(c.release_version, this.selectedVersion)
                )
            }
            if (this.selectedRarity) {
                if (this.selectedRarity === 'Unknown') {
                    characterData = characterData.filter(c => !c.rarity)
                } else {
                    characterData = characterData.filter(c => c.rarity === this.selectedRarity)
                }
            }
            if (this.selectedGender) {
                if (this.selectedGender === 'Unknown') {
                    characterData = characterData.filter(c => !c.gender)
                } else {
                    characterData = characterData.filter(c => c.gender === this.selectedGender)
                }
            }
            if (this.selectedWorld) {
                if (this.selectedWorld === 'Unknown') {
                    characterData = characterData.filter(c => !c.world)
                } else {
                    characterData = characterData.filter(c => c.world === this.selectedWorld)
                }
            }
            const characterDataAsObj = {}
            characterData.forEach(c => { characterDataAsObj[c.name] = c })
            this.characterData = characterDataAsObj
            this.syncFiltersToUrl()
        },

        /**
         * Checks if version A came before (or is equal to) version B.
         * Assumes both versions are in the format `x.y`
         */
        versionAIsBeforeOrEqualToVersionB(a, b) {
            if (a === null) return false
            if (b === null) return true
            a = a.split('.').map(x => parseInt(x))
            b = b.split('.').map(x => parseInt(x))
            if (a[0] !== b[0]) return a[0] < b[0]
            return a[1] <= b[1]
        },

        visiblePaths() {
            return [...HSR_PATHS, 'Unknown']
        },

        formMatches(form, path, combatType) {
            const pathOk = path === 'Unknown' ? !form.path : form.path === path
            const typeOk = combatType === 'Unknown' ? !form.combat_type : form.combat_type === combatType
            return pathOk && typeOk
        },

        charactersFor(path, combatType) {
            return Object.values(this.characterData).filter(c =>
                c.forms.some(f => this.formMatches(f, path, combatType))
            )
        },

        combatTypeClass(combatType) {
            return combatType ? `ct-${combatType.toLowerCase()}` : 'el-unknown'
        },

        characterIconUrl(char) {
            return wikiFileUrl(`Character ${char.name} Icon.png`, HSR_WIKI_IMAGES)
        },

        pathLabel(path) {
            return HSR_PATH_LABELS[path] || path
        },

        pathIconHtml(path) {
            const src = HSR_MISSING_PATH_ICONS.includes(path)
                ? HSR_FALLBACK
                : wikiFileUrl(`Path ${this.pathLabel(path)}.png`, HSR_WIKI_IMAGES)
            return `<img src="${src}" class="region-icon" width="20" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${HSR_FALLBACK}'">`
        },

        combatTypeIconHtml(combatType) {
            const src = wikiFileUrl(`Type ${combatType}.png`, HSR_WIKI_IMAGES)
            return `<img src="${src}" class="region-icon" width="20" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${HSR_FALLBACK}'">`
        },

        wikiLink(char) {
            return HSR_WIKI + encodeURIComponent(char.name.replaceAll(' ', '_'))
        },

        chipHtml(char, combatType, displayName = null) {
            return `<a class="character-links" href="${this.wikiLink(char)}">`
                + `<img width="20" height="20" loading="lazy" src="${this.characterIconUrl(char)}"`
                + ` onerror="this.onerror=null;this.src='${HSR_FALLBACK}'">`
                + `<span class="gi-font clickable ${this.combatTypeClass(combatType)}">${displayName || char.display_name || char.name}</span>`
                + `</a>`
        },

        cellHtml(path, combatType) {
            return Object.values(this.characterData)
                .map(c => ({ char: c, form: c.forms.find(f => this.formMatches(f, path, combatType)) }))
                .filter(x => x.form)
                .map(x => this.chipHtml(x.char, combatType === 'Unknown' ? null : combatType, x.form.display_name))
                .join('')
        },

        // Count characters matching the given path or combat type, grouped by field
        countBy(filters, field) {
            let characters = Object.values(this.characterData)
            if (filters && filters.path) {
                characters = characters.filter(c =>
                    c.forms.some(f => filters.path === 'Unknown' ? !f.path : f.path === filters.path)
                )
            }
            if (filters && filters.combatType) {
                characters = characters.filter(c =>
                    c.forms.some(f => filters.combatType === 'Unknown' ? !f.combat_type : f.combat_type === filters.combatType)
                )
            }
            const groups = {}
            characters.forEach(c => {
                const key = c[field] || 'Unknown'
                groups[key] = (groups[key] || 0) + 1
            })
            const sorted = {}
            Object.keys(groups).sort().forEach(k => {
                let presentable = k
                if (field === 'rarity' && k !== 'Unknown') presentable = `${k}-star`
                sorted[presentable] = groups[k]
            })
            return sorted
        },

        noCharacters() {
            return Object.values(this.characterData).length === 0
        },

        releaseUnknown(char) {
            return !char.release_version && !char.release_date
        },

        formatVersion(version, includeDate = false) {
            if (!version) return 'Unknown'
            version = this.versionData[version]
            let v = version.display_version_number
            if (version.version_name) v += `: ${version.version_name}`
            if (includeDate && version.release_date) v += ` (${this.formatDate(version.release_date)})`
            return v
        },

        versionPickerLabel() {
            if (!this.selectedVersion) return 'All known playable characters'
            return this.formatVersion(this.selectedVersion, true)
        },

        versionBannerHtml(version) {
            if (!version.version_name) return ''
            let file = `Splash Screen ${version.version_name}.png`
            if (version.version_number in HSR_SPLASH_SCREEN_OVERRIDES) {
                file = HSR_SPLASH_SCREEN_OVERRIDES[version.version_number]
                if (!file) return ''
            }
            const src = wikiFileUrl(file, HSR_WIKI_IMAGES, 720)
            // The CDN rejects scaled-down URLs when a referer is sent
            const attrs = `loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"`
            return `<img class="version-banner-wash" src="${src}" ${attrs}>`
                + `<img src="${src}" ${attrs}>`
        },

        toggleVersionPicker() {
            this.showVersionPicker = !this.showVersionPicker
            if (!this.showVersionPicker) return
            this.$nextTick(() => {
                const popup = this.$refs.versionPopup
                const selected = popup.querySelector('.version-option.selected')
                if (selected) popup.scrollTop = selected.offsetTop - 8
            })
        },

        selectVersion(versionNumber) {
            this.selectedVersion = versionNumber
            this.showVersionPicker = false
            this.updateCharacterData()
        },

        resetCache() {
            localStorage.clear()
            bumpImageCacheToken()
            location.reload()
        },

        zeroPad(n) {
            return String(n).padStart(2, '0')
        },

        formatDate(date) {
            if (!date) return 'Unknown'
            const [y, m, d] = date.split('-')
            return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]} ${y}`
        },

        upperCaseFirst(s) {
            return s.charAt(0).toUpperCase() + s.slice(1)
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
