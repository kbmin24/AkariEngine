const express = require('express')
const app = express()
const paths = require('./utils/paths')
const config = require('./config')
const logger = require('./utils/logger.js')
const { createSequelizeInstance } = require('./config/database')
const RepositoryFactory = require('./repositories')
const ServiceFactory = require('./services')
const path = require('node:path')

global.path = config.basePath
global.conf = config.settings

const port = config.port

//Legacy ways to access settings. Deprecated.
global.appname = config.appName
global.licence = config.license
global.dtFormat = config.dateTimeFormat

global.copyrightNotice = `이 문서를 편집함으로써 당신은 ${config.appName}가 당신의 기여를 ${config.license} 하에 배포하는 데에 동의하는 것입니다. 이 동의는 철회할 수 없습니다.`
global.perms = ['admin', 'board', 'block', 'grant', 'acl', 'deletepage', 'deletefile', 'developer', 'loginhistory', 'bypasscaptcha', 'thread']

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
const session = require('express-session')
const cookieParser = require('cookie-parser')
const sessionStore = require('express-session-sequelize')(session.Store)
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
        maxAge: 30 * 86400 * 1000
    }
})
app.use(sess)

//CSRF
// TODO deprecated package, replace it
const csurf = require('csurf')
const csrfProtection = csurf({})
global.csrfProtection = csrfProtection

app.use(express.json({ limit: "1mb" }))
app.use(express.urlencoded({ limit: "1mb", extended: false }))

app.disable('x-powered-by')

//db
const users = require('./models/user.model.js')(sequelize)
const pages = require('./models/page.model.js')(sequelize)
const recentchanges = require('./models/recentchanges.model.js')(sequelize)
const history = require('./models/history.model.js')(sequelize)
const mfile = require('./models/file.model.js')(sequelize)
const perm = require('./models/perm.model.js')(sequelize)
const protect = require('./models/protect.model.js')(sequelize)
const adminlog = require('./models/adminlog.model.js')(sequelize)
const block = require('./models/block.model.js')(sequelize)
const loginhistory = require('./models/loginhistory.model.js')(sequelize)
const category = require('./models/category.model.js')(sequelize)
const settings = require('./models/setting.model.js')(sequelize)
const viewcount = require('./models/viewcount.model.js')(sequelize)
const updateTime = require('./models/updateTime.model.js')(sequelize)
const thread = require('./models/thread.model.js')(sequelize)
const threadcomment = require('./models/threadcomment.model.js')(sequelize)
const recentdiscuss = require('./models/recentdiscuss.model.js')(sequelize)
const links = require('./models/links.model.js')(sequelize)
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
const services = new ServiceFactory(repositories)
app.locals.repositories = repositories
app.locals.services = services

global.sequelize = sequelize

//task scheduler
require('./taskScheduler.js')()

global.sanitiseOptions = config.sanitizeOptions

//i18n -- Global (Non-skin)
const i18n = require("i18n");
i18n.configure({
    locales: ['ko_KR', 'en_GB'],
    defaultLocale: config.defaultLocale,
    directory: paths.locales,
    objectNotation: true
});

