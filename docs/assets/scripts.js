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

        // Version filter
        selectedVersion: null,

        // Character details modal
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
            fetch('./assets/data.json')
                .then(r => r.json())
                .then(d => {
                    this.allData = d
                    this.versionData = d['versions']
                    this.setSelectedVersionFromUrl()
                    this.updateCharacterData()
                })
        },

        setSelectedVersionFromUrl() {
            // Check if value passed in URL
            const urlParams = new URLSearchParams(window.location.search)
            const versionPassedInUrl = urlParams.get('v')
            if (versionPassedInUrl) {
                if (versionPassedInUrl === 'all') {
                    this.selectedVersion = null
                    return
                } else if (Object.keys(this.versionData).includes(versionPassedInUrl)) {
                    this.selectedVersion = versionPassedInUrl
                    return
                }
            }

            // No valid value passed in URL; use default
            // (first version with a name)
            let defaultVersion = null
            Object.values(this.versionData).forEach(v => {
                if (v.version_name) {
                    defaultVersion = v.version_number
                }
            })
            this.selectedVersion = defaultVersion
        },

        updateCharacterData() {
            let characterData = Object.values( this.allData['characters'] )
            // <select> can change this to a string, so change it back
            if (this.selectedVersion === 'null') {
                this.selectedVersion = null
            }
            if (this.selectedVersion) {
                characterData = characterData.filter(
                    c => this.versionAIsBeforeOrEqualToVersionB(
                        c.release_version,
                        this.selectedVersion
                    )
                )
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

        groupCharacterData(filters, groupBy) {
            let filteredCharacterData = this.filterCharacterData(filters)
            const groupFn = (existingGroupings, character) => {
                const key = character[groupBy]
                if (key in existingGroupings) {
                    existingGroupings[key] += 1
                } else {
                    existingGroupings[key] = 1
                }
                return existingGroupings
            }
            const groupedCharacterData = filteredCharacterData.reduce(groupFn, {})
            const sortedKeys = Object.keys(groupedCharacterData).sort()
            let sortedObj = {}
            sortedKeys.forEach(k => {
                let presentableKey = k
                // Presentable keys
                if (k === 'null') presentableKey = 'Unknown'
                else if (groupBy === 'rarity') presentableKey += '-star'
                sortedObj[presentableKey] = groupedCharacterData[k]
            })
            return sortedObj
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

        /**
         * Checks if version A came before (or is equal to) version B.
         * Assumes both versions are in the format `x.y`
         * 
         * @param {string} a Version A
         * @param {string} b Version B
         * @returns bool
         */
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