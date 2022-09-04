const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
]
const weekdays = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
]
const zeroPad = function (n) {
    return String(n).padStart(2, '0')
}

document.addEventListener('DOMContentLoaded', function () {
    const date = new Date(document.getElementById('last-updated').innerHTML)
    const wd = weekdays[date.getDay()]
    const y = date.getFullYear()
    const m = months[date.getMonth()]
    const d = date.getDate()
    const h = zeroPad(date.getHours())
    const mn = zeroPad(date.getMinutes())
    const s = zeroPad(date.getSeconds())
    const formattedDate = `${wd}, ${d} ${m} ${y} ${h}:${mn}:${s}`
    document.getElementById('last-updated').innerHTML = formattedDate
})