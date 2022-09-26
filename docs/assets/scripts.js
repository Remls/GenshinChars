let characterData = []
fetch('./assets/chars.json')
    .then((response) => response.json())
    .then((data) => characterData = data);

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

const PHOTO_BASE = 'https://raw.githubusercontent.com/MadeBaruna/paimon-moe/main/static/images/characters/full/'

document.addEventListener('alpine:init', () => {
    Alpine.data('lastUpdated', () => ({
        zeroPad(n) {
            return String(n).padStart(2, '0')
        },

        lastUpdatedFormatted() {
            const date = new Date(document.getElementById('lastUpdatedTimestamp').innerHTML)
            const wd = WEEKDAYS[date.getDay()]
            const y = date.getFullYear()
            const m = MONTHS[date.getMonth()]
            const d = date.getDate()
            const h = this.zeroPad(date.getHours())
            const mn = this.zeroPad(date.getMinutes())
            const s = this.zeroPad(date.getSeconds())
            return `${wd}, ${d} ${m} ${y} ${h}:${mn}:${s}`
        }
    }))

    Alpine.data('charSheet', () => ({
        modalOpen: false,

        name: null,
        element: null,
        gender: null,
        rarity: null,
        region: null,
        weapon: null,
        releaseVersion: null,
        releaseDate: null,
        photo: null,

        showCharSheet(char) {
            const selectedChar = characterData[char]
            this.name = selectedChar.name
            this.element = selectedChar.element || 'Unknown'
            this.gender = selectedChar.gender || 'Unknown'
            this.rarity = selectedChar.rarity ? `${selectedChar.rarity}-star` : 'Unknown'
            this.region = selectedChar.region || 'Unknown'
            this.weapon = selectedChar.weapon || 'Unknown'
            this.releaseVersion = this.formatVersion(selectedChar.release_version)
            this.releaseDate = selectedChar.release_date || 'Unknown'
            this.photo = selectedChar.photo ? `${PHOTO_BASE}${selectedChar.photo}` : null
            this.modalOpen = true
        },

        formatVersion(version) {
            if (!version) return 'Unknown'
            let v = `v${version.version_number}`
            if (version.version_name) v += `: ${version.version_name}`
            return v
        },

        getWikiLink() {
            if (this.name) {
                return `https://genshin-impact.fandom.com/wiki/${this.name.replaceAll(' ', '_')}`
            }
            return ''
        }
    }))
})