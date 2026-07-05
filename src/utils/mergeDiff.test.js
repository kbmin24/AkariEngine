import { describe, expect, test } from '@jest/globals'
import mergeDiff from './mergeDiff.js'

describe('mergeDiff', () => {
    test('returns the unchanged text when neither edit changes the base', () => {
        const base = 'title\nbody\nfooter'

        expect(mergeDiff(base, base, base)).toEqual({
            success: true,
            merged: base,
            conflicts: [],
            chunks: [
                {
                    type: 'ok',
                    content: base,
                },
            ],
        })
    })

    test('merges independent edits from both versions', () => {
        const base = 'title\nbody\nfooter'
        const editA = 'title from A\nbody\nfooter'
        const editB = 'title\nbody\nfooter from B'

        expect(mergeDiff(base, editA, editB)).toEqual({
            success: true,
            merged: 'title from A\nbody\nfooter from B',
            conflicts: [],
            chunks: [
                {
                    type: 'merged',
                    source: 'editA',
                    content: 'title from A',
                    base: 'title',
                },
                {
                    type: 'ok',
                    content: 'body',
                },
                {
                    type: 'merged',
                    source: 'editB',
                    content: 'footer from B',
                    base: 'footer',
                },
            ],
        })
    })

    test('accepts identical edits from both versions without a conflict', () => {
        const base = 'title\nold body\nfooter'
        const changed = 'title\nnew body\nfooter'

        expect(mergeDiff(base, changed, changed)).toEqual({
            success: true,
            merged: changed,
            conflicts: [],
            chunks: [
                {
                    type: 'ok',
                    content: 'title',
                },
                {
                    type: 'merged',
                    source: 'both',
                    content: 'new body',
                    base: 'old body',
                },
                {
                    type: 'ok',
                    content: 'footer',
                },
            ],
        })
    })

    test('uses the changed version when only one edit differs from the base', () => {
        const base = 'title\nold body\nfooter'
        const editA = 'title\nnew body\nfooter'

        expect(mergeDiff(base, editA, base)).toEqual({
            success: true,
            merged: editA,
            conflicts: [],
            chunks: [
                {
                    type: 'ok',
                    content: 'title',
                },
                {
                    type: 'merged',
                    source: 'editA',
                    content: 'new body',
                    base: 'old body',
                },
                {
                    type: 'ok',
                    content: 'footer',
                },
            ],
        })
    })

    test('reports overlapping edits as a conflict with conflict markers in merged text', () => {
        const base = 'title\nold body\nfooter'
        const editA = 'title\nbody from A\nfooter'
        const editB = 'title\nbody from B\nfooter'

        expect(mergeDiff(base, editA, editB)).toEqual({
            success: false,
            merged: [
                'title',
                '<<<<<<< editA',
                'body from A',
                '||||||| base',
                'old body',
                '=======',
                'body from B',
                '>>>>>>> editB',
                'footer',
            ].join('\n'),
            conflicts: [
                {
                    editA: 'body from A',
                    base: 'old body',
                    editB: 'body from B',
                },
            ],
            chunks: [
                {
                    type: 'ok',
                    content: 'title',
                },
                {
                    type: 'conflict',
                    editA: 'body from A',
                    base: 'old body',
                    editB: 'body from B',
                },
                {
                    type: 'ok',
                    content: 'footer',
                },
            ],
        })
    })

    test('keeps multi-line conflict sections together', () => {
        const base = 'before\none\ntwo\nafter'
        const editA = 'before\none from A\ntwo from A\nafter'
        const editB = 'before\none from B\ntwo from B\nafter'

        expect(mergeDiff(base, editA, editB)).toEqual({
            success: false,
            merged: [
                'before',
                '<<<<<<< editA',
                'one from A',
                'two from A',
                '||||||| base',
                'one',
                'two',
                '=======',
                'one from B',
                'two from B',
                '>>>>>>> editB',
                'after',
            ].join('\n'),
            conflicts: [
                {
                    editA: 'one from A\ntwo from A',
                    base: 'one\ntwo',
                    editB: 'one from B\ntwo from B',
                },
            ],
            chunks: [
                {
                    type: 'ok',
                    content: 'before',
                },
                {
                    type: 'conflict',
                    editA: 'one from A\ntwo from A',
                    base: 'one\ntwo',
                    editB: 'one from B\ntwo from B',
                },
                {
                    type: 'ok',
                    content: 'after',
                },
            ],
        })
    })

    test('peels line-aligned one-sided edits out of adjacent conflict blocks', () => {
        const base = '\na\nb\nc'
        const editA = '\na!!\nb~\nc'
        const editB = '\na(\nb\nc'

        expect(mergeDiff(base, editA, editB)).toEqual({
            success: false,
            merged: [
                '',
                '<<<<<<< editA',
                'a!!',
                '||||||| base',
                'a',
                '=======',
                'a(',
                '>>>>>>> editB',
                'b~',
                'c',
            ].join('\n'),
            conflicts: [
                {
                    editA: 'a!!',
                    base: 'a',
                    editB: 'a(',
                },
            ],
            chunks: [
                {
                    type: 'ok',
                    content: '',
                },
                {
                    type: 'conflict',
                    editA: 'a!!',
                    base: 'a',
                    editB: 'a(',
                },
                {
                    type: 'merged',
                    source: 'editA',
                    content: 'b~',
                    base: 'b',
                },
                {
                    type: 'ok',
                    content: 'c',
                },
            ],
        })
    })

    test('normalizes CRLF input to LF output', () => {
        const base = 'title\r\nbody\r\nfooter'
        const editA = 'title from A\r\nbody\r\nfooter'
        const editB = 'title\r\nbody\r\nfooter from B'

        expect(mergeDiff(base, editA, editB)).toEqual({
            success: true,
            merged: 'title from A\nbody\nfooter from B',
            conflicts: [],
            chunks: [
                {
                    type: 'merged',
                    source: 'editA',
                    content: 'title from A',
                    base: 'title',
                },
                {
                    type: 'ok',
                    content: 'body',
                },
                {
                    type: 'merged',
                    source: 'editB',
                    content: 'footer from B',
                    base: 'footer',
                },
            ],
        })
    })

    test('preserves a trailing newline in the merged output', () => {
        const base = 'title\nbody\nfooter\n'
        const editA = 'title from A\nbody\nfooter\n'
        const editB = 'title\nbody\nfooter from B\n'

        expect(mergeDiff(base, editA, editB)).toEqual({
            success: true,
            merged: 'title from A\nbody\nfooter from B\n',
            conflicts: [],
            chunks: [
                {
                    type: 'merged',
                    source: 'editA',
                    content: 'title from A',
                    base: 'title',
                },
                {
                    type: 'ok',
                    content: 'body',
                },
                {
                    type: 'merged',
                    source: 'editB',
                    content: 'footer from B',
                    base: 'footer',
                },
                {
                    type: 'ok',
                    content: '',
                },
            ],
        })
    })
})
