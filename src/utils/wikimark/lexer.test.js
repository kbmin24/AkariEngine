import { lexer } from './lexer.js'


function lex(input) {
    const result = lexer.tokenize(input)
    return result
}

function tokenNames(input) {
    return lex(input).tokens.map(t => t.tokenType.name)
}

function tokenImages(input) {
    return lex(input).tokens.map(t => t.image)
}

describe('Lexer', () => {
    describe('errors', () => {
        test('produces no errors on valid input', () => {
            expect(lex('hello world').errors).toHaveLength(0)
            expect(lex("'''bold'''").errors).toHaveLength(0)
            expect(lex('__underline__').errors).toHaveLength(0)
        })
    })

    describe('Text', () => {
        test('matches plain text', () => {
            expect(tokenNames('hello')).toEqual(['Text'])
        })

        test('matches a lone apostrophe as text', () => {
            expect(tokenNames("it's")).toEqual(['Text', 'Text', 'Text'])
            expect(tokenImages("it's")).toEqual(["it", "'", "s"])
        })

        test('matches a lone underscore as text', () => {
            expect(tokenNames('a_b')).toEqual(['Text', 'Text', 'Text'])
            expect(tokenImages('a_b')).toEqual(['a', '_', 'b'])
        })
    })

    describe('BoldItalicDelim', () => {
        test("matches '''''", () => {
            expect(tokenNames("'''''")).toEqual(['BoldItalicDelim'])
        })

        test("tokenizes '''''bolditalic''''' as BoldItalicDelim Text BoldItalicDelim", () => {
            expect(tokenNames("'''''bolditalic'''''")).toEqual(['BoldItalicDelim', 'Text', 'BoldItalicDelim'])
            expect(tokenImages("'''''bolditalic'''''")).toEqual(["'''''", 'bolditalic', "'''''"])
        })
    })

    describe('BoldDelim', () => {
        test("matches '''", () => {
            expect(tokenNames("'''")).toEqual(['BoldDelim'])
        })

        test("tokenizes '''bold''' as BoldDelim Text BoldDelim", () => {
            expect(tokenNames("'''bold'''")).toEqual(['BoldDelim', 'Text', 'BoldDelim'])
            expect(tokenImages("'''bold'''")).toEqual(["'''", 'bold', "'''"])
        })
    })

    describe('UnderlineDelim', () => {
        test('matches __', () => {
            expect(tokenNames('__')).toEqual(['UnderlineDelim'])
        })

        test('tokenizes __underline__ as UnderlineDelim Text UnderlineDelim', () => {
            expect(tokenNames('__underline__')).toEqual(['UnderlineDelim', 'Text', 'UnderlineDelim'])
            expect(tokenImages('__underline__')).toEqual(['__', 'underline', '__'])
        })
    })

    describe('ItalicDelim', () => {
        test("matches ''", () => {
            expect(tokenNames("''")).toEqual(['ItalicDelim'])
        })

        test("tokenizes ''italic'' as ItalicDelim Text ItalicDelim", () => {
            expect(tokenNames("''italic''")).toEqual(['ItalicDelim', 'Text', 'ItalicDelim'])
            expect(tokenImages("''italic''")).toEqual(["''", 'italic', "''"])
        })
    })

    describe('EscapeChar', () => {
        test("matches a backslash followed by a special character", () => {
            expect(tokenNames("\\'")).toEqual(['EscapeChar'])
            expect(tokenNames('\\_')).toEqual(['EscapeChar'])
            expect(tokenNames("\\\\")).toEqual(['EscapeChar'])
        })
        test("correctly tokenises escaped special characters", () => {
            expect(tokenNames("\\'\\'\\'NOTBOLD\\'\\'\\'")).toEqual([
                'EscapeChar', 'EscapeChar', 'EscapeChar', 'Text', 'EscapeChar', 'EscapeChar', 'EscapeChar',
            ])
            expect(tokenImages("\\'\\'\\'NOTBOLD\\'\\'\\'")).toEqual([
                "\\'", "\\'", "\\'", "NOTBOLD", "\\'", "\\'", "\\'",
            ])
            expect(tokenNames("\\'''ActuallyItalic''\\'")).toEqual([
                'EscapeChar', 'ItalicDelim', 'Text', 'ItalicDelim', 'EscapeChar',
            ])
        })
    })

    describe('Superscript', () => {
        test('matches ^^', () => {
            expect(tokenNames('^^')).toEqual(['SupDelim'])
            expect(tokenImages('^^')).toEqual(['^^'])
        })
        test('tokenizes ^^superscript^^ as SupDelim Text SupDelim', () => {
            expect(tokenNames('^^superscript^^')).toEqual(['SupDelim', 'Text', 'SupDelim'])
            expect(tokenImages('^^superscript^^')).toEqual(['^^', 'superscript', '^^'])
        })
    })

    describe('Subscript', () => {
        test('matches ,,', () => {
            expect(tokenNames(',,')).toEqual(['SubDelim'])
            expect(tokenImages(',,')).toEqual([',,'])
        })
        test('tokenizes ,,subscript,, as SubDelim Text SubDelim', () => {
            expect(tokenNames(',,subscript,,')).toEqual(['SubDelim', 'Text', 'SubDelim'])
            expect(tokenImages(',,subscript,,')).toEqual([',,', 'subscript', ',,'])
        })
    })

    describe('big', () => {
        test('matches """', () => {
            expect(tokenNames('"""')).toEqual(['BigDelim'])
            expect(tokenImages('"""')).toEqual(['"""'])
        })
        test('tokenizes """big""" as BigDelim Text BigDelim', () => {
            expect(tokenNames('"""big"""')).toEqual(['BigDelim', 'Text', 'BigDelim'])
            expect(tokenImages('"""big"""')).toEqual(['"""', 'big', '"""'])
        })
    })

    describe('Align', () => {
        test('matches Left, Center, Right align delimeters', () => {
            expect(tokenNames('[(]{{')).toEqual(['LeftAlignOpen'])
            expect(tokenNames('[:]{{')).toEqual(['CenterAlignOpen'])
            expect(tokenNames('[)]{{')).toEqual(['RightAlignOpen'])
            expect(tokenNames('}}')).toEqual(['MultilineClose'])
        })
        test('Does not get mixed up with multiline macro', () => {
            // Reserved
        })
    })

    describe('line breaks', () => {
        test('Skips CR', () => {
            expect(tokenNames('\r')).toEqual([])
        })

        test('matches LF', () => {
            expect(tokenNames('\n')).toEqual(['LF'])
        })

        test('matches CRLF as LF', () => {
            expect(tokenNames('\r\n')).toEqual(['LF'])
        })
    })

    describe('TOC', () => {
        test('Matches [toc]', () => {
            expect(tokenNames('[toc]')).toEqual(['TOC'])
            expect(tokenNames('[ToC]')).toEqual(['TOC'])
            expect(tokenNames('[목차]')).toEqual(['TOC'])
        })
        test('\\[toc] is not [toc]', () => {
            // sounds a bit weird but it's an orphaned ']'
            expect(tokenNames('\\[toc]')).toEqual(['EscapeChar', 'Text', 'MacroCloser'])
        })
    })

    describe('nesting', () => {
        test("tokenizes __'''bold'''__ correctly", () => {
            expect(tokenNames("__'''bold'''__")).toEqual([
                'UnderlineDelim', 'BoldDelim', 'Text', 'BoldDelim', 'UnderlineDelim',
            ])
        })

        test("tokenizes '''__boldunderline__''' correctly", () => {
            expect(tokenNames("'''__boldunderline__'''")).toEqual([
                'BoldDelim', 'UnderlineDelim', 'Text', 'UnderlineDelim', 'BoldDelim',
            ])
        })
    })

    describe('Comments', () => {
        test('comment ignored', () => {
            expect(tokenNames('// this is a comment\n')).toEqual([])
        })
        test('comment without newline ignored', () => {
            expect(tokenNames('// this is a comment')).toEqual([])
        })
    })

    describe('Headings', () => {
        test('matches H1Open and H1Close', () => {
                       expect(tokenNames('= Heading 1 =')).toEqual(['H1Open', 'Text', 'SpaceTab', 'Text', 'H1Close'])
            expect(tokenImages('= Heading 1 =')).toEqual(['= ', 'Heading', ' ', '1', ' ='])
        })
        test('matches h2, h3, h4, h5, h6', () => {
            expect(tokenNames('== Heading 2 ==')).toEqual(['H2Open', 'Text', 'SpaceTab', 'Text', 'H2Close'])
            expect(tokenImages('== Heading 2 ==')).toEqual(['== ', 'Heading', ' ', '2', ' =='])

            expect(tokenNames('=== Heading 3 ===')).toEqual(['H3Open', 'Text', 'SpaceTab', 'Text', 'H3Close'])
            expect(tokenImages('=== Heading 3 ===')).toEqual(['=== ', 'Heading', ' ', '3', ' ==='])

            expect(tokenNames('==== Heading 4 ====')).toEqual(['H4Open', 'Text', 'SpaceTab', 'Text', 'H4Close'])
            expect(tokenImages('==== Heading 4 ====')).toEqual(['==== ', 'Heading', ' ', '4', ' ===='])

            expect(tokenNames('===== Heading 5 =====')).toEqual(['H5Open', 'Text', 'SpaceTab', 'Text', 'H5Close'])
            expect(tokenImages('===== Heading 5 =====')).toEqual(['===== ', 'Heading', ' ', '5', ' ====='])

            expect(tokenNames('====== Heading 6 ======')).toEqual(['H6Open', 'Text', 'SpaceTab', 'Text', 'H6Close'])
            expect(tokenImages('====== Heading 6 ======')).toEqual(['====== ', 'Heading', ' ', '6', ' ======'])
        })
    })

    describe('Footnotes', () => {
        test('matches footnote opener and closer', () => {
            expect(tokenNames('[* ABC]')).toEqual(['FootnoteOpener', 'SpaceTab', 'Text', 'MacroCloser'])
        })
    })

    describe('OLBullet', () => {
        test('# text tokenizes as OLBullet SpaceTab Text', () => {
            expect(tokenNames('# text')).toEqual(['OLBullet', 'SpaceTab', 'Text'])
            expect(tokenImages('# text')).toEqual(['#', ' ', 'text'])
        })

        test('## text tokenizes as OLBullet with image length 2', () => {
            expect(tokenNames('## text')).toEqual(['OLBullet', 'SpaceTab', 'Text'])
            expect(tokenImages('## text')).toEqual(['##', ' ', 'text'])
        })

        test('### text tokenizes as OLBullet with image length 3', () => {
            expect(tokenNames('### text')).toEqual(['OLBullet', 'SpaceTab', 'Text'])
            expect(tokenImages('### text')).toEqual(['###', ' ', 'text'])
        })

        test('# at start of second line tokenizes as OLBullet', () => {
            expect(tokenNames('foo\n# text')).toEqual(['Text', 'LF', 'OLBullet', 'SpaceTab', 'Text'])
        })

        test('# with no content after space is not an OLBullet', () => {
            expect(tokenNames('# ')).not.toContain('OLBullet')
            expect(tokenNames('# \n')).not.toContain('OLBullet')
        })

        test('#text with no space is not an OLBullet', () => {
            expect(tokenNames('#text')).not.toContain('OLBullet')
        })

        test('# text not at line start is not an OLBullet', () => {
            expect(tokenNames(' # text')).not.toContain('OLBullet')
        })

        test('inline # mid-sentence is not an OLBullet', () => {
            expect(tokenNames('foo # bar')).not.toContain('OLBullet')
        })

        test('# and * do not interfere with each other', () => {
            expect(tokenNames('* item')).not.toContain('OLBullet')
            expect(tokenNames('# item')).not.toContain('ULBullet')
        })
    })

    describe('ULBullet', () => {
        test('* text tokenizes as ULBullet SpaceTab Text', () => {
            expect(tokenNames('* text')).toEqual(['ULBullet', 'SpaceTab', 'Text'])
            expect(tokenImages('* text')).toEqual(['*', ' ', 'text'])
        })

        test('** text tokenizes as ULBullet with image length 2', () => {
            expect(tokenNames('** text')).toEqual(['ULBullet', 'SpaceTab', 'Text'])
            expect(tokenImages('** text')).toEqual(['**', ' ', 'text'])
        })

        test('*** text tokenizes as ULBullet with image length 3', () => {
            expect(tokenNames('*** text')).toEqual(['ULBullet', 'SpaceTab', 'Text'])
            expect(tokenImages('*** text')).toEqual(['***', ' ', 'text'])
        })

        test('* at start of second line tokenizes as ULBullet', () => {
            expect(tokenNames('foo\n* text')).toEqual(['Text', 'LF', 'ULBullet', 'SpaceTab', 'Text'])
        })

        test('* with no content after space is not a ULBullet', () => {
            // trailing space only — (?= \S) rejects this
            expect(tokenNames('* ')).not.toContain('ULBullet')
            expect(tokenNames('* \n')).not.toContain('ULBullet')
        })

        test('*text with no space is not a ULBullet', () => {
            expect(tokenNames('*text')).not.toContain('ULBullet')
        })

        test('* text not at line start is not a ULBullet', () => {
            // leading space means offset > 0 and previous char is not newline
            expect(tokenNames(' * text')).not.toContain('ULBullet')
        })

        test('inline * mid-sentence is not a ULBullet', () => {
            expect(tokenNames('foo * bar')).not.toContain('ULBullet')
        })
    })
})
