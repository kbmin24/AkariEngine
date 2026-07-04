import express from 'express'
const app = express()
import paths from './src/utils/paths.js'
import config from './src/config/index.js'
import logger from './src/utils/logger.js'
import { createSequelizeInstance } from './src/config/database.js'
import RepositoryFactory from './src/repositories/index.js'
import ServiceFactory from './src/services/index.js'
import path from 'node:path'
import fs from 'node:fs'
import session from 'express-session'
import cookieParser from 'cookie-parser'
import sessionStoreFactory from 'express-session-sequelize'
import { doubleCsrf } from 'csrf-csrf'
import i18n from 'i18n'
import taskScheduler from './src/taskScheduler.js'
import escapeHTML from './src/utils/escapeHTML.js'
import { normalizeIpAddress } from './src/utils/ipTools.js'
import { PageNotFoundError, PermissionDeniedError } from './src/services/errors.js'
import registerRoutes from './src/routes/index.js'
import { initMeilisearch } from './src/utils/meilisearchClient.js'
import { createRateLimiter } from './src/utils/rateLimit.js'
import registerSocketServer from './src/socket/index.js'


global.path = config.basePath
global.conf = config.settings

const port = config.port
const privateModeAllowedExactRoutes = new Set([
    '/api/login',
    '/robots.txt',
    '/favicon.ico',
    '/api/me',
    '/api/csrf-token'
])
const privateModeAllowedRoutePrefixes = [
    '/css/',
    '/js/',
    '/lib/',
    '/skins/'
]

//Legacy ways to access settings. Deprecated.
global.appname = config.appName
global.licence = config.license
global.dtFormat = config.dateTimeFormat

global.perms = ['admin', 'board', 'block', 'grant', 'acl', 'purgepage', 'developer', 'loginhistory', 'bypasscaptcha', 'thread']

//initialise db
let sequelize = null
try {
    sequelize = createSequelizeInstance()
} catch (error) {
    logger.error('Invalid DB type.', error)
    process.exit(1)
}

//session
const secret = config.sessionSecret
const sessionStore = sessionStoreFactory(session.Store);
const sequelizeSessionStore = new sessionStore({ db: sequelize })
app.use(cookieParser(secret))
const sess = session({
    proxy: true,
    resave: false,
    saveUninitialized: false,
    secret: secret,
    store: sequelizeSessionStore,
    name: 'akari',
    expires: new Date(Date.now() + (30 * 86400 * 1000)), //expires after 30 days
    cookie:
    {
        secure: config.ssl,
        samesite: 'strict',
        httpOnly: true, //so that the cookie cannot be taken away
        maxAge: 30 * 86400 * 1000,
        sameSite: 'lax'
    }
})
app.use(sess)

//CSRF
const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
    getSecret: () => secret,
    getSessionIdentifier: (req) => req.session?.id ?? req.ip,
    cookieName: 'x-csrf-token',
    cookieOptions: {
        sameSite: 'lax',
        secure: config.ssl,
        httpOnly: true,
    },
    getCsrfTokenFromRequest: (req) => req.headers['x-csrf-token'] ?? req.body?._csrf,
})

app.use((req, res, next) => {
    req.csrfToken = () => generateCsrfToken(req, res)
    if (!req.session.initialized) {
        req.session.initialized = true
        req.session.save(next)
    } else {
        next()
    }
})

app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ limit: "1mb", extended: false }))

app.disable('x-powered-by')
app.set('trust proxy', 'loopback')

// CORS for Nuxt dev server
if (config.isDevelopment) {
    const nuxtOrigin = config.settings.nuxtDevUrl || 'http://localhost:3000'
    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', nuxtOrigin)
        res.setHeader('Access-Control-Allow-Credentials', 'true')
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-csrf-token')
        if (req.method === 'OPTIONS') return res.sendStatus(204)
        next()
    })
}

//db
import usersFactory from './src/models/user.model.js'

