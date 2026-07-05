import { diff3Merge } from 'node-diff3'

/**
 * Performs three-way merge of two edits (editA and editB) against a base version (base).
 * @param {string} base - The base version of the content.
 * @param {string} editA - The first edited version of the content.
 * @param {string} editB - The second edited version of the content.
 * @returns {{success: boolean, merged: string, conflicts: Array<{editA: string, base: string, editB: string}>, chunks: Array<{type: 'ok' | 'merged' | 'conflict', content?: string, source?: 'editA' | 'editB' | 'both', editA?: string, base?: string, editB?: string}>}} - The result of the merge operation.
 */

function splitLines(text) {
    return text.split(/\r?\n/)
}


function joinLines(lines) {
    return lines.join('\n')
}

function getMergeableLine(editA, base, editB) {
    if (editA === editB) {
        return {
            type: editA === base ? 'ok' : 'merged',
            source: editA === base ? undefined : 'both',
            content: editA,
            base,
        }
    }
    if (editA === base) {
        return {
            type: 'merged',
            source: 'editB',
            content: editB,
            base,
        }
    }
    if (editB === base) {
        return {
            type: 'merged',
            source: 'editA',
            content: editA,
            base,
        }
    }
    return null
}

function pushLineChunks(chunks, lines) {
    for (const line of lines) {
        const previous = chunks[chunks.length - 1]
        if (previous && previous.type === line.type && previous.source === line.source) {
            previous.content = joinLines([previous.content, line.content])
            if (line.type === 'merged') previous.base = joinLines([previous.base, line.base])
            continue
        }

        chunks.push(line.type === 'merged'
            ? { type: line.type, source: line.source, content: line.content, base: line.base }
            : { type: line.type, content: line.content })
    }
}

function classifyOkBlock(mergedLines, editALines, baseLines, editBLines) {
    if (
        mergedLines.length !== editALines.length ||
        mergedLines.length !== baseLines.length ||
        mergedLines.length !== editBLines.length
    ) {
        return [{ type: 'ok', content: joinLines(mergedLines) }]
    }

    return mergedLines.map((line, index) => (
        getMergeableLine(editALines[index], baseLines[index], editBLines[index]) ||
        { type: 'ok', content: line }
    ))
}

function splitMergeableEdges(conflict) {
    const { a, o, b } = conflict
    let start = 0
    let endA = a.length - 1
    let endO = o.length - 1
    let endB = b.length - 1
    const prefix = []
    const suffix = []

    while (start < a.length && start < o.length && start < b.length) {
        const mergedLine = getMergeableLine(a[start], o[start], b[start])
        if (mergedLine === null) break

        prefix.push(mergedLine)
        start += 1
    }

    while (endA >= start && endO >= start && endB >= start) {
        const mergedLine = getMergeableLine(a[endA], o[endO], b[endB])
        if (mergedLine === null) break

        suffix.unshift(mergedLine)
        endA -= 1
        endO -= 1
        endB -= 1
    }

    return {
        prefix,
        conflict: {
            a: a.slice(start, endA + 1),
            o: o.slice(start, endO + 1),
            b: b.slice(start, endB + 1),
        },
        suffix,
    }
}

export default (base, editA, editB) => {
    const baseLines = splitLines(base)
    const editALines = splitLines(editA)
    const editBLines = splitLines(editB)
    const result = diff3Merge(
        editALines,
        baseLines,
        editBLines,
        { excludeFalseConflicts: true }
    )
    const merged = []
    const conflicts = []
    const chunks = []
    let editAIndex = 0
    let baseIndex = 0
    let editBIndex = 0

    for (let index = 0; index < result.length; index += 1) {
        const block = result[index]
        if (block.ok) {
            const nextConflict = result.slice(index + 1).find(resultBlock => resultBlock.conflict)
            const nextEditAIndex = nextConflict ? nextConflict.conflict.aIndex : editALines.length
            const nextBaseIndex = nextConflict ? nextConflict.conflict.oIndex : baseLines.length
            const nextEditBIndex = nextConflict ? nextConflict.conflict.bIndex : editBLines.length

            merged.push(...block.ok)
            pushLineChunks(chunks, classifyOkBlock(
                block.ok,
                editALines.slice(editAIndex, nextEditAIndex),
                baseLines.slice(baseIndex, nextBaseIndex),
                editBLines.slice(editBIndex, nextEditBIndex)
            ))
            editAIndex = nextEditAIndex
            baseIndex = nextBaseIndex
            editBIndex = nextEditBIndex
            continue
        }

        const split = splitMergeableEdges(block.conflict)
        if (split.prefix.length > 0) {
            merged.push(...split.prefix.map(line => line.content))
            pushLineChunks(chunks, split.prefix)
        }

        const conflict = {
            editA: joinLines(split.conflict.a),
            base: joinLines(split.conflict.o),
            editB: joinLines(split.conflict.b),
        }

        if (split.conflict.a.length > 0 || split.conflict.o.length > 0 || split.conflict.b.length > 0) {
            conflicts.push(conflict)
            chunks.push({
                type: 'conflict',
                ...conflict,
            })
            merged.push(
                '<<<<<<< editA',
                ...split.conflict.a,
                '||||||| base',
                ...split.conflict.o,
                '=======',
                ...split.conflict.b,
                '>>>>>>> editB'
            )
        }

        if (split.suffix.length > 0) {
            merged.push(...split.suffix.map(line => line.content))
            pushLineChunks(chunks, split.suffix)
        }

        editAIndex = block.conflict.aIndex + block.conflict.a.length
        baseIndex = block.conflict.oIndex + block.conflict.o.length
        editBIndex = block.conflict.bIndex + block.conflict.b.length
    }

    return {
        success: conflicts.length === 0,
        merged: joinLines(merged),
        conflicts,
        chunks,
    }
}
