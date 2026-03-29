import {
    T,
    inlineTokens,
    assymetricClosers,
    assymetricOpeners,
    blockLevelOpeners,
    symmetricTokens,
    areMatchingAsymTokens
} from './tokens.js'

function scanInlineMatches(tokens) {
    const openers = new Set() // MATCHED openers
    const closers = new Set() // MATCHED closers
    const stack = []
    const seenTokenTypes = new Set()
    let inlineContentSeen = false // true once any token appears after LF/start

    for (const tok of tokens) {
        // reset stack for inline token
        if (tok.tokenType === T.LF) {
            stack.length = 0
            seenTokenTypes.clear()
            inlineContentSeen = false
            continue
        }

        if (symmetricTokens.has(tok.tokenType)) {
            // (I) Symmetric tokens

            // discard unmatched tokens only if this token is unresolved
            while (stack.length > 0 &&
                stack[stack.length - 1].tokenType !== tok.tokenType &&
                seenTokenTypes.has(tok.tokenType)) {
                stack.pop()
            }

            if (stack.length !== 0 &&
                stack[stack.length - 1].tokenType === tok.tokenType) {
                // close pair
                openers.add(stack.pop())
                closers.add(tok)
                seenTokenTypes.delete(tok.tokenType)
            }
            else {
                // new opener
                stack.push(tok)
                seenTokenTypes.add(tok.tokenType)
            }
        }
        else if (assymetricOpeners.has(tok.tokenType)) {
            // (II) Assymetric openers
            // block-level openers (align) are only valid at the start of a line
            if (!blockLevelOpeners.has(tok.tokenType) || !inlineContentSeen) {
                stack.push(tok)
            }
        } else if (assymetricClosers.has(tok.tokenType)) {
            // (III) Assymetric closers
            let openerSeen = false
            for (const opener of stack) {
                openerSeen ||= areMatchingAsymTokens(opener, tok)
            }
            if (!openerSeen) { inlineContentSeen = true; continue } // no matching opener in stack, ignore this closer
            while (stack.length > 0) {
                const top = stack[stack.length - 1]
                if (areMatchingAsymTokens(top, tok)) {
                    openers.add(stack.pop())
                    closers.add(tok)
                    break
                }
                stack.pop()
            }
        }
        inlineContentSeen = true
    }
    return { openers, closers }
}

function scanHeadingMatches(tokens) {
    const matchedHeadingOpens = new Set()
    let pendingHeading = null  // { token, level }

    for (const tok of tokens) {
        if (tok.tokenType === T.LF) {
            pendingHeading = null
            continue
        }
        for (let n = 1; n <= 6; n++) {
            if (tok.tokenType === T[`H${n}Open`]) {
                pendingHeading = { token: tok, level: n }
                break
            }
            if (tok.tokenType === T[`H${n}Close`]) {
                if (pendingHeading?.level === n) {
                    matchedHeadingOpens.add(pendingHeading.token)
                }
                pendingHeading = null
                break
            }
        }
    }
    return matchedHeadingOpens
}

function scanMatchedFencedCode(tokens) {
    const matchedFenceOpens = new Set()
    const fenceStack = []
    for (const tok of tokens) {
        if (tok.tokenType !== T.FencedCode) continue
        if (fenceStack.length > 0) {
            matchedFenceOpens.add(fenceStack.pop())
        } else {
            fenceStack.push(tok)
        }
    }
    return matchedFenceOpens
}

/**
 * Determine if the TableRow matches the pattern:
 *   TableRow := TableDelimStart (inline* TableDelim)+
 * and that
 *  - TableDelim occurs right before $
 *  -No non-inline token occurs in between (ie TableDelim + inlineTokens)
 * * Last TableDelim shouldn't have any options
 */
function scanValidTableDelims(tokens) {
    const validTableDelims = new Set()
    let pendingTableDelimStart = null
    let pendingTableDelims = []
    let lastToken = null // only updated if pendingTableDelimStart is something
    for (const [i, tok] of tokens.entries()) {
        // we wouldn't expect TableDelimStart before LF or ^ appears
        if (tok.tokenType === T.TableDelimStart) {
            pendingTableDelimStart = tok
        }

        if (pendingTableDelimStart === null) continue

        if (tok.tokenType === T.LF) {
            // check if last token seen is TableDelim AND it has no payload
            if (lastToken?.tokenType === T.TableDelim && !lastToken.payload?.options) {
                validTableDelims.add(pendingTableDelimStart)
                validTableDelims.add(...pendingTableDelims)
            }
            pendingTableDelimStart = null
            pendingTableDelims = []
        }
        else if (i === tokens.length - 1) {
            // EOF, do the same
            if (tok.tokenType === T.TableDelim && !tok.payload?.options) {
                validTableDelims.add(pendingTableDelimStart)
                if (pendingTableDelims.length > 0) {
                    validTableDelims.add(...pendingTableDelims)
                }
                validTableDelims.add(tok)
            }
            pendingTableDelimStart = null
            pendingTableDelims = []
        }
        // invalid token in between, discard pending start
        else if (!inlineTokens.has(tok.tokenType) &&
            tok.tokenType !== T.TableDelim &&
            tok.tokenType !== T.TableDelimStart) {
            pendingTableDelimStart = null
            pendingTableDelims = []
        }

        if (tok.tokenType === T.TableDelim) {
            pendingTableDelims.push(tok)
        }
        lastToken = tok
    }
    return validTableDelims
}

/**
 * Scans token stream to identify unmatched symmetric delimeters.
 * In other words, only returns openers/closers that are matched only if opener and closer are the same token.
 * Used by parser to fallback unmatched tokens.
 * @param {Token[]} tokens - token stream to scan
 * @returns {{openers: Set<Token>, closers: Set<Token>, matchedHeadingOpens: Set<Token>, matchedFenceOpens: Set<Token>, validTableDelims: Set<Token>}} sets of matched openers and closers
 */
export function scanTokenMatches(tokens) {
    const { openers, closers } = scanInlineMatches(tokens)

    // scan for matched heading open/close pairs (line-scoped, asymmetric)
    const matchedHeadingOpens = scanHeadingMatches(tokens)

    // scan for matched FencedCode pairs (block-scoped, symmetric)
    const matchedFenceOpens = scanMatchedFencedCode(tokens)

    // scan for valid TableDelims
    const validTableDelims = scanValidTableDelims(tokens)

    return { openers, closers, matchedHeadingOpens, matchedFenceOpens, validTableDelims }
}