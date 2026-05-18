/**
 * macro.js: Macro handler.
 * Macro handling is split into three parts.
 * (I) Preprocessing. PreprocessVisitor visits the CST and identifes all macros that need to be preprocessed.
 * (II) Resolving. Service that calls the renderer resolves the data identified.
 * (III) Visiting. HTMLVisitor visits the CST and renders the macros.
 * 
 * macroRegistry is where all the logic lives in.
 */

import dateandtime from 'date-and-time'
import dedent from 'dedent'
import escapeHTML from '../escapeHTML.js'
import hljs from 'highlight.js'

// helper functions
function errMessage(name, reason) {
    return `<p class="fw-bold text-danger">${name}: ${reason}</p>`
}

function isString(args) {
    return typeof args === 'string'
}

function toDataAttr(value) {
    return escapeHTML(JSON.stringify(value))
}

/**
 * Identifies macro arguments in form k1=v1,k2=v2,k3,...
 * @param {String} args Arguments string to parse.
 * @returns {Object} k-v pairs of arguments. argument without '=' sign is saved to 'default'.
 */
export function findMacroArgs(args) {
    const res = {}
    const parts = args.split(',')
    for (let part of parts) {
        const [k, v] = part.split('=')
        if (v === undefined) res['default'] = k
        else res[k.trim()] = v.trim()
    }
    return res
}

function isFilenameValid(filename) {
    if (!filename || !isString(filename)) return false
    return /^(.*?\.(?:png|jpg|jpeg|jfif|gif|webp|svg|pdf))$/i.test(filename)
}