const users = usersFactory(sequelize);
import pagesFactory from './src/models/page.model.js'
const pages = pagesFactory(sequelize);
import recentchangesFactory from './src/models/recentchanges.model.js'
const recentchanges = recentchangesFactory(sequelize);
import historyFactory from './src/models/history.model.js'
const history = historyFactory(sequelize);
import mfileFactory from './src/models/file.model.js'
const mfile = mfileFactory(sequelize);
import permFactory from './src/models/perm.model.js'
const perm = permFactory(sequelize);
import protectFactory from './src/models/protect.model.js'
const protect = protectFactory(sequelize);
import adminlogFactory from './src/models/adminlog.model.js'
const adminlog = adminlogFactory(sequelize);
import blockFactory from './src/models/block.model.js'
const block = blockFactory(sequelize);
import loginhistoryFactory from './src/models/loginhistory.model.js'
const loginhistory = loginhistoryFactory(sequelize);
import categoryFactory from './src/models/category.model.js'
const category = categoryFactory(sequelize);
import settingsFactory from './src/models/setting.model.js'
const settings = settingsFactory(sequelize);
import viewcountFactory from './src/models/viewcount.model.js'
const viewcount = viewcountFactory(sequelize);
import updateTimeFactory from './src/models/updateTime.model.js'
const updateTime = updateTimeFactory(sequelize);
import threadFactory from './src/models/thread.model.js'
const thread = threadFactory(sequelize);
import threadcommentFactory from './src/models/threadcomment.model.js'
const threadcomment = threadcommentFactory(sequelize);
import recentdiscussFactory from './src/models/recentdiscuss.model.js'
const recentdiscuss = recentdiscussFactory(sequelize);
import linksFactory from './src/models/links.model.js'
const links = linksFactory(sequelize);
sequelize.sync()

global.db =
{
    users: users,
    pages: pages,
    recentchanges: recentchanges,
    history: history,
    mfile: mfile,
    perm: perm,
    protect: protect,
    adminlog: adminlog,
    block: block,
    loginhistory: loginhistory,
    category: category,
    settings: settings,
    viewcount: viewcount,
    updateTime: updateTime,
    thread: thread,
    threadcomment: threadcomment,
    recentdiscuss: recentdiscuss,
    links: links
}

const repositories = new RepositoryFactory(global.db)
const msIndex = config.settings.meilisearch?.enabled
    ? await initMeilisearch(config.settings.meilisearch)
    : null
const services = new ServiceFactory(repositories, { msIndex })
app.locals.repositories = repositories
app.locals.services = services

global.sequelize = sequelize

//task scheduler
taskScheduler()

global.sanitiseOptions = config.sanitiseOptions

//i18n -- Global (Non-skin)
i18n.configure({
    locales: ['ko_KR', 'en_GB'],
    defaultLocale: config.defaultLocale,
    directory: paths.locales,
    objectNotation: true
})

//regex for testing whether page title is legal or not
global.legalTitleRegex = /^[^[\]{}|#\n]{1,255}$/m
global.legalFilenameRegex = /^[^#?\\/<>:*|,]{1,255}$/m

//load global tools
global.escapeHTML = escapeHTML

//views
app.set('view engine', 'ejs')
app.set('views', paths.views)

app.use(createRateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 2 * 15 * 60, // 2 requests per second
    // only include rate heavy paths here
    // not necessary ones like /login
    skipPaths: [
        '/css/',
        '/js/',
        '/lib/',
        '/skins/',
        '/uploads/',
        '/api/user/exists',
        '/api/user/info/',
        '/api/me'
    ],
    skipExactPaths: [
        '/favicon.ico',
        '/robots.txt'
    ]
}))

// Other Middlewares
app.use((req, res, next) => {
    // init'ise i18n
    i18n.init(req, res)

    req.ipAddress = normalizeIpAddress(req.ip)

    next()
})


