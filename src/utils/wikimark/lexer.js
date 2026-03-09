import { Lexer } from 'chevrotain'
import { allTokens } from './tokens.js'
export const lexer = new Lexer(allTokens)
