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

// Wiki images live at static.wikia.nocookie.net/gensin-impact/images/{h}/{hh}/{filename},
// where {h}{hh} are the first hex chars of the MD5 of the filename. Computing that here
// lets us build thumbnail URLs for any item without calling the wiki API.
function md5Hex(str) {
    const utf8 = new TextEncoder().encode(str)
    const K = Array.from({ length: 64 }, (_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296))
    const S = [
        7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
        5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
        4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
        6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
    ]
    const padded = (((utf8.length + 8) >> 6) + 1) << 6
    const bytes = new Uint8Array(padded)
    bytes.set(utf8)
    bytes[utf8.length] = 0x80
    const view = new DataView(bytes.buffer)
    const bitLen = utf8.length * 8
    view.setUint32(padded - 8, bitLen >>> 0, true)
    view.setUint32(padded - 4, Math.floor(bitLen / 4294967296), true)
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476
    for (let chunk = 0; chunk < padded; chunk += 64) {
        const M = Array.from({ length: 16 }, (_, i) => view.getUint32(chunk + i * 4, true))
        let A = a0, B = b0, C = c0, D = d0
        for (let i = 0; i < 64; i++) {
            let F, g
            if (i < 16) { F = (B & C) | (~B & D); g = i }
            else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16 }
            else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16 }
            else { F = C ^ (B | ~D); g = (7 * i) % 16 }
            F = (F + A + K[i] + M[g]) | 0
            A = D; D = C; C = B
            B = (B + ((F << S[i]) | (F >>> (32 - S[i])))) | 0
        }
        a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0
    }
    return [a0, b0, c0, d0].map(n => {
        let s = ''
        for (let j = 0; j < 4; j++) s += ((n >>> (j * 8)) & 0xff).toString(16).padStart(2, '0')
        return s
    }).join('')
}

const FALLBACK_PHOTO = 'assets/images/Fallback.png'

function foldedText(s) {
    const chars = []
    const map = []
    for (let i = 0; i < s.length; i++) {
        let n = s[i].normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
        if (n === '•') n = ' '
        for (const ch of n) {
            chars.push(ch)
            map.push(i)
        }
    }
    const text = []
    const indexes = []
    let prevSpace = false
    for (let j = 0; j < chars.length; j++) {
        const isSpace = /\s/.test(chars[j])
        if (isSpace && prevSpace) continue
        text.push(isSpace ? ' ' : chars[j])
        indexes.push(map[j])
        prevSpace = isSpace
    }
    return { text: text.join(''), map: indexes }
}

// The CDN can pin a placeholder 404 for a file that was uploaded later, and it does
// not expire on its own (Item Frostfairy Flower.png served a 21-day-old placeholder
// under max-age=3600). A query string is a separate cache key at the edge, so bumping
// this token refetches every image from origin. Absent until the first reset, and
// stable after it, so normal caching still applies between resets.
const IMAGE_CACHE_TOKEN_KEY = 'imageCacheToken'

function bumpImageCacheToken() {
    const next = Number(localStorage.getItem(IMAGE_CACHE_TOKEN_KEY) || 0) + 1
    localStorage.setItem(IMAGE_CACHE_TOKEN_KEY, String(next))
}

// Bare wiki image URLs (no /revision/... suffix) are served regardless of referer;
// the scaled-thumbnail URLs are not, so thumbWidth callers need referrerpolicy="no-referrer".
function wikiFileUrl(filename, wiki = 'gensin-impact', thumbWidth = null) {
    filename = filename.replaceAll(' ', '_')
    const hash = md5Hex(filename)
    const encoded = encodeURIComponent(filename)
        .replaceAll("'", '%27').replaceAll('(', '%28').replaceAll(')', '%29')
    let url = `https://static.wikia.nocookie.net/${wiki}/images/${hash[0]}/${hash.slice(0, 2)}/${encoded}`
    if (thumbWidth) url += `/revision/latest/scale-to-width-down/${thumbWidth}`
    const token = localStorage.getItem(IMAGE_CACHE_TOKEN_KEY)
    if (token) url += `?cb=${token}`
    return url
}

// Wiki region emblem images are named "Emblem {Region}.png".
// The CDN answers requests for nonexistent files with a placeholder image instead
// of an error, so regions known to have no emblem need their own icon.
const REGION_ICON_OVERRIDES = { "Khaenri'ah": '🌑' }
function regionIconHtml(region) {
    if (REGION_ICON_OVERRIDES[region]) {
        return `<span>${REGION_ICON_OVERRIDES[region]}</span>`
    }
    const src = wikiFileUrl(`Emblem ${region}.png`)
    return `<img src="${src}" class="region-icon" width="20" height="20" loading="lazy"`
        + ` onerror="this.onerror=null;this.src='${FALLBACK_PHOTO}'">`
}
