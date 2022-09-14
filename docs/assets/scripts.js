document.addEventListener('alpine:init', () => {
    Alpine.data('lastUpdated', () => ({
        MONTHS: [
            'January', 'February', 'March',
            'April', 'May', 'June',
            'July', 'August', 'September',
            'October', 'November', 'December'
        ],
        WEEKDAYS: [
            'Sunday', 'Monday', 'Tuesday',
            'Wednesday', 'Thursday',
            'Friday', 'Saturday'
        ],

        lastUpdated: '2022-09-14 08:58:24.093901 UTC',

        zeroPad(n) {
            return String(n).padStart(2, '0')
        },

        lastUpdatedFormatted() {
            const date = new Date(this.lastUpdated)
            const wd = this.WEEKDAYS[date.getDay()]
            const y = date.getFullYear()
            const m = this.MONTHS[date.getMonth()]
            const d = date.getDate()
            const h = this.zeroPad(date.getHours())
            const mn = this.zeroPad(date.getMinutes())
            const s = this.zeroPad(date.getSeconds())
            return `${wd}, ${d} ${m} ${y} ${h}:${mn}:${s}`
        }
    }))

    Alpine.data('charSheet', () => ({
        showCharSheet(char) {
            console.log(char)
        }
    }))
})