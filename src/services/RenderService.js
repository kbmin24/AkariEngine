import sanitizeHtml from 'sanitize-html'
import { WikiParser } from '../utils/wikimark/wikiparser.js'
import { HTMLVisitor } from '../utils/wikimark/HTMLVisitor.js'
import { PreprocessVisitor } from '../utils/wikimark/PreprocessVisitor.js'
import { lexer } from '../utils/wikimark/lexer.js'
import { findMacroArgs } from '../utils/wikimark/macro.js'
import logger from '../utils/logger.js'

const parser = new WikiParser()
const errString = '<span style="color:red;font-weight:bold;">Parser crashed</span>'

// Render pipeline: RenderService -> Parser -> PreprocessVisitor -> HTMLVisitor

/**
 * Converts raw wikimark source into sanitised HTML.
 *
 * 1. Process pre-render extension hooks.
 * 2. Determine if the input is a redirect directive and return early if so.
 * 3. Lexing and parsing to prduct a CST.
 * 4. PreprocessVisitor collects elements that require async lookups.
 * 5. async lookups from (4) are resolved.
 * 6. HTMLVisitor traverses CST to produce HTML.
 * 7. Process post-render extension hooks.
 * 8. sanitize-html sanitises the output.
 */
class RenderService {
    constructor(pageRepository, fileRepository) {
        this.pageRepository = pageRepository
        this.fileRepository = fileRepository
    }

    // applies extension hooks
    applyHooks(hooks, input, renderOptions, canRedirect) {
        for (const f of hooks) {
            const res = f(input, renderOptions, canRedirect)
            input = res?.input ?? input
            renderOptions = res?.renderOptions ?? renderOptions
            canRedirect = res?.canRedirect ?? canRedirect
        }
        return { input, renderOptions, canRedirect }
    }

    checkRedirect(input, canRedirect) {
        if (!canRedirect) return null
        const redirectMatch = /^#redirect\s+(.+)$/i.exec(input.trim())
        if (!redirectMatch) return null
        const target = redirectMatch[1].trim()
        const isSafe = target.length > 0
            && !target.startsWith('/')
            && !/(?:^|\/)\.\.(?:\/|$)/.test(target)
        return isSafe ? target : null
    }