//regex for testing whether page title is legal or not
global.legalTitleRegex = /^[^[\]{}|#\n]*$/m

//load global tools
global.escapeHTML = require('./utils/escapeHTML.js')

//views
app.set('view engine', 'ejs')
app.set('views', paths.views)

// Private Mode?
app.use((req, res, next) => {
    const url = req.url.trim()

    // Check whether private mode is enabled
    if (!config.isPrivate) return next()

    if (req.session.username !== undefined) {
        //Logged in
        return next()
    }

    if (url.startsWith('/login')) {
        //Login Route
        return next()
    }

    if (url.startsWith('/css') || url.startsWith('/js') || url.startsWith('/lib') || url.startsWith('/robots.txt') || url.startsWith('/skins/') || url.startsWith('favicon.ico')) {
        // Required lib
        return next()
    }

    if (url.startsWith('/signup')) {
        return require('./utils/error.js')(req, res, {
            description: global.i18n.__('signupdisabled'),
            returnLink: '/login',
            returnName: i18n.__('loginpage'),
            statusCode: 403
        })
    }

    return require('./utils/error.js')(req, res, {
        description: global.i18n.__('loginneeded'),
        returnLink: '/login',
        returnName: i18n.__('loginpage'),
        statusCode: 403
    })
})

app.use(express.static(paths.public))

//skins
global.skins = []
config.skins.forEach(e => {
    app.use(`/skins/${e}`, express.static(paths.resolve('skins', e, 'public')))
    let skinSettings = require(paths.resolve(path.join(`skins/${e}/` + 'skinSettings.json')))
    let skinManifest = require(paths.resolve(path.join(`./skins/${e}/` + 'manifest.json')))
    global.skins.push({ 'name': e, 'settings': skinSettings, 'manifest': skinManifest })
})

//Extension
let ext = require('./extensions/extensionManager.js')
ext(app)


//Middlewares
app.use((req, res, next) => {
    // init'ise i18n
    i18n.init(req, res)

    // inject IP address, also considering for proxy...
    req.ipAddress = (req.headers['x-forwarded-for'] || req.socket.remoteAddress)

    next()
})

//Register routes
require('./routes')(app, services, { csrfProtection })


const fileLimit = (global.conf.upload_maxsize_mb ? global.conf.upload_maxsize_mb : 4)

app.get('/lovelive', (req, res) => {
    res.send('<h1><b style="color:#FB217F">LoveLive!!</b></h1>')
    return
})

const { errorHandler } = require('./middlewares/errorHandler')
app.use(errorHandler)

//error handler
// TODO split this into new error handler
app.use((err, req, res, _next) => {
    logger.error('Unhandled request error', err)
    switch (err.code) {
        case 'FILENAMENULL':
            {
                require('./utils/error.js')(req, res, {
                    description: '파일 이름이 비어 있습니다.',
                    returnLink: 'javascript:window.history.back()',
                    returnName: '이전 페이지',
                    statusCode: 400
                })
            }
            break
        case 'FILEEXISTS':
            {
                require('./utils/error.js')(req, res, {
                    description: '파일이 이미 존재합니다. 다른 파일명으로 다시 시도해 주세요.',
                    returnLink: 'javascript:window.history.back()',
                    returnName: '이전 페이지',
                    statusCode: 400
                })
            }
            break
        case 'BOARD_LIMIT_FILE_SIZE':
            {
                res.send(
                    {
                        'error':
                        {
                            'message': err.toString()
                        }
                    }
                )
            }
            break
        case 'BOARDUPLOAD_BADEXTENSION':
            {
                res.send({
                    'error':
                    {
                        'message': err.toString()
                    }
                })
            }
            break
        case 'LIMIT_FILE_SIZE':
            {
                require('./utils/error.js')(req, res, {
                    description: `선택된 파일의 크기가 너무 큽니다. 파일은 최대 ${fileLimit}MB여야 합니다.`,
                    returnLink: 'javascript:window.history.back()',
                    returnName: '이전 페이지',
                    statusCode: 400
                })
            }
            break
        default:
            {
                logger.error('Unhandled default error branch', err)
                res.status(500).send(err.toString())
            }
            break
    }
})

// Put server on
// maybe we should support ipv6 in the future but I don't have any way to test it...
const server = app.listen(port, '0.0.0.0', () => {
    const host = server.address().address
    const port = server.address().port
    logger.info(`App listening at http://${host}:${port}`)
})

//Console
const io = require('socket.io')(server)
io.use(require('express-socket.io-session')(sess, { autoSave: true }))

io.on('connection', async socket => {
    socket.on('joinRoom', async data => {
        if (data.notAThread === true && data.roomId === 'developerconsole') {
            //developer console.
            let username = socket.handshake.session.username
            if (await perm.findOne({ where: { username: username, perm: 'developer' } })) {
                await socket.join('developerconsole')
                await socket.emit('joinok')
                socket.emit('output', 'AkariEngine 3.0\nCopyright Kyubin Min 2021-2023. Distributed under GNU AGPL.\n\nType \'help\' for the list of commands.\n')
            }
        }
        else {
            socket.join(data.roomId)
        }
    })
    socket.on('message', async data => {
        if (!data.message) return
        let username = socket.handshake.session.username
        let IP = socket.handshake.headers['x-real-ip'] || socket.handshake.address

        //get username
        let doneBy = username ? username : IP

        data.username = doneBy
        let ipblock = await block.findOne({ where: { target: IP } })
        if (ipblock) {
            if (!username) return
            if (!ipblock.allowLogin) return
        }
        if (username && await block.findOne({ where: { target: username } })) return

        //put in DB
        await threadcomment.create(
            {
                type: 'comment',
                threadID: data.roomId,
                doneBy: doneBy,
                content: data.message,
                isHidden: false
            }
        )
        let t = await thread.findOne(
            {
                where: { threadID: data.roomId }
            })

        //RD should be unique
        await recentdiscuss.destroy(
            {
                where: { threadID: data.roomId }
            })

        //And PUT
        await recentdiscuss.create(
            {
                threadname: t.threadTitle,
                threadID: data.roomId,
                pagename: t.pagename
            }
        )

        //render to wikitext
        data.message = await require('./pages/render.js')('', data.message, true, pages, mfile, null, null, false, true, {}, {})
        io.sockets.in(data.roomId).emit('message', data)
    })
    socket.on('input', async data => {
        await require('./admin/command.js')(io, socket, data.command, { perm: perm, file: mfile, pages: pages, history: history, category: category })
    })
})
