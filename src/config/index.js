import path from 'path'
import { fileURLToPath } from "url"
const __dirname = fileURLToPath(new URL(".", import.meta.url))

import settings from '../../LocalSettings.json' with { type: 'json' }

class Config {
    constructor() {
        this.basePath = path.resolve(__dirname, '../..')
        this.settings = settings
    }

    get port() { return this.settings.port }
    get behindProxy() { return this.settings.behindProxy || false }
    get appName() { return this.settings.appname }
    get license() { return this.settings.licence }
    get dateTimeFormat() { return this.settings.dateTimeFormat }
    get database() { return this.settings.database }
    get sessionSecret() { return this.settings.session_secret }
    get ssl() { return this.settings.ssl }
    get isPrivate() { return this.settings.isPrivate || false }
    get defaultLocale() { return this.settings.defaultLocale || 'en_GB' }
    get extensions() { return this.settings.extensions || [] }
    get skins() { return this.settings.skins || [] }
    get security() { return this.settings.security || {} }
    get isDevelopment() { return process.env.NODE_ENV !== 'production' }

    get sanitiseOptions() {
        return {
            allowedTags: ['div', 'span', 'blockquote', 'code', 'p', 'pre', 'caption',
                'i', 'b', 'u', 's', 'del', 'em', 'strong', 'a', 'sup', 'sub', 'font',
                'big', 'small',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'br', 'hr',
                'ol', 'ul', 'li', 'dt', 'dl',
                'figure', 'figcaption', 'cite',
                'table', 'th', 'tr', 'td', 'tbody', 'thead', 'tfoot',
                'img', 'iframe',
                'ruby', 'rp', 'rt'],

            allowedAttributes: {
                a: ['href', 'name', 'id', 'target', 'rel', 'class', 'title', 'style'],
                code: ['class', 'id', 'style'],
                i: ['class', 'id', 'aria-hidden', 'style'],
                font: ['class', 'id', 'size', 'color', 'face', 'style'],
                div: ['class', 'id', 'style', 'data-x', 'data-y', 'data-z', 'data-a'],
                span: ['class', 'id', 'style', 'data-x', 'data-y', 'data-z'],
                caption: ['class', 'id', 'style'],
                p: ['class', 'id', 'style'],
                del: ['class', 'id', 'style'],
                pre: ['class', 'id', 'style'],
                hr: ['class', 'id', 'style'],
                h1: ['class', 'id', 'style'],
                h2: ['class', 'id', 'style'],
                h3: ['class', 'id', 'style'],
                h4: ['class', 'id', 'style'],
                h5: ['class', 'id', 'style'],
                h6: ['class', 'id', 'style'],
                ol: ['class', 'id', 'style', 'reversed', 'start', 'type'],
                ul: ['class', 'id', 'style', 'reversed', 'start', 'type'],
                th: ['class', 'id', 'style', 'colspan', 'rowspan'],
                td: ['class', 'id', 'style', 'colspan', 'rowspan'],
                tr: ['class', 'id', 'style', 'colspan', 'rowspan'],
                table: ['class', 'id', 'style', 'colspan', 'rowspan'],
                thead: ['class', 'id', 'style', 'colspan', 'rowspan'],
                tbody: ['class', 'id', 'style', 'colspan', 'rowspan'],
                figure: ['class', 'id', 'style', 'data-oembed-url'],
                iframe: ['class', 'width', 'height', 'style', 'src', 'frameborder', 'allow', 'allowfullscreen'],
                img: ['class', 'id', 'style', 'height', 'width', 'src', 'srcset', 'alt', 'title'],
                blockquote: ['class', 'id', 'style']
            },
            allowedStyles: {
                '*': {
                    color: [/^.*?$/],
                    'background-color': [/^.*?$/],
                    'background-image': [/^ *(?:repeating-)?(?:linear|radial)-gradient\([^(]*(\([^)]*\)[^(]*)*[^)]*\) *$/],
                    'text-align': [/^ *left *$/, /^ *right *$/, /^ *center *$/],
                    'vertical-align': [/^ *top *$/, /^ *middle *$/, /^ *bottom *$/],
                    font: [/^.*?$/],
                    'font-size': [/^ *(\d|.)+(?:px|em|%) *$/],
                    'font-family': [/^.*?$/],
                    'font-weight': [/^.*?$/],
                    'word-break': [/^ *normal *$/, /^ *break-all *$/, /^ *keep-all *$/],
                    margin: [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
                    'margin-top': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
                    'margin-bottom': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
                    'margin-left': [/^ *(-|\+)?(\d|.)+(?:px|em|%) *$/],
                    'margin-right': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
                    'max-width': [/^.*?$/],
                    'max-height': [/^.*?$/],
                    'min-width': [/^.*?$/],
                    'min-height': [/^.*?$/],
                    padding: [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
                    'padding-left': [/^ *(-|\+)?(\d|.)+(?:px|em|%) *$/],
                    'padding-right': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
                    'padding-top': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
                    'padding-bottom': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
                    position: [/^.*?$/],
                    border: [/^ *(thin|medium|thick|(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
                    'border-bottom': [/^ *(thin|medium||(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
                    'border-top': [/^ *(thin|medium|thick|(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
                    'border-left': [/^ *(thin|medium|thick|(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
                    'border-right': [/^ *(thin|medium|thick|(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
                    'border-style': [/^ *(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? *$/],
                    'border-*-style': [/^ *(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? *$/],
                    'border-color': [/^.*?$/],
                    'border-*-color': [/^.*?$/],
                    'border-width': [/^.*?$/],
                    'border-left-width': [/^.*?$/],
                    'border-right-width': [/^.*?$/],
                    'border-top-width': [/^.*?$/],
                    'border-bottom-width': [/^.*?$/],
                    'border-image': [/^ *(?:repeating-)?(?:linear|radial)-gradient\([^(]*(\([^)]*\)[^(]*)*[^)]*\)( \d*)? *$/],
                    'box-shadow': [/^.*?$/],
                    float: [/^ *(left|right) *$/],
                    width: [/^.*?$/],
                    height: [/^.*?$/],
                    clear: [/^.*?$/]
                }
            },
            exclusiveFilter: (tag) => {
                if (tag.tag === 'img') {
                    if (!tag.attribs.src) return false
                    return !(/^\/(board)?uploads\/.*$/.test(tag.attribs.src))
                }

                if (tag.tag === 'iframe') {
                    if (!tag.attribs.src) return true
                    if (tag.attribs.src.startsWith('/')) {
                        if (tag.attribs.src.includes('../')) return true
                        if (tag.attribs.src.includes('..\\')) return true
                        return !tag.attribs.src.startsWith('/uploads/')
                    }
                    return false
                }

                return false
            },
            disallowedTagsMode: 'escape',
            allowedIframeHostnames: this.security.allowedIframeHostnames || ['www.youtube.com', 'www.youtube-nocookie.com'],
            allowIframeRelativeUrls: true
        }
    }
}

export default new Config();