    // lexer + parser + preprocessVisitor
    parseAndPreprocess(input) {
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

    // resolves file() macro as identified by PreprocessVisitor
    // returns to macroQueryResult.files.
    async resolveFilesRepo(requests, macroQueryResult) {
        const filenames = requests.map(r => r.query.filename)
        const found = await this.fileRepository.findByFilenameBatch(filenames)
        const foundByName = Object.fromEntries(found.map(f => [f.filename, f]))
        macroQueryResult.files = {}
        for (const r of requests) {
            macroQueryResult.files[r.query.filename] = foundByName[r.query.filename] ?? null
        }
    }

    // resolves pagecount.
    async resolvePagesRepo(macroQueryResult) {
        macroQueryResult.pages = { total: await this.pageRepository.count() }
    }

    // resolves include. saves to macroQueryResult.includes.
    async resolveIncludesRepo(requests, renderFunction, renderOptions, macroQueryResult) {
        macroQueryResult.includes = {}
        if (renderOptions?.isTemplate) return
        const parsedRequests = requests.map(r => ({ r, args: findMacroArgs(r.query.args) }))
        const pagenames = [...new Set(parsedRequests.map(p => p.args.default).filter(Boolean))]
        const foundIncludePages = pagenames.length > 0
            ? await this.pageRepository.findManyByTitles(pagenames)
            : []
        const includePagesByTitle = Object.fromEntries(foundIncludePages.map(p => [p.title, p]))
        await Promise.all(parsedRequests.map(async ({ r, args }) => {
            const { default: pagename, ...rawArgs } = args
            const page = pagename ? (includePagesByTitle[pagename] ?? null) : null
            if (!page) { macroQueryResult.includes[r.query.args] = null; return }
            const renderedArgs = Object.fromEntries(
                await Promise.all(
                    Object.entries(rawArgs).map(async ([k, v]) => {
                        const rendered = await this.render(v, renderFunction, { isTemplate: true })
                        return [k, rendered.html ?? '']
                    })
                )
            )
            macroQueryResult.includes[r.query.args] = await this.render(
                page.content,
                renderFunction,
                { isTemplate: true, args: renderedArgs }
            )
        }))
    }

    // resolves all async requests.
    // returns { missingPages: Set<string>, macroQueryResult: object }
    async resolvePageRefsAndMacros(pageRefs, macroRequests, renderFunction, renderOptions) {
        const requestsByRepo = {}
        for (const req of macroRequests) {
            if (!requestsByRepo[req.repo]) requestsByRepo[req.repo] = []
            requestsByRepo[req.repo].push(req)
        }
        const macroQueryResult = {}
        const repoPromises = Object.entries(requestsByRepo).map(([repo, requests]) => {
            switch (repo) {
                case 'files':    return this.resolveFilesRepo(requests, macroQueryResult)
                case 'pages':    return this.resolvePagesRepo(macroQueryResult)
                case 'includes': return this.resolveIncludesRepo(requests, renderFunction, renderOptions, macroQueryResult)
            }
        })
        
        // wikilink check
        const [foundPageModels] = await Promise.all([
            pageRefs.size > 0 && pageRefs.size <= 1024
                ? this.pageRepository.findByTitleBatch(Array.from(pageRefs))
                : Promise.resolve([]),
            ...repoPromises
        ])
        const foundTitles = new Set(foundPageModels.map(m => m.title))
        const missingPages = new Set([...pageRefs].filter(x => !foundTitles.has(x)))
        return { missingPages, macroQueryResult }
    }

    /**
     * Renders wikimark source text into sanitised HTML.
     *
     * Return value shape:
     * - `{ result: 'ok',       html: string }` — successful render.
     * - `{ result: 'redirect', html: string }` — input was a redirect directive;
     *   `html` contains the target page title.
     * - `{ result: 'error',   html: string }` — parser or visitor crashed;
     *   `html` contains a styled error placeholder.
     *
     * @param {string} input - Raw wikimark source text.
     * @param {Function} renderFunction i18n render function that accepts i18n key.
     * @param {object} [renderOptions] Options forwarded to visitors and macro resolvers. For more information, see `HTMLVisitor`.
     * @param {boolean} [canRedirect=true] Whether `#redirect` directives should be followed.
     * @returns {Promise<{ result: 'ok'|'redirect'|'error', html: string }>}
     */
    async render(input, renderFunction, renderOptions, canRedirect = true) {
        const begin = this.applyHooks(global.hooks.beginRender, input, renderOptions, canRedirect)
        input = begin.input
        renderOptions = begin.renderOptions
        canRedirect = begin.canRedirect

        const redirectTarget = this.checkRedirect(input, canRedirect)
        if (redirectTarget !== null) return { result: 'redirect', html: redirectTarget }

        const parsed = this.parseAndPreprocess(input)
        if (!parsed) return { result: 'error', html: errString }
        const { cst, manifest } = parsed

        const { missingPages, macroQueryResult } = await this.resolvePageRefsAndMacros(
            manifest.pageRefs, manifest.macroRequests, renderFunction, renderOptions)

        const visitor = new HTMLVisitor(manifest, {
            edit: renderFunction('edit'),
            toc: renderFunction('toc'),
            footnotes: renderFunction('footnotes'),
            nsPage: renderFunction('nsPage')
        }, missingPages, macroQueryResult, renderOptions)

        let html
        try {
            html = visitor.visit(cst)
        } catch (e) {
            logger.error('HTMLVisitor error: ' + e.message + e.stack)
            return { result: 'error', html: errString }
        }

        this.applyHooks(global.hooks.endRender, input, renderOptions, canRedirect)

        html = sanitizeHtml(html, global.sanitiseOptions)
        return { result: 'ok', html }
    }
}

export default RenderService