// macroRegistry
const macroRegistry = {
    include: {
        getRequest: (args) => {
            if (!isString(args)) return null
            const { default: pagename } = findMacroArgs(args)
            if (!pagename) return null
            return { repo: 'includes', query: { args } }
        },
        render: (_args, resolvedData) => {
            if (!resolvedData) return { result: 'ok', output: '' }
            return { result: 'ok', output: resolvedData.html ?? '' }
        }
    },
    hr: {
        render: () => ({ result: 'ok', output: '<hr>' })
    },
    br: {
        render: () => ({ result: 'ok', output: '<br>' })
    },
    file: {
        getRequest: (args) => {
            // short circuit if filename is not present
            if (!args || !isString(args)) return null
            const { default: filename } = findMacroArgs(args)
            if (!filename || !isFilenameValid(filename)) return null

            return { repo: "files", query: { filename } }
        },
        render: (args, resolvedData) => {
            if (!args || !isString(args)) return { result: 'error', output: errMessage('FILE Macro Error', 'Illegal arguments') }

            const { default: filename, ...options } = findMacroArgs(args)
            if (!filename) return { result: 'error', output: errMessage('FILE Macro Error', 'Filename is required') }
            if (!isFilenameValid(filename)) return { result: 'error', output: errMessage('FILE Macro Error', 'Invalid filename') }
            if (resolvedData === null) return { result: 'error', output: errMessage('FILE Macro Error', `File not found: ${filename}`) }
            let filenameOnDisk = resolvedData.filenameOnDisk

            let res = ''
            if (options.width) res += `width="${options.width}" `
            if (options.height) res += `height="${options.height}" `

            // default options for pdf
            if (filename.toLowerCase().endsWith('pdf')) {
                if (!options.width) res += "width=500px "
                if (!options.height) res += "height=500px "
                // todo: iframe attack?
                return {
                    result: 'ok',
                    output: `<a href='/w/File:${filename}'><iframe src="/uploads/${filenameOnDisk}" ${res}></a>`
                }
            }
            return { result: 'ok', output: `<a href='/w/File:${filename}'><img class='ren-img img-fluid' src="/uploads/${filenameOnDisk}" ${res}/></a>` }
        }
    },
    color: {
        render: (args) => {
            if (!isString(args)) {
                return { result: 'error', output: errMessage('COLOR Macro Error', 'Illegal arguments') }
            }
            const lastComma = args.lastIndexOf('|')
            const color = args.substring(lastComma + 1, args.length)
            const text = args.substring(0, lastComma)
            return {
                result: 'ok',
                output: `<span style="color: ${color}" class="renColor">${text}</span>`
            }
        }
    },
    youtube: {
        render: (args) => {
            if (!isString(args)) {
                return { result: 'error', output: errMessage('YOUTUBE Macro Error', 'Illegal arguments') }
            }
            const ifr = `<iframe class='ren-yt' width="560" height="315" src="https://www.youtube-nocookie.com/embed/${args}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
            return { result: 'ok', output: ifr }
        }
    },
    anchor: {
        render: (args) => {
            if (!isString(args)) {
                return { result: 'error', output: errMessage('ANCHOR Macro Error', 'Illegal arguments') }
            }
            return { result: 'ok', output: `<a id='${args}'></a>` }
        }
    },
    dday: {
        render: (args) => {
            if (!isString(args)) {
                return { result: 'error', output: errMessage('DDAY Macro Error', 'No argument provided') }
            }
            try {
                if (!(/^\d\d\d\d-\d\d-\d\d$/.test(args))) throw new Error()
                const d1 = dateandtime.parse(args, 'YYYY-MM-DD')
                let gap = (new Date()) - d1
                let res = Math.floor(gap / (1000 * 60 * 60 * 24))
                res = res < 0 ? res + '' : '+' + res
                return { result: 'ok', output: res }
            } catch {
                return { result: 'error', output: errMessage('DDAY Macro Error', 'Illegal argument format') }
            }
        }
    },
    agek: {
        render: (args) => {
            if (!(/^\d\d\d\d-\d\d-\d\d$/.test(args))) {
                return { result: 'error', output: errMessage('AGEK Macro Error', 'Illegal argument') }
            }
            const d1 = dateandtime.parse(args, 'YYYY-MM-DD')
            const agek = (new Date()).getFullYear() - d1.getFullYear() + 1
            return { result: 'ok', output: agek }
        }
    },
    age: {
        render: (args) => {
            if (!(/^\d\d\d\d-\d\d-\d\d$/.test(args))) {
                return { result: 'error', output: errMessage('AGE Macro Error', 'Illegal argument') }
            }
            const d1 = dateandtime.parse(args, 'YYYY-MM-DD')
            let age = (new Date()).getFullYear() - d1.getFullYear()
            const m = (new Date()).getMonth() - d1.getMonth()
            if (m < 0 || (m === 0 && (new Date()).getDate() < d1.getDate())) age--;
            return { result: 'ok', output: age }
        }
    },
    map: {
        render: (args) => {
            if (!isString(args)) {
                return { result: 'error', output: errMessage('MAP Macro Error', 'Illegal arguments') }
            }
            const options = findMacroArgs(args)
            if (!options.x || !options.y) {
                return { result: 'error', output: errMessage('MAP Macro Error', 'Coordinates not provided') }
            }
            const z = options.z || 13

            const w = options.width || '300px'
            const h = options.height || '300px'
            const pins = []
            // loop thru options to find 'pin*' and add to pins
            for (let k in options) {
                if (k.startsWith('pin')) {
                    let [pinX, pinY, ...remainder] = options[k].split(',')
                    let label = remainder.join(',').trim()
                    if (!pinX || !pinY) continue
                    pinX = parseFloat(pinX.trim())
                    pinY = parseFloat(pinY.trim())
                    if (isNaN(pinX) || isNaN(pinY)) continue

                    let opt = { x: pinX, y: pinY }
                    if (label) opt.label = label
                    pins.push(opt)
                }
            }
            if (pins.length === 0) {
                pins.push({ x: options.x, y: options.y })
            }
            return {
                result: 'ok',
                output: dedent`
                <div    class='map'
                        style='width: ${w}; height: ${h};'
                        data-x='${options.x}'
                        data-y='${options.y}'
                        data-z='${z}'
                        data-a='${toDataAttr(pins)}'>
                </div>`
            }
        }
    },
    pagecount: {
        getRequest: () => ({ repo: 'pages', query: { count: 'total' } }),
        render: (_args, resolvedData) => {
            if (resolvedData === undefined) return { result: 'error', output: errMessage('PAGECOUNT Macro Error', 'Could not fetch page count') }
            return { result: 'ok', output: String(resolvedData) }
        }
    },
    syntax: {
        render: (args) => {
            if (!isString(args)) return { result: 'error', output: errMessage('SYNTAX Macro Error', 'Illegal arguments') }
            const commaIdx = args.indexOf(',')
            let language, code
            if (commaIdx === -1) {
                language = ''
                code = args.replace(/\\\)/g, ')')
            } else {
                language = args.substring(0, commaIdx).trim()
                code = args.substring(commaIdx + 1).trimStart().replace(/\\\)/g, ')')
            }
            if (language) {
                try {
                    const highlighted = hljs.highlight(code, { language, ignoreIllegals: true }).value
                    return { result: 'ok', output: `<pre><code class="language-${language}">${highlighted}</code></pre>` }
                } catch { /* fall through */ }
            }
            return { result: 'ok', output: `<pre><code>${escapeHTML(code)}</code></pre>` }
        }
    },
}

export function getMacroRequest(fn, args) {
    return macroRegistry[fn.toLowerCase()]?.getRequest?.(args) ?? null
}


/**
 * processes macro, returns the result of macro execution. meant to be called from HTMLVisitor.
 * @param {String} fn Macro name to call.
 * @param {String} args arguments list. Nullable.
 * @returns {Object} {result: String (ok|error|unprocessed), output: String (html)}
 */
export function macroHandler(fn, args, macroResult = {}) {
    const macro = macroRegistry[fn.toLowerCase()]
    if (!macro) return { result: 'error', output: errMessage('Macro Error', `No such macro: ${fn}`) }

    let resolvedData
    if (macro.getRequest) {
        const req = macro.getRequest(args)
        if (req) resolvedData = macroResult[req.repo]?.[Object.values(req.query)[0]]
    }

    return { ...macro.render(args, resolvedData) }
}