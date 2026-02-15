/* eslint-disable no-unused-vars */
const express = require('express')
const app = express()
const paths = require('./utils/paths')
const config = require('./config')
const logger = require(paths.utils('logger'))
const { createSequelizeInstance } = require('./config/database')
const RepositoryFactory = require('./repositories')
const ServiceFactory = require('./services')

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
const sequelizeSessionStore = new sessionStore({db: sequelize})
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

app.use(express.json({limit : "1mb"}))
app.use(express.urlencoded({limit : "1mb", extended: false}))

app.disable('x-powered-by')

//db
const users = require(paths.model('user'))(sequelize)
const pages = require(paths.model('page'))(sequelize)
const recentchanges = require(paths.model('recentchanges'))(sequelize)
const history = require(paths.model('history'))(sequelize)
const mfile = require(paths.model('file'))(sequelize)
const perm = require(paths.model('perm'))(sequelize)
const protect = require(paths.model('protect'))(sequelize)
const adminlog = require(paths.model('adminlog'))(sequelize)
const block = require(paths.model('block'))(sequelize)
const loginhistory = require(paths.model('loginhistory'))(sequelize)
const category = require(paths.model('category'))(sequelize)
const settings = require(paths.model('setting'))(sequelize)
const viewcount = require(paths.model('viewcount'))(sequelize)
const updateTime = require(paths.model('updateTime'))(sequelize)
const thread = require(paths.model('thread'))(sequelize)
const threadcomment = require(paths.model('threadcomment'))(sequelize)
const recentdiscuss = require(paths.model('recentdiscuss'))(sequelize)
const links = require(paths.model('links'))(sequelize)
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
require(paths.resolve('taskScheduler.js'))()

global.sanitiseOptions = config.sanitizeOptions

//i18n -- Global (Non-skin)
global.i18n = require("i18n");
global.i18n.configure({
    locales: ['ko_KR', 'en_GB'],
    defaultLocale: config.defaultLocale,
    directory: paths.locales,
    objectNotation: true
  });
const i18n = global.i18n

