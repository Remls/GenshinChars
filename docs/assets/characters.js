const REGIONS = [
    'Mondstadt', 'Liyue', 'Inazuma',
    'Sumeru', 'Fontaine', 'Natlan',
    'Nod-Krai', 'Snezhnaya', 'Khaenri\'ah'
]
// Row and column axes of the weapon/element table. "Unknown" is the bucket for
// characters with no element or no weapon
const ELEMENTS = [
    'Anemo', 'Geo', 'Electro',
    'Dendro', 'Hydro', 'Pyro', 'Cryo'
]
const WEAPONS = ['Bow', 'Catalyst', 'Claymore', 'Polearm', 'Sword']
// Splashscreen filenames derive from the version name. Exceptions to that rule go here.
// null means no file exists (the CDN renders a placeholder for missing files,
// so they must be skipped, not guessed)
const SPLASHSCREEN_OVERRIDES = { '1.0': 'Splashscreen Welcome To Teyvat.png' }

document.addEventListener('alpine:init', () => {
    Alpine.data('charSheet', () => ({
        // Data
        allData: {},
        characterData: {},
        versionData: {},

        // Section collapses
        showSection: {
            filters: true,
            weaponElementTable: true,
            releaseOrderTable: true,
            birthdayOrderTable: true,
        },

        // Dropdown filters
        selectedVersion: null,
        selectedRarity: null,
        selectedGender: null,
        selectedRegion: null,
        includedSpecials: [],
        defaultVersion: null,
        urlSyncReady: false,
        showVersionPicker: false,

        // Character details modal
        modalOpen: false,
        name: null,
        birthday: null,
        element: null,
        arkhe: null,
        gender: null,
        rarity: null,
        region: null,
        weapon: null,
        releaseVersion: null,
        releaseDate: null,
        photo: null,
        fullPhotos: [],
        notes: null,

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
            if (Object.keys(GENDERS).concat('Unknown').some(g => g.toLowerCase() === gender)) {
                this.selectedGender = this.upperCaseFirst(gender)
            }
            const region = urlParams.get('re')
            if (region) {
                REGIONS.forEach(r => {
                    if (region.toLowerCase() === r.toLowerCase()) this.selectedRegion = r
                })
                if (region.toLowerCase() === 'unknown') this.selectedRegion = 'Unknown'
            }
            const specials = (urlParams.get('s') || '').split(',')
            this.includedSpecials = SPECIAL_CHARACTERS.genshin.filter(
                name => specials.some(s => s.toLowerCase() === name.toLowerCase())
            )
        },

        toggleSpecial(name) {
            this.includedSpecials = this.includedSpecials.includes(name)
                ? this.includedSpecials.filter(n => n !== name)
                : [...this.includedSpecials, name]
            this.updateCharacterData()
        },

        updateCharacterData() {
            let characterData = Object.values( this.allData['characters'] ).filter(
                c => !SPECIAL_CHARACTERS.genshin.includes(c.name)
                    || this.includedSpecials.includes(c.name)
            )
            // <select> can change this to a string, so change it back
            const filters1 = ['version', 'rarity', 'gender', 'region']
            filters1.forEach(f => {
                const filterName = `selected${this.upperCaseFirst(f)}`
                if (this[filterName] === 'null') {
                    this[filterName] = null
                }
            })
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
            const filters2 = ['rarity', 'gender', 'region']
            filters2.forEach(f => {
                const filterName = `selected${this.upperCaseFirst(f)}`
                if (this[filterName]) {
                    if (this[filterName] === 'Unknown') {
                        characterData = characterData.filter(
                            c => c[f] === null
                        )
                    } else {
                        characterData = characterData.filter(
                            c => c[f] === this[filterName]
                        )
                    }
                }
            })
            let characterDataAsObj = {}
            characterData.forEach(c => {
                characterDataAsObj[c.name] = c
            })
            this.characterData = characterDataAsObj
            this.syncFiltersToUrl()
        },

        syncFiltersToUrl() {
            if (!this.urlSyncReady) return
            const params = new URLSearchParams()
            if (this.selectedVersion !== this.defaultVersion) {
                params.set('v', this.selectedVersion || 'all')
            }
            if (this.selectedRarity) params.set('r', this.selectedRarity.toLowerCase())
            if (this.selectedGender) params.set('g', this.selectedGender.toLowerCase())
            if (this.selectedRegion) params.set('re', this.selectedRegion.toLowerCase())
            if (this.includedSpecials.length > 0) {
                params.set('s', this.includedSpecials.map(n => n.toLowerCase()).join(','))
            }
            const query = params.toString()
            history.replaceState(null, '', query ? `?${query}` : window.location.pathname)
        },

        photoUrl(image) {
            return characterImageUrl(image, 'gensin-impact', 'assets/images/characters')
        },

        // Full art loads unscaled, so it needs referrerpolicy="no-referrer" on the
        // tag: the CDN downsizes a bare URL to about 200px when a Referer arrives
        fullPhotoUrls(images) {
            return (images || []).map(image => characterImageUrl(
                image, 'gensin-impact', 'assets/images/full-characters'
            ))
        },

        formMatches(form, element, weapon) {
            const elementOk = element === 'Unknown' ? !form.element : form.element === element
            const weaponOk = weapon === 'Unknown' ? !form.weapon : form.weapon === weapon
            return elementOk && weaponOk
        },

        // One entry per form, so a character with several forms fills several cells
        cellRows(element, weapon) {
            return Object.values(this.characterData)
                .map(char => ({ char, form: char.forms.find(f => this.formMatches(f, element, weapon)) }))
                .filter(row => row.form)
        },

        filterCharacterData(filters) {
            const defaultFilters = {
                element: null,
                gender: null,
                rarity: null,
                region: null,
                weapon: null,
            }
            filters = {...defaultFilters, ...filters}
            const formKeys = ['element', 'weapon']
            let data = Object.values( this.characterData )
            for (let [key, value] of Object.entries(filters)) {
                if (!value) continue
                if (formKeys.includes(key)) {
                    data = data.filter(c => c.forms.some(
                        f => value === 'Unknown' ? !f[key] : f[key] === value
                    ))
                } else {
                    data = data.filter(c => value === 'Unknown' ? !c[key] : c[key] === value)
                }
            }
            return data
        },

        countBy(filters, field) {
            const groups = {}
            this.filterCharacterData(filters).forEach(c => {
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

        showCharSheet(char, form = null) {
            const selectedChar = this.allData['characters'][char]
            this.name = selectedChar.name
            this.birthday = this.formatDate(selectedChar.birthday)
            this.element = selectedChar.element || 'Unknown'
            this.arkhe = selectedChar.arkhe // Null if non-Fontaine
            this.gender = selectedChar.gender || 'Unknown'
            this.rarity = selectedChar.rarity ? `${selectedChar.rarity}-star` : 'Unknown'
            this.region = selectedChar.region || 'Unknown'
            this.weapon = selectedChar.weapon || 'Unknown'
            this.releaseVersion = this.formatVersion(selectedChar.release_version)
            this.releaseDate = this.formatDate(selectedChar.release_date)
            this.photo = this.photoUrl(selectedChar.photo)
            this.fullPhotos = this.fullPhotoUrls(
                (form && form.full_photo) || selectedChar.full_photo
            )
            this.notes = selectedChar.notes
            this.modalOpen = true
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
            const noReleaseVersion = !form.release_version
            const noReleaseDate = !form.release_date
            return noReleaseVersion && noReleaseDate
        },

        // Checks if version A came before (or is equal to) version B.
        // Assumes both versions are in the format `x.y`
        versionAIsBeforeOrEqualToVersionB(a, b) {
            if (a === null) return false
            if (b === null) return true
            a = a.split('.').map(x => parseInt(x))
            b = b.split('.').map(x => parseInt(x))
            if (a[0] < b[0]) return true
            else if (a[0] > b[0]) return false
            else {
                if (a[1] < b[1]) return true
                else if (a[1] > b[1]) return false
                else return true
            }
        },

        birthdayIsToday(char) {
            const serverDate = new Date(
                new Date().toLocaleString('en-US', { timeZone: 'Asia/Shanghai' })
            )
            const m = this.zeroPad(serverDate.getMonth() + 1)
            const d = this.zeroPad(serverDate.getDate())
            return char.birthday === `${m}-${d}`
        },

        sortCharactersByBirthday() {
            return Object.values( this.characterData ).sort((a, b) => {
                if (a.birthday > b.birthday) return 1
                if (a.birthday < b.birthday) return -1
                if (a.birthday === b.birthday) return 0
            })
        },

        formatVersion(version, includeDate=false) {
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
            let file = `Splashscreen ${version.version_name}.png`
            if (version.version_number in SPLASHSCREEN_OVERRIDES) {
                file = SPLASHSCREEN_OVERRIDES[version.version_number]
                if (!file) return ''
            }
            const src = wikiFileUrl(file, 'gensin-impact', 720)
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

        formatDate(date) {
            if (!date) return 'Unknown'
            date = date.split('-')
            let dateParts = []
            if (date.length === 2) {
                dateParts = [
                    MONTHS[parseInt(date[0])-1],
                    parseInt(date[1])
                ]
            } else {
                dateParts = [
                    date[0],
                    MONTHS[parseInt(date[1])-1],
                    parseInt(date[2])
                ]
            }
            return dateParts.join(' ')
        },

        getWikiLink() {
            if (this.name) {
                return `https://genshin-impact.fandom.com/wiki/${encodeURIComponent(this.name.replaceAll(' ', '_'))}`
            }
            return ''
        }
    }))
})