// Private Mode?
app.use((req, res, next) => {
    const url = new URL(req.originalUrl || req.url, 'http://localhost').pathname

    // Check whether private mode is enabled
    if (!config.isPrivate) return next()

    if (req.session.username !== undefined) {
        //Logged in
        return next()
    }

    const isPrivateModeAllowedRoute = privateModeAllowedExactRoutes.has(url)
        || privateModeAllowedRoutePrefixes.some(route => url.startsWith(route))

    if (url.startsWith('/api/signup')) {
        throw new PermissionDeniedError('other', null, {
            message: 'Signup is disabled in private mode',
            i18nKey: 'pvtmodeSignupDisabled'
        })
    }

    if (isPrivateModeAllowedRoute) return next()

    throw new PermissionDeniedError('other', null, {
        i18nKey: "loginneeded",
        message: 'Login is required to access this page'
    })
})

app.use(express.static(paths.public))
app.use('/uploads', express.static(paths.uploads))

//skins
global.skins = []
config.skins.forEach(e => {
    app.use(`/skins/${e}`, express.static(paths.resolve('skins', e, 'public')))
    const skinSettingsPath = paths.resolve(path.join(`skins/${e}/` + 'skinSettings.json'))
    const skinManifestPath = paths.resolve(path.join(`./skins/${e}/` + 'manifest.json'))
    let skinSettings = JSON.parse(fs.readFileSync(skinSettingsPath, 'utf8'))
    let skinManifest = JSON.parse(fs.readFileSync(skinManifestPath, 'utf8'))
    global.skins.push({ 'name': e, 'settings': skinSettings, 'manifest': skinManifest })
})

//Extension
import ext from './extensions/extensionManager.js'

ext(app)

// Root redirect (for standalone Express access)
app.get('/', (req, res) => res.redirect('/w/FrontPage'))

// Auth info endpoint
app.get('/api/me',
    createRateLimiter({
        windowMs: 15 * 60 * 1000,
        limit: 15 * 60
    }),
    async (req, res) => {
        const username = req.session.username || null
        const ipAddress = req.ipAddress
        if (!username) return res.json({ username: null, ipAddress, isAdmin: false, permissions: [], skin: null })
        try {
            const { permission, user } = req.app.locals.services
            const [permChecks, skin] = await Promise.all([
                Promise.all((global.perms || []).map(async p => ({ p, ok: await permission.hasPermission(username, p) }))),
                user.getSkin(username),
            ])
            const permissions = permChecks.filter(x => x.ok).map(x => x.p)
            const isAdmin = permissions.includes('admin')
            res.json({ username, ipAddress, isAdmin, permissions, skin })
        } catch {
            res.json({ username, ipAddress, isAdmin: false, permissions: [], skin: null })
        }
    })

// CSRF token endpoint
app.get('/api/csrf-token', doubleCsrfProtection, (req, res) => {
    res.setHeader('Cache-Control', 'no-store')
    const csrfToken = req.csrfToken({ overwrite: true })
    res.json({ csrfToken })
})

//Register routes
registerRoutes(app, services, { csrfProtection: doubleCsrfProtection })

import { errorHandler } from './src/middlewares/errorHandler.js'

app.use((req, res, next) => {
    next(new PageNotFoundError(`${req.method} ${req.path}`))
})

app.use(errorHandler)

//error handler
app.use((err, req, res, _next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        logger.warn('Possible CSRF attack detected from IP: ' + req.ipAddress)
        return res.status(403).json({ error: true, i18nKey: 'csrfMessage' })
    }
    logger.error('Unhandled request error', err)
    res.status(500).json({ error: true, message: 'Internal server error' })
})

// Put server on
// maybe we should support ipv6 in the future but I don't have any way to test it...
const server = app.listen(port, '0.0.0.0', () => {
    const host = server.address().address
    const port = server.address().port
    logger.info(`App listening at http://${host}:${port}`)
})

registerSocketServer({
    server,
    app,
    sessionMiddleware: sess,
    services,
    logger
})