//regex for testing whether page title is legal or not
global.legalTitleRegex = /^[^\[\]\{\}\|#\n]*$/m

//load global tools
global.escapeHTML = require(paths.resolve('tools', 'escapeHTML.js'))

const dateandtime = require('date-and-time')

//views
const ejs = require('ejs')
app.set('view engine', 'ejs')
app.set('views', paths.views)
const load = (...segments) => require(paths.resolve(...segments))
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
const renderLayout = (req, res, renderOpt) => load('view.js')(req, res, renderOpt)
const delegate = (moduleSegments, argsFactory = () => []) => asyncRoute(async (req, res) => {
    const handler = load(...moduleSegments)
    const args = argsFactory(req, res)
    await handler(req, res, ...args)
})

async function renderTemplateInLayout(req, res, templatePath, templateData, layoutData) {
    const html = await ejs.renderFile(paths.view(templatePath), templateData)
    renderLayout(req, res, {
        ...layoutData,
        content: html
    })
}

// Private Mode?
app.use((req, res, next) => {
    const url = req.url.trim()

    // Check whether private mode is enabled
    if (!config.isPrivate) return next()

    if (req.session.username !== undefined)
    {
        //Logged in
        return next()
    }

    if (url.startsWith('/login'))
    {
        //Login Route
        return next()
    }

    if (url.startsWith('/css') || url.startsWith('/js') || url.startsWith('/lib') || url.startsWith('/robots.txt') || url.startsWith('/skins/') || url.startsWith('favicon.ico'))
    {
        // Required lib
        return next()
    }

    if (url.startsWith('/signup'))
    {
        return load('error.js')(req, res, null, '계정 생성이 비활성화되어 있습니다.', '/login', '로그인 페이지', 403, 'ko')
    }

    return load('error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 403, 'ko')
})

app.use(express.static(paths.public))

//skins
global.skins = []
config.skins.forEach(e => {
    app.use(`/skins/${e}`, express.static(paths.resolve('skins', e, 'public')))
    let skinSettings = require(paths.resolve('skins', e, 'skinSettings.json'))
    let skinManifest = require(paths.resolve('skins', e, 'manifest.json'))
    global.skins.push({'name': e, 'settings': skinSettings, 'manifest': skinManifest})
})

//Extension
let ext = require(paths.resolve('extensionManager.js'))
ext(app, ext)


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

app.get('/', (req, res) => {
    res.redirect('/w/FrontPage')
})

app.get('/Licence', asyncRoute(async (req, res) => {
    await renderTemplateInLayout(req, res, 'license.ejs', {}, { title: 'Licence' })
}))

app.get('/noEmail', asyncRoute(async (req, res) => {
    await renderTemplateInLayout(req, res, 'etc/noEmail.ejs', { l: res.__ }, { title: global.i18n.__('noEmail') })
}))

app.get('/signup', asyncRoute(async (req, res) => {
    const captchaSVG = await load('tools', 'captcha.js').genCaptcha(req)
    await renderTemplateInLayout(req, res, 'user/signup.ejs', { captcha: captchaSVG, l: global.i18n.__ }, {
        title: global.i18n.__('register'),
        username: req.session.username,
        ipaddr: req.ipAddress
    })
}))

app.post('/signup', (req, res) => {
    load('user', 'signup.js')(req, res, sequelize, users, perm)
})

app.get('/login', csrfProtection, asyncRoute(async (req, res) => {
    const username = req.session.username
    await renderTemplateInLayout(req, res, 'user/login.ejs', { csrfToken: req.csrfToken(), l: global.i18n.__ }, {
        title: global.i18n.__('login'),
        username,
        ipaddr: req.ipAddress
    })
}))

app.post('/login', csrfProtection, asyncRoute(async (req, res) => {
    load('user', 'login.js')(req, res, users, loginhistory)
}))

app.get('/logout', (req, res) => {
    req.session.regenerate(() => {})
    res.redirect('/')
})

app.get('/settings', csrfProtection, asyncRoute(async (req, res) => {
    const username = req.session.username ? req.session.username : null
    const sR = await settings.findOne({
        where:
        {
            user: username,
            key: 'sign'
        }
    })
    const sign = sR ? sR.value : ''
    await renderTemplateInLayout(req, res, 'user/settings.ejs', {
        csrfToken: req.csrfToken(),
        sign,
        username,
        l: global.i18n.__
    }, {
        title: global.i18n.__('settings'),
        username,
        ipaddr: req.ipAddress
    })
}))

app.post('/settings/:name(*)', csrfProtection, asyncRoute(async (req, res) => {
    load('user', 'settings.js')(req, res,
        {
            settings: settings,
            users: users
        })
}))


app.get('/revert/:name(*)', async (req, res) =>
{
    const username = req.session.username
    const pro = await protect.findOne({where: {title: req.params.name, task: 'edit'}})
    var acl = (pro == undefined ? 'blocked' : pro.protectionLevel) //fallback
    const r = await load('pages', 'satisfyACL.js')(req, res, [acl], perm, block)
    if (r)
    {
        //do nothing
    }
    else if (r === undefined)
    {
        return //error message already given out
    }
    else
    {
        load('error.js')(req, res, null, global.i18n.__('move_noacl', {acl: acl}), '/login', global.i18n.__('loginpage'), 403, 'ko')
        return
    }
    const p = await pages.findOne({where: {title: req.params.name}})
    if (!p)
    {
        load('error.js')(req, res, null, `${global.i18n.__('page404')} <a href="/edit/${req.params.name}">${global.i18n.__('page_asknew')}</a>`, '/', global.i18n.__('mainpage'), 404, 'ko')
        return
    }
    const captchaSVG = await load('tools', 'captcha.js').genCaptcha(req)
    ejs.renderFile(paths.view('pages/revert.ejs'),
    {
        pagename: req.params.name,
        l: global.i18n.__,
        username: username,
        rev: req.query.rev,
        captcha: captchaSVG
    }, (err, html) => 
    {
        if (err)
        {
            logger.error('Revert page rendering failed', err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        load('view.js')(req, res,
        {
            title: global.i18n.__('revert_title', {page: req.params.name, rev: req.query.rev}),
            content: html,
            username: username,
            ipaddr: req.ipAddress,
            
        })
    })
})
app.post('/revert/:name(*)', delegate(['pages', 'revert.js'], (req) => [req.session.username, users, pages, recentchanges, history, protect, perm, block]))
app.post('/w', asyncRoute(async (req,res) => {
    await res.redirect('/w/' + req.body.pagename)
}))
app.post('/preview', delegate(['pages', 'preview.js'], () => [pages, mfile, category]))
app.get('/search', delegate(['pages', 'search.js'], () => [pages]))
app.post('/search', delegate(['pages', 'navSearch.js'], () => [pages]))
app.get('/protect/:name(*)', delegate(['admin', 'protectGet.js'], () => [perm, protect, block]))
app.post('/protect/:name(*)', delegate(['admin', 'protectPost.js'], () => [perm, protect, pages, history, recentchanges, block]))
app.get('/raw/:name(*)', delegate(['pages', 'raw.js'], () => [pages, history, protect, perm, block]))
app.get('/history/:name(*)', delegate(['pages', 'history.js'], () => [history]))
app.get('/RecentChanges', asyncRoute(async (req, res) => {
    await renderTemplateInLayout(req, res, 'pages/recentchanges.ejs', { l: global.i18n.__ }, {
        title: global.i18n.__('recentChanges'),
        isPage: false,
        username: req.session.username,
        ipaddr: req.ipAddress
    })
}))
app.get('/PageList', delegate(['pages', 'pagelist.js'], () => [pages]))

app.get('/Upload', asyncRoute(async (req, res) => {
    const username = req.session.username
    const captchaSVG = await load('tools', 'captcha.js').genCaptcha(req)
    await renderTemplateInLayout(req, res, 'files/upload.ejs', {
        username: username,
        captcha: captchaSVG,
        filetypes: getFileTypes().join(', '),
        fileLimit: fileLimit
    }, {
        title: global.i18n.__('upload'),
        username: username,
        ipaddr: req.ipAddress
    })
}))
const multer = require('multer')
const fs = require('fs')
const e = require('express')
const default_filetypes = ['jpeg', 'jpg', 'jfif', 'png', 'gif', 'webp', 'svg']
function getFileTypes()
{
    if (global.conf.upload_types) return global.conf.upload_types
    else return default_filetypes
}
function getMimeTypes()
{
    //only returns the LAST PART of mime (after slash)
    if (global.conf.upload_mimes) return global.conf.upload_mimes
    else return getFileTypes()
}

function checkFileType(file, cb)
{
    //https://stackoverflow.com/questions/60408575/how-to-validate-file-extension-with-multer-middleware
    const ext = getFileTypes().includes(file.originalname.split(/\./).pop().toLowerCase())
    const mime = getMimeTypes().includes(file.mimetype.split(/\//).pop().toLowerCase())
    if (mime && ext)
    {
        return cb(null,true)
    }
    else
    {
        cb(`${getFileTypes().join(', ')}만 업로드 할 수 있습니다.`)
    }
}
var storage = multer.diskStorage({
    destination: (req, file, cb) => {cb(null, paths.resolve('public', 'uploads'))},
    filename: (req, file, cb) =>
    {
        if (req.body.filename == '')
        {
            let e = new Error('File name is null')
            e.code = 'FILENAMENULL'
            return cb(e)
        }
        try
        {
            //todo: refuse comma
            if (fs.existsSync(paths.resolve('public', 'uploads', req.body.filename)))
            {
                let e = new Error('파일이 이미 존재합니다.')
                e.code = 'FILEEXISTS'
                return cb(e)
            }
            else
            {
                cb(null, req.body.filename.trim()) //req.body.filename
            }
        }
        catch(err)
        {
            logger.error('Upload storage check failed', err)
            cb('Internal Server Error')
        }
    }
})

const axios = require('axios')
const { exit } = require('process')

var fileLimit = (global.conf.upload_maxsize_mb ? global.conf.upload_maxsize_mb : 4)

var upload = multer({
    storage: storage,
    limits:
    {
        fields: 3,
        fieldNameSize: 255,
        fileSize: fileLimit * 1024 * 1024
    },
    fileFilter: async (req, file, cb) =>
    {
        const username = req.session.username
        if (username === undefined)
        {
            load('error.js')(req, res, null, global.i18n.__('loginneeded'), '/login', global.i18n.__('loginpage'), 403, 'ko')
            return
        }
        const b = await block.findOne({where: {target: username, targetType: 'user'}})
        if (b)
        {
            if (b.isForever)
            {
                load('error.js')(req, res, null, `${b.doneBy}에 의해 영구적으로 차단된 상태입니다. (사유: ${b.comment})`, '/', '메인 페이지', 403, 'ko')
                return
            }
            else
            {
                load('error.js')(req, res, null, `${b.doneBy}에 의해 ${dateandtime.format(b.until, global.dtFormat)}까지 차단된 상태입니다. (사유: ${b.comment})`, '/', '메인 페이지', 403, 'ko')
                return
            }
        }
        if (req.session.username && (await perm.findOne({where: {perm: 'bypasscaptcha', username: req.session.username}})))
        {

        }
        else
        {
            const resKey = req.body['g-recaptcha-response']
            const url = `https://www.google.com/recaptcha/api/siteverify?secret=${global.conf.reCAPTCHA_prv}&response=${resKey}`
            
            try
            {
                const verRes = await axios.post(url)
                const data = verRes.data || {}
                if (data.success !== true)
                {
                    let e = new Error('캡챠 오류')
                    e.code = 'INVALIDCAPTCHA'
                    return cb(e)
                }
            }
            catch (err)
            {
                let e = new Error('캡챠 오류')
                e.code = 'INVALIDCAPTCHA'
                return cb(e)
            }
        }

        let ext = req.body.filename.split(/\./).pop().toLowerCase();
        if (!(getFileTypes().includes(ext)))
        {
            cb(`${getFileTypes().join(', ')}만 업로드할 수 있습니다.`)
        }
        if (!req.body.filename.match(/^[^\#\?\\\/\<\>\:\*\|\"]*$/i))
        {
            cb('파일명은 다음 문자를 포함할 수 없습니다: #, ?, /, \\, &lt;, &gt;, :, *, |, ".')
        }
        checkFileType(file, cb)
    }
})
app.post('/Upload', upload.single('inputFile'), async (req, res) =>
{
    let filepgname = 'File:' + req.body.filename

    await mfile.create(
    {
        filename: req.body.filename,
        uploader: req.session.username,
        explanation: req.body.explanation
    })
    await pages.create(
        {
            title: filepgname,
            content: req.body.explanation,
            currentRev: 1
        })

    //분류 등록
    {
        const categoryRegex = /\[\[(?:Category|분류):(.*?)\]\]/igm
        let e
        while ((e = categoryRegex.exec(req.body.explanation)) !== null)
        {
            if (!e[1]) continue
            category.create(
                {
                    page: filepgname,
                    category: e[1]
                }
            )
        }
    }
    await history.create(
        {
            page: filepgname,
            rev: 1,
            content: req.body.explanation,
            bytechange: req.body.explanation.length,
            editedby: req.session.username,
            comment: `${req.body.filename} 업로드`,
            type: 'edit'
        })
    await recentchanges.create(
    {
        page: filepgname,
        rev: 1,
        doneBy: req.session.username,
        comment: `${req.body.filename} 업로드`,
        bytechange: req.body.explanation.length,
        type: 'upload'
    })
    res.redirect('/w/' + filepgname)
})
app.get('/diff/:name(*)', delegate(['pages', 'diff.js'], () => [history, protect, perm, block]))
app.get('/RandomPage', asyncRoute(async (req, res) => {
    const randomPage = await pages.findOne({ 
        order: sequelize.random() 
    })
    res.redirect(`/w/${randomPage.title}`)
}))
app.get('/admin/developer', csrfProtection, delegate(['admin', 'developerGetHandler.js'], () => [{ perm }]))
app.get('/admin/:name(*)', csrfProtection, delegate(['admin', 'adminGetHandler.js'], () => [users, perm, loginhistory, adminlog]))
app.post('/admin/:name(*)', csrfProtection, delegate(['admin', 'adminPostHandler.js'], () => [users, perm, block, pages, protect, adminlog, threadcomment, thread]))
app.get('/adminlog', delegate(['admin', 'adminlog.js'], () => [adminlog]))

app.get('/category/:name(*)', delegate(['pages', 'category.js'], () => [category]))

app.get('/contribution/:name(*)', delegate(['user', 'contribution.js'], () => [history]))

app.get('/orphaned', asyncRoute(async (req, res) => {
    await renderTemplateInLayout(req, res, 'pages/orphaned.ejs', {}, { title: '고립된 문서' })
}))

app.get('/viewrank', delegate(['pages', 'viewrank.js'], () => [viewcount]))

app.get('/threads/:name(*)', delegate(['threads', 'threadList.js'], () => [{ pages, thread, block }]))
app.post('/threads/:name(*)', delegate(['threads', 'createThread.js'], () => [{ pages, thread, threadcomment, recentdiscuss, block, perm }]))

app.get('/thread/:name(*)', csrfProtection, delegate(['threads', 'thread.js'], () => [{ pages, thread, threadcomment, perm }]))

app.get('/xref/:name(*)', delegate(['pages', 'xref.js']))

app.get('/RecentDiscuss', delegate(['threads', 'rd.js'], () => [recentdiscuss, thread]))

//AJAX routes
app.get('/ajax/autocomplete', delegate(['AJAX', 'pageautocomplete.js'], () => [pages]))
app.get('/ajax/recentchanges', delegate(['AJAX', 'recentchanges.js'], () => [recentchanges]))
app.get('/ajax/username', delegate(['AJAX', 'username.js'], () => [users]))
app.get('/ajax/threadcomments', delegate(['AJAX', 'threadcomments.js'], () => [{ pages, thread, threadcomment, file: mfile }]))
app.get('/ajax/threadinfo', delegate(['AJAX', 'threadinfo.js'], () => [{ thread, block }]))
app.get('/ajax/threadlist', delegate(['AJAX', 'threadlist.js'], () => [thread]))

app.get('/lovelive', (req, res) =>
{
    res.send('<h1><b style="color:#FB217F">LoveLive!!</b></h1>')
    return
})

const { errorHandler } = require('./middleware/errorHandler')
app.use(errorHandler)

//error handler
app.use((err, req, res, next) =>
{
    logger.error('Unhandled request error', err)
    switch (err.code)
    {
        case 'EBADCSRFTOKEN':
            {
                //Send CSRF Error message
                load('sendfile.js')(req, res, 'CSRF 토큰 오류', '/csrfError.html')
            }
            break
        case 'FILENAMENULL':
            {
                load('error.js')(req, res, null, `파일 이름이 비어 있습니다.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
            }
            break
        case 'FILEEXISTS':
            {
                load('error.js')(req, res, null, `파일이 이미 존재합니다. 다른 파일명으로 다시 시도해 주세요.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
            }
            break
        case 'PROCESSED':
            break
        case 'INVALIDCAPTCHA':
            {
                load('error.js')(req, res, null, `CAPTCHA를 수행해 주세요.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
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
                        'message': e.toString()
                    }
                })
            }
            break
        case 'LIMIT_FILE_SIZE':
            {
                load('error.js')(req, res, null, `선택된 파일의 크기가 너무 큽니다. 파일은 최대 ${fileLimit}MB여야 합니다.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
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

//Put server on
const server = app.listen(port, '0.0.0.0', () =>
{
    const host = server.address().address
    const port = server.address().port
    logger.info(`App listening at http://${host}:${port}`)
})

//Console
const io = require('socket.io')(server)
io.use(require('express-socket.io-session')(sess, {autoSave: true}))

io.on('connection', async socket =>
{
    socket.on('joinRoom', async data =>
    {
        if (data.notAThread === true && data.roomId === 'developerconsole')
        {
            //developer console.
            let username = socket.handshake.session.username
            if (await perm.findOne({where: {username: username, perm: 'developer'}}))
            {
                await socket.join('developerconsole')
                await socket.emit('joinok')
                socket.emit('output', 'AkariEngine 3.0\nCopyright Kyubin Min 2021-2023. Distributed under GNU AGPL.\n\nType \'help\' for the list of commands.\n')
            }
        }
        else
        {
            socket.join(data.roomId)
        }
    })
    socket.on('message', async data =>
    {
        if (!data.message) return
        let username = socket.handshake.session.username
        let IP = socket.handshake.headers['x-real-ip'] || socket.handshake.address
        
        //get username
        let doneBy = username ? username : IP

        data.username = doneBy
        let ipblock = await block.findOne({where: {target: IP}})
        if (ipblock)
        {
                if (!username) return
                if (!ipblock.allowLogin) return
        }
        if (username && await block.findOne({where: {target: username}})) return

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
                where: {threadID: data.roomId}
        })

        //RD should be unique
        await recentdiscuss.destroy(
        {
            where: {threadID: data.roomId}
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
        data.message  = await load('pages', 'render.js')('', data.message, true, pages, mfile, null, null, false, true, {}, {})
        io.sockets.in(data.roomId).emit('message', data)
    })
    socket.on('input', async data =>
    {
        await load('admin', 'command.js')(io, socket, data.command, {perm: perm, file: mfile, pages: pages, history: history, category: category})
    })
})
