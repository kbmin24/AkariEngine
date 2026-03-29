// temporary runner for the new renderer
import sanitizeHtml from 'sanitize-html'
import { WikiParser } from "./wikiparser.js"
import { HTMLVisitor } from "./HTMLVisitor.js"
import { PreprocessVisitor } from './PreprocessVisitor.js'
import { lexer } from './lexer.js'
import { findMacroArgs } from './macro.js'
import logger from '../logger.js'

const parser = new WikiParser()

const errString = '<span style="color:red;font-weight:bold;">Parser crashed</span>'

function applyHooks(hooks, input, renderOptions, repositories, canRedirect) {
    for (const f of hooks) {
        const res = f(input, renderOptions, repositories, canRedirect)
        input = res?.input ?? input
        renderOptions = res?.renderOptions ?? renderOptions
        repositories = res?.repositories ?? repositories
        canRedirect = res?.canRedirect ?? canRedirect
    }
    return { input, renderOptions, repositories, canRedirect }
}

function checkRedirect(input, canRedirect) {
    if (!canRedirect) return null
    const redirectMatch = /^#redirect\s+(.+)$/i.exec(input.trim())
    if (!redirectMatch) return null
    const target = redirectMatch[1].trim()
    // Reject leading slashes and path traversal — both can escape the /w/ prefix in view.js
    const isSafe = target.length > 0
        && !target.startsWith('/')
        && !/(?:^|\/)\.\.(?:\/|$)/.test(target)
    return isSafe ? target : null
}

function parseAndPreprocess(input) {
    const { tokens } = lexer.tokenize(input)
    const cst = parser.parse(tokens)
    if (parser.errors.length > 0) {
        logger.error('WikiParser errors: ' + JSON.stringify(parser.errors))
        return null
    }
    const preprocessVisitor = new PreprocessVisitor()
    try {
        preprocessVisitor.visit(cst)
    } catch (e) {
        logger.error('PreprocessVisitor error: ' + e.message)
        return null
    }
    return { cst, manifest: preprocessVisitor.manifest }
}

async function resolveFilesRepo(requests, fileRepository, macroQueryResult) {
    const filenames = requests.map(r => r.query.filename)
    const found = await fileRepository.findByFilenameBatch(filenames)
    const foundByName = Object.fromEntries(found.map(f => [f.filename, f]))
    macroQueryResult.files = {}
    for (const r of requests) {
        macroQueryResult.files[r.query.filename] = foundByName[r.query.filename] ?? null
    }
}

async function resolvePagesRepo(pageRepository, macroQueryResult) {
    macroQueryResult.pages = { total: await pageRepository.count() }
}

async function resolveIncludesRepo(requests, pageRepository, repositories, renderOptions, macroQueryResult) {
    macroQueryResult.includes = {}
    if (renderOptions?.isTemplate) return
    // Parse args once per request to avoid redundant work
    const parsedRequests = requests.map(r => ({ r, args: findMacroArgs(r.query.args) }))
    const pagenames = [...new Set(parsedRequests.map(p => p.args.default).filter(Boolean))]
    const foundIncludePages = pagenames.length > 0
        ? await pageRepository.findManyByTitles(pagenames)
        : []
    const includePagesByTitle = Object.fromEntries(foundIncludePages.map(p => [p.title, p]))
    await Promise.all(parsedRequests.map(async ({ r, args }) => {
        const { default: pagename, ...rawArgs } = args
        const page = pagename ? (includePagesByTitle[pagename] ?? null) : null
        if (!page) { macroQueryResult.includes[r.query.args] = null; return }
        const renderedArgs = Object.fromEntries(
            await Promise.all(
                Object.entries(rawArgs).map(async ([k, v]) => {
                    const rendered = await renderNew(v, { isTemplate: true }, repositories)
                    return [k, rendered.html ?? '']
                })
            )
        )
        macroQueryResult.includes[r.query.args] = await renderNew(
            page.content,
            { isTemplate: true, args: renderedArgs },
            repositories
        )
    }))
}

async function resolvePageRefsAndMacros(pageRefs, macroRequests, repositories, renderOptions) {
    const { pages: pageRepository, files: fileRepository } = repositories
    const requestsByRepo = {}
    for (const req of macroRequests) {
        if (!requestsByRepo[req.repo]) requestsByRepo[req.repo] = []
        requestsByRepo[req.repo].push(req)
    }
    const macroQueryResult = {}
    const repoPromises = Object.entries(requestsByRepo).map(([repo, requests]) => {
        switch (repo) {
            case 'files':    return resolveFilesRepo(requests, fileRepository, macroQueryResult)
            case 'pages':    return resolvePagesRepo(pageRepository, macroQueryResult)
            case 'includes': return resolveIncludesRepo(requests, pageRepository, repositories, renderOptions, macroQueryResult)
        }
    })
    // for performance reasons we only query pageRefs if <=1024.
    const [foundPageModels] = await Promise.all([
        pageRefs.size > 0 && pageRefs.size <= 1024
            ? pageRepository.findByTitleBatch(Array.from(pageRefs))
            : Promise.resolve([]),
        ...repoPromises
    ])
    const foundTitles = new Set(foundPageModels.map(m => m.title))
    const missingPages = new Set([...pageRefs].filter(x => !foundTitles.has(x)))
    return { missingPages, macroQueryResult }
}

export async function renderNew(input, renderOptions, repositories, canRedirect = true) {
    const begin = applyHooks(global.hooks.beginRender, input, renderOptions, repositories, canRedirect)
    input = begin.input
    renderOptions = begin.renderOptions
    repositories = begin.repositories
    canRedirect = begin.canRedirect

    const redirectTarget = checkRedirect(input, canRedirect)
    if (redirectTarget !== null) return { result: 'redirect', html: redirectTarget }

    const parsed = parseAndPreprocess(input)
    if (!parsed) return { result: 'error', html: errString }
    const { cst, manifest } = parsed

    const { missingPages, macroQueryResult } = await resolvePageRefsAndMacros(
        manifest.pageRefs, manifest.macroRequests, repositories, renderOptions)

    const visitor = new HTMLVisitor(manifest, {
        edit: 'Edit',
        toc: 'Table of Contents',
        footnotes: 'Footnotes',
        page404: 'No such page'
    }, missingPages, macroQueryResult, renderOptions)

    let html
    try {
        html = visitor.visit(cst)
    } catch (e) {
        logger.error('HTMLVisitor error: ' + e.message + e.stack)
        return { result: 'error', html: errString }
    }

    for (const f of global.hooks.endRender) {
        f(input, renderOptions, repositories, canRedirect)
    }

    html = sanitizeHtml(html, global.sanitiseOptions)
    return { result: 'ok', html }
}
