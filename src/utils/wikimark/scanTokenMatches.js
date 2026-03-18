import {
    T,
    assymetricClosers,
    assymetricOpeners,
    symmetricTokens,
    areMatchingAsymTokens
} from './tokens.js'

/**
 * Scans token stream to identify unmatched symmetric delimeters.
 * In other words, only returns openers/closers that are matched only if opener and closer are the same token.
 * Used by parser to fallback unmatched tokens.
 * @param {Token[]} tokens - token stream to scan
 * @returns {{openers: Set<Token>, closers: Set<Token>}} sets of matched openers and closers
 */
export function scanTokenMatches(tokens) {
    const openers = new Set() // MATCHED openers
    const closers = new Set() // MATCHED closers
    const stack = []
    const seenTokenTypes = new Set()

    for (const tok of tokens) {
        // reset stack for inline token
        if (tok.tokenType === T.LF) {
            stack.length = 0
            seenTokenTypes.clear()
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
            stack.push(tok)
        } else if (assymetricClosers.has(tok.tokenType)) {
            // (III) Assymetric closers
            let openerSeen = false
            for (const opener of stack) {
                openerSeen ||= areMatchingAsymTokens(opener, tok)
            }
            if (!openerSeen) continue // no matching opener in stack, ignore this closer
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
    }

    // scan for matched heading open/close pairs (line-scoped, asymmetric)
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

    // scan for matched FootnoteOpener/MacroCloser pairs (asymmetric)
    /*const footnoteStack = []
    for (const tok of tokens) {
        if (tok.tokenType === T.LF) {
            footnoteStack.length = 0
            continue
        }
        if (tok.tokenType === T.FootnoteOpener) {
            footnoteStack.push(tok)
        } else if (tok.tokenType === T.MacroCloser && footnoteStack.length > 0) {
            openers.add(footnoteStack.pop())
            closers.add(tok)
        }
    }*/

    return { openers, closers, matchedHeadingOpens }
}