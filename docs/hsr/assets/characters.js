const HSR_PATHS = [
    'Abundance', 'Destruction', 'Elation', 'Erudition', 'Finality', 'Harmony',
    'Hunt', 'Nihility', 'Preservation', 'Remembrance',
]
// Splash screen filenames derive from the version name. Exceptions to that rule go here.
// null means no file exists (the CDN renders a placeholder for missing files,
// so they must be skipped, not guessed)
const HSR_SPLASH_SCREEN_OVERRIDES = {}
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
        includedSpecials: [],
        defaultVersion: null,
        urlSyncReady: false,
        showVersionPicker: false,

        fetchAllData() {
            Promise.all([
                fetch('./assets/characters.json').then(r => r.json()),
                fetch('./assets/domains.json').then(r => r.json()),
            ])
                .then(([d, domainsData]) => {
                    this.allData = d
                    this.versionData = d['versions']
                    configureCharSheet('hsr', this.versionData,
                        buildCharacterMaterials(domainsData, 'hsr'), d.characters)
                    this.setFiltersFromUrl()
                    this.updateCharacterData()
                    this.urlSyncReady = true
                    openCharSheetFromUrl()
                })
                .finally(() => this.$nextTick(finishPageLoading))
        },

        setFiltersFromUrl() {
            // Default is the last version with a name
            Object.values(this.versionData).forEach(v => {
                if (v.version_name) this.defaultVersion = v.version_number
            })
            this.selectedVersion = this.defaultVersion

            const urlParams = new URLSearchParams(window.location.search)
            const version = urlParams.get('version')
            if (version) {
                if (version.toLowerCase() === 'all') this.selectedVersion = null
                else if (this.versionData[version]) this.selectedVersion = version
            }
            const rarity = urlParams.get('rarity')
            if (['4', '5', 'unknown'].includes(rarity)) {
                this.selectedRarity = this.upperCaseFirst(rarity)
            }
            const gender = urlParams.get('gender')
            if (Object.keys(GENDERS).concat('Unknown').some(g => g.toLowerCase() === gender)) {
                this.selectedGender = this.upperCaseFirst(gender)
            }
            const world = urlParams.get('world')
            if (world) {
                HSR_WORLDS.forEach(w => {
                    if (world.toLowerCase() === w.toLowerCase()) this.selectedWorld = w
                })
                if (world.toLowerCase() === 'unknown') this.selectedWorld = 'Unknown'
            }
            const specials = (urlParams.get('specials') || '').split(',')
            this.includedSpecials = SPECIAL_CHARACTERS.hsr.filter(
                name => specials.some(s => s.toLowerCase() === name.toLowerCase())
            )
        },

        syncFiltersToUrl() {
            if (!this.urlSyncReady) return
            const params = new URLSearchParams()
            if (this.selectedVersion !== this.defaultVersion) {
                params.set('version', this.selectedVersion || 'all')
            }
            if (this.selectedRarity) params.set('rarity', this.selectedRarity.toLowerCase())
            if (this.selectedGender) params.set('gender', this.selectedGender.toLowerCase())
            if (this.selectedWorld) params.set('world', this.selectedWorld.toLowerCase())
            if (this.includedSpecials.length > 0) {
                params.set('specials', this.includedSpecials.map(n => n.toLowerCase()).join(','))
            }
            const query = params.toString()
            history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
        },

        toggleSpecial(name) {
            this.includedSpecials = this.includedSpecials.includes(name)
                ? this.includedSpecials.filter(n => n !== name)
                : [...this.includedSpecials, name]
            this.updateCharacterData()
        },

        updateCharacterData() {
            // <select> can change this to a string, so change it back
            if (this.selectedVersion === 'null') this.selectedVersion = null
            if (this.selectedWorld === 'null') this.selectedWorld = null
            let characterData = Object.values(this.allData['characters'] || {}).filter(
                c => !SPECIAL_CHARACTERS.hsr.includes(c.name)
                    || this.includedSpecials.includes(c.name)
            )
            if (this.selectedVersion) {
                // Forms release separately, so a character keeps only the forms that
                // existed by the selected version, and drops out once none are left
                characterData = characterData
                    .map(c => ({
                        ...c,
                        forms: c.forms.filter(f => this.versionAIsBeforeOrEqualToVersionB(
                            f.release_version, this.selectedVersion
                        )),
                    }))
                    .filter(c => c.forms.length > 0)
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

        // Checks if version A came before (or is equal to) version B.
        // Assumes both versions are in the format `x.y`
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

        // Chips render at 20px. The tags need referrerpolicy="no-referrer": the CDN
        // refuses scaled URLs when a Referer arrives
        photoUrl(image) {
            return characterImageUrl(image, HSR_WIKI_IMAGES, 'assets/images/characters', 40)
        },

        pathLabel(path) {
            return HSR_PATH_LABELS[path] || path
        },

        pathIconHtml(path) {
            const src = HSR_MISSING_PATH_ICONS.includes(path)
                ? FALLBACK_PHOTO
                : wikiFileUrl(`Path ${this.pathLabel(path)}.png`, HSR_WIKI_IMAGES)
            return `<img src="${src}" class="region-icon" width="20" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
        },

        combatTypeIconHtml(combatType) {
            const src = wikiFileUrl(`Type ${combatType}.png`, HSR_WIKI_IMAGES)
            return `<img src="${src}" class="region-icon" width="20" height="20" loading="lazy"`
                + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
        },

        wikiLink(char) {
            return HSR_WIKI + encodeURIComponent(char.name.replaceAll(' ', '_'))
        },

        // The chip stays a wiki link; a plain left click opens the sheet instead.
        // The character and form travel as data attributes, since the markup is a
        // string rather than a template Alpine can pass objects through.
        chipHtml(char, combatType, displayName = null, form = null) {
            return `<a class="character-links" href="${this.wikiLink(char)}"`
                + ` data-char="${this.escapeAttribute(char.name)}"`
                + ` data-form="${form ? char.forms.indexOf(form) : ''}"`
                + ` @click="openCharSheetFromChip($event)">`
                + `<img width="20" height="20" loading="lazy" referrerpolicy="no-referrer"`
                + ` src="${this.photoUrl((form && form.photo) || char.photo)}"`
                + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
                + `<span class="gi-font clickable ${this.combatTypeClass(combatType)}">${displayName || char.display_name || char.name}</span>`
                + `</a>`
        },

        escapeAttribute(s) {
            return s.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
        },

        openCharSheetFromChip(event) {
            const { char, form } = event.currentTarget.dataset
            const character = this.allData.characters[char]
            charSheetChipClick(event, character, form === '' ? null : character.forms[form])
        },

        cellHtml(path, combatType) {
            return Object.values(this.characterData)
                .map(c => ({ char: c, form: c.forms.find(f => this.formMatches(f, path, combatType)) }))
                .filter(x => x.form)
                .map(x => this.chipHtml(x.char, combatType === 'Unknown' ? null : combatType, x.form.display_name, x.form))
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

        // One row per form, so a character that gained a form later appears once per
        // release. A form with no date falls back to its version's projected one,
        // and undated forms sort last
        releaseOrderRows() {
            return Object.values(this.characterData)
                .flatMap(char => char.forms.map(form => ({ char, form })))
                .sort((a, b) => {
                    const ka = this.releaseOrderKey(a), kb = this.releaseOrderKey(b)
                    return ka < kb ? 1 : ka > kb ? -1 : 0
                })
        },

        releaseOrderKey({ char, form }) {
            const projected = (this.versionData[form.release_version] || {}).release_date
            return `${form.release_date || projected || '9999-12-31'}|${char.name}`
        },

        releaseUnknown(form) {
            return !form.release_version && !form.release_date
        },

        formatVersion(version, includeDate = false) {
            return formatVersionLabel(version, this.versionData, includeDate)
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
            resetImageCache()
            location.reload()
        },

        zeroPad(n) {
            return String(n).padStart(2, '0')
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
