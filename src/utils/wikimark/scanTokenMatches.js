import { T, symmetricTokens } from './tokens.js'

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

        if (!symmetricTokens.has(tok.tokenType)) continue

        // discard unmatched tokens only if this token is unresolved
        while (stack.length > 0 &&
            stack[stack.length - 1].tokenType !== tok.tokenType &&
            seenTokenTypes.has(tok.tokenType)) {
            stack.pop()
        }

        if (stack.length !== 0 &&
            stack[stack.length - 1].tokenType === tok.tokenType)
        {
            // close pair
            openers.add(stack.pop())
            closers.add(tok)
            seenTokenTypes.delete(tok.tokenType)
        }
        else
        {
            // new opener
            stack.push(tok)
            seenTokenTypes.add(tok.tokenType)
        }
    }

    return { openers, closers }
}