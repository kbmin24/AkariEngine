import { parseIncludeArgs } from './wikimark/includeArgs.js';

// Type A is single-line; Type B may span lines. Both names are case-insensitive.
export const INCLUDE_PATTERN = /\[include\(((?:[^)\\\r\n]|\\[^\r\n])*)\)\]|\[include\]\{\{([\s\S]*?)\}\}/gi;
const FILE_PATTERN = /\[file\(((?:[^)\\\r\n]|\\[^\r\n])*)\)\]|\[file\]\{\{([\s\S]*?)\}\}/gi;

export default function extractLinks(source, content = '') {
    const found = new Set();
    const links = [];
    const add = (dest, isInclude) => {
        if (!dest) return;
        const key = JSON.stringify([dest, isInclude]);
        if (found.has(key)) return;
        found.add(key);
        links.push({ source, dest, isInclude });
    };

    // Keep matches within one pair of brackets, even next to labeled links.
    for (const match of (content || '').matchAll(/\[\[([^\]|\r\n]*)(?:\|[^\]\r\n]*)?\]\]/g)) {
        const dest = match[1];
        if (/^(?:(?:category|분류):|https?:\/\/)/i.test(dest)) continue;
        add(dest, false);
    }
    for (const match of (content || '').matchAll(INCLUDE_PATTERN)) {
        add(parseIncludeArgs(match[1] ?? match[2]).title, true);
    }
    for (const match of (content || '').matchAll(FILE_PATTERN)) {
        // File macros use the last positional argument, like findMacroArgs in macro.js.
        const filename = (match[1] ?? match[2]).split(',').filter(part => !part.includes('=')).at(-1);
        if (filename && /\.(?:png|jpg|jpeg|jfif|gif|webp|svg|pdf)$/i.test(filename)) {
            add(`File:${filename}`, true);
        }
    }
    return links;
}
