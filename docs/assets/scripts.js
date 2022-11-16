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

const PORTRAIT_PHOTO_BASE = 'https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/'
const PORTRAIT_PHOTO_FALLBACK = 'assets/images/Fallback.png'
const FULL_PHOTO_BASE = 'https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/full/'

document.addEventListener('alpine:init', () => {
    Alpine.data('charSheet', () => ({
        allData: {},
        characterData: {},
        versionData: {},

        includeLeakedCharacters: false,
        modalOpen: false,

        name: null,
        birthday: null,
        element: null,
        gender: null,
        rarity: null,
        region: null,
        weapon: null,
        releaseVersion: null,
        releaseDate: null,
        photo: null,

        fetchAllData() {
            const urlParams = new URLSearchParams(window.location.search)
            if (urlParams.get('leaks') === 'true')
                this.includeLeakedCharacters = true

            fetch('./assets/data.json')
                .then(r => r.json())
                .then(d => {
                    this.allData = d
                    this.versionData = d['versions']
                    this.updateCharacterData()
                })
        },

        updateCharacterData() {
            let characterData = Object.values( this.allData['characters'] )
            if (!this.includeLeakedCharacters) {
                characterData = characterData.filter(c => c.is_released)
            }
            let characterDataAsObj = {}
            characterData.forEach(c => {
                characterDataAsObj[c.name] = c
            })
            this.characterData = characterDataAsObj
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
            let data = Object.values( this.characterData )
            for (let [key, value] of Object.entries(filters)) {
                if (!value) continue
                if (value === '?') value = null
                data = data.filter(c => c[key] === value)
            }
            return data
        },

        zeroPad(n) {
            return String(n).padStart(2, '0')
        },

        getPortraitPhoto(photo) {
            return photo ? `${PORTRAIT_PHOTO_BASE}${photo}` : PORTRAIT_PHOTO_FALLBACK
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

        showCharSheet(char) {
            const selectedChar = this.allData['characters'][char]
            this.name = selectedChar.name
            this.birthday = this.formatDate(selectedChar.birthday)
            this.element = selectedChar.element || 'Unknown'
            this.gender = selectedChar.gender || 'Unknown'
            this.rarity = selectedChar.rarity ? `${selectedChar.rarity}-star` : 'Unknown'
            this.region = selectedChar.region || 'Unknown'
            this.weapon = selectedChar.weapon || 'Unknown'
            this.releaseVersion = this.formatVersion(selectedChar.release_version)
            this.releaseDate = this.formatDate(selectedChar.release_date)
            this.photo = selectedChar.photo ? `${FULL_PHOTO_BASE}${selectedChar.photo}` : null
            this.modalOpen = true
        },

        releaseUnknown(char) {
            const noReleaseVersion = char.release_version === null
            const noReleaseDate = !char.release_date
            return noReleaseVersion && noReleaseDate
        },

        formatVersion(version) {
            if (!version) return 'Unknown'
            version = this.versionData[version]
            let v = `v${version.version_number}`
            if (version.version_name) v += `: ${version.version_name}`
            return v
        },

        formatDate(date) {
            if (!date) return 'Unknown'
            date = date.split('-')
            let dateParts = []
            if (date.length === 2) {
                dateParts = [
                    MONTHS[parseInt(date[0])-1],
                    date[1]
                ]
            } else {
                dateParts = [
                    date[0],
                    MONTHS[parseInt(date[1])-1],
                    date[2]
                ]
            }
            return dateParts.join(' ')
        },

        getWikiLink() {
            if (this.name) {
                return `https://genshin-impact.fandom.com/wiki/${this.name.replaceAll(' ', '_')}`
            }
            return ''
        }
    }))
})