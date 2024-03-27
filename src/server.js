/* eslint-disable no-unused-vars */
const express = require('express')
const app = express()

global.path = __dirname

global.conf = require(global.path + '/LocalSettings.json')

const port = global.conf.port

//Legacy ways to access settings. Deprecated.
global.appname = global.conf.appname
global.licence = global.conf.licence
global.dtFormat = global.conf.dateTimeFormat

global.copyrightNotice = `이 문서를 편집함으로써 당신은 ${global.conf.appname}가 당신의 기여를 ${global.conf.licence} 하에 배포하는 데에 동의하는 것입니다. 이 동의는 철회할 수 없습니다.`
global.perms = ['admin', 'board', 'block', 'grant', 'acl', 'deletepage', 'deletefile', 'developer', 'loginhistory', 'bypasscaptcha', 'thread']

//initialise db
const {Sequelize} = require('sequelize')
let sequelize = null
if (global.conf.database.type == 'sqlite')
{
    sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: global.path + global.conf.database.sqlite_options.storage,
        logging: false
    })
}
else if (global.conf.database.type == 'mariadb')
{
    sequelize = new Sequelize(global.conf.database.mariadb_options.database, global.conf.database.mariadb_options.username, global.conf.database.mariadb_options.password, {
        dialect: 'mariadb',
        dialectOptions: {connectTimeout: 1000}
    })
}
else
{
    console.error('[ERROR!] Invalid DB type.')
    exit()
}

//session
const secret = global.conf.session_secret
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
        secure: global.conf.ssl,
        samesite: 'strict',
        httpOnly: true, //so that the cookie cannot be taken away
        maxAge: 30 * 86400 * 1000
    }
})
app.use(sess)

//CSRF
const csurf = require('csurf')
const csrfProtection = csurf({})
global.csrfProtection = csrfProtection

app.use(express.json({limit : "1mb"}))
app.use(express.urlencoded({limit : "1mb", extended: false}))

app.disable('x-powered-by')

//db
const users = require(global.path + '/models/user.model.js')(sequelize)
const pages = require(global.path + '/models/page.model.js')(sequelize)
const recentchanges = require(global.path + '/models/recentchanges.model.js')(sequelize)
const history = require(global.path + '/models/history.model.js')(sequelize)
const mfile = require(global.path + '/models/file.model.js')(sequelize)
const perm = require(global.path + '/models/perm.model.js')(sequelize)
const protect = require(global.path + '/models/protect.model.js')(sequelize)
const adminlog = require(global.path + '/models/adminlog.model.js')(sequelize)
const block = require(global.path + '/models/block.model.js')(sequelize)
const loginhistory = require(global.path + '/models/loginhistory.model.js')(sequelize)
const category = require(global.path + '/models/category.model.js')(sequelize)
const settings = require(global.path + '/models/setting.model.js')(sequelize)
const viewcount = require(global.path + '/models/viewcount.model.js')(sequelize)
const updateTime = require(global.path + '/models/updateTime.model.js')(sequelize)
const thread = require(global.path + '/models/thread.model.js')(sequelize)
const threadcomment = require(global.path + '/models/threadcomment.model.js')(sequelize)
const recentdiscuss = require(global.path + '/models/recentdiscuss.model.js')(sequelize)
const links = require(global.path + '/models/links.model.js')(sequelize)
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

global.sequelize = sequelize

//task scheduler
require(global.path + '/taskScheduler.js')()

global.sanitiseOptions =
{
    allowedTags: ['div', 'span', 'blockquote', 'code', 'p', 'pre', 'caption',
    'i', 'b', 'u', 's', 'del', 'em', 'strong', 'a', 'sup', 'sub', 'font',
    'big', 'small',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'br', 'hr',
    'ol', 'ul', 'li', 'dt', 'dl',
    'figure', 'figcaption', 'cite',
    'table', 'th', 'tr', 'td', 'tbody', 'thead', 'tfoot',
    'img', 'iframe',
    'ruby', 'rp', 'rt'],

    allowedAttributes:
    {
        a: ['href', 'name', 'id', 'target', 'rel', 'class', 'title', 'style'],
        code: ['class', 'id', 'style'],
        i: ['class', 'id', 'aria-hidden', 'style'],
        font: ['class', 'id', 'size', 'color', 'face', 'style'],
        div: ['class', 'id', 'style', 'data-x', 'data-y', 'data-z', 'data-a'],
        span: ['class', 'id', 'style', 'data-x', 'data-y', 'data-z'],
        caption: ['class', 'id', 'style'],
        p: ['class', 'id', 'style'],
        del: ['class', 'id', 'style'],
        pre: ['class', 'id', 'style'],
        hr: ['class', 'id', 'style'],
        h1: ['class', 'id', 'style'],
        h2: ['class', 'id', 'style'],
        h3: ['class', 'id', 'style'],
        h4: ['class', 'id', 'style'],
        h5: ['class', 'id', 'style'],
        h6: ['class', 'id', 'style'],
        ol: ['class', 'id', 'style', 'reversed', 'start', 'type'],
        ul: ['class', 'id', 'style', 'reversed', 'start', 'type'],
        th: ['class', 'id', 'style', 'colspan', 'rowspan'],
        td: ['class', 'id', 'style', 'colspan', 'rowspan'],
        tr: ['class', 'id', 'style', 'colspan', 'rowspan'],
        table: ['class', 'id', 'style', 'colspan', 'rowspan'],
        thead: ['class', 'id', 'style', 'colspan', 'rowspan'],
        tbody: ['class', 'id', 'style', 'colspan', 'rowspan'],
        figure: ['class', 'id', 'style', 'data-oembed-url'],
        iframe: ['class', 'width', 'height', 'style', 'src', 'frameborder', 'allow', 'allowfullscreen'],
        img: ['class', 'id', 'style', 'height', 'width', 'src', 'srcset', 'alt', 'title'],
        blockquote: ['class', 'id', 'style']
    },
    allowedStyles:
    {
        '*':
        {
            'color': [/^.*?$/], ///^#(0x)?[0-9a-fA-F]+$/i, /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/
            'background-color': [/^.*?$/],
            'background-image': [/^ *(?:repeating-)?(?:linear|radial)-gradient\([^(]*(\([^)]*\)[^(]*)*[^)]*\) *$/],
            'text-align': [/^ *left *$/, /^ *right *$/, /^ *center *$/],
            'vertical-align': [/^ *top *$/, /^ *middle *$/, /^ *bottom *$/],
            'font': [/^.*?$/],
            'font-size': [/^ *(\d|.)+(?:px|em|%) *$/],
            'font-family': [/^.*?$/],
            'font-weight': [/^.*?$/],
            'word-break': [/^ *normal *$/, /^ *break-all *$/, /^ *keep-all *$/],
            'margin': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
            'margin-top': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
            'margin-bottom': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
            'margin-left': [/^ *(-|\+)?(\d|.)+(?:px|em|%) *$/],
            'margin-right': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
            'max-width': [/^.*?$/],
            'max-height': [/^.*?$/],
            'min-width': [/^.*?$/],
            'min-height': [/^.*?$/],
            'padding': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
            'padding-left': [/^ *(-|\+)?(\d|.)+(?:px|em|%) *$/],
            'padding-right': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
            'padding-top': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
            'padding-bottom': [/^ *(((-|\+)?(\d|.)+(px|em|%) *)+|auto) *$/],
            'position': [/^.*?$/],
            'border': [/^ *(thin|medium|thick|(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
            'border-bottom': [/^ *(thin|medium||(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
            'border-top': [/^ *(thin|medium|thick|(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
            'border-left': [/^ *(thin|medium|thick|(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
            'border-right': [/^ *(thin|medium|thick|(\d|.)+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
            'border-style': [/^ *(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? *$/],
            'border-*-style': [/^ *(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)? *$/],
            'border-color': [/^.*?$/],
            'border-*-color': [/^.*?$/],
            'border-width': [/^.*?$/],
            'border-left-width': [/^.*?$/],
            'border-right-width': [/^.*?$/],
            'border-top-width': [/^.*?$/],
            'border-bottom-width': [/^.*?$/],
            'border-image': [/^ *(?:repeating-)?(?:linear|radial)-gradient\([^(]*(\([^)]*\)[^(]*)*[^)]*\)( \d*)? *$/],
            'box-shadow': [/^.*?$/],
            'float': [/^ *(left|right) *$/],
            'width': [/^.*?$/],
            'height': [/^.*?$/],
            'clear': [/^.*?$/]
        },
    },
    exclusiveFilter: (tag) =>
    {
        //true면 지운다
        if (tag.tag === 'img')
        {
            if (!tag.attribs['src']) return false
            //TODO: extension can add filter?
            return !(/^\/(board)?uploads\/.*$/.test(tag.attribs['src']))
        }
        else if (tag.tag === 'iframe')
        {
            if (!tag.attribs['src']) return true
            if (tag.attribs['src'].startsWith('/'))
            {
                if (tag.attribs['src'].includes('../')) return true
                if (tag.attribs['src'].includes('..\\')) return true
                return !tag.attribs['src'].startsWith('/uploads/')
            }
        }
        else
        {
            return false
        }
    },
    disallowedTagsMode: 'escape',
    allowedIframeHostnames: (global.conf.security === undefined
        || global.conf.security.allowedIframeHostnames === undefined ?
         ['www.youtube.com', 'www.youtube-nocookie.com'] : global.conf.security.allowedIframeHostnames),
    allowIframeRelativeUrls: true
}

//i18n -- Global (Non-skin)
global.i18n = require("i18n");
global.i18n.configure({
    locales: ['ko_KR', 'en_GB'],
    defaultLocale: global.conf.defaultLocale ? global.conf.defaultLocale : "en_GB",
    directory: global.path + "/locales",
    objectNotation: true
  });

//regex for testing whether page title is legal or not
global.legalTitleRegex = /^[^\[\]\{\}\|#\n]*$/m

//load global tools
global.escapeHTML = require(global.path + '/tools/escapeHTML.js')

const path = require('path')
const dateandtime = require('date-and-time')

//views
const ejs = require('ejs')
app.set('view engine', 'ejs')
app.set('views',global.path + '/views')
app.use(express.static(global.path + '/public'))

//skins
global.skins = []
global.conf.skins.forEach(e => {
    app.use(`/skins/${e}`, express.static(`${global.path}/skins/${e}/public`));
    let skinSettings = require(`${global.path}/skins/${e}/skinSettings.json`)
    let skinManifest = require(`${global.path}/skins/${e}/manifest.json`)
    global.skins.push({'name': e, 'settings': skinSettings, 'manifest': skinManifest})
})

//Extension
let ext = require(global.path + '/extensionManager.js')
ext(app, ext)


//Master router---handle i18n.
app.use((req, res, next) => {
    i18n.init(req, res);
    /*if (req.session.locale) {
      i18n.setLocale(req, req.session.locale);
    }*/
    next();
  })

//Page router

app.get('/', (req, res) =>
{
    res.redirect('/w/FrontPage')
})

app.get('/Licence', async (req, res) =>
{
    const licencePage = await ejs.renderFile(global.path + '/views/license.ejs')
    require(global.path + '/view.js')(req, res,
        {
            title: 'Licence',
            content: licencePage
        })
})
app.get('/noEmail', async (req, res) =>
{
    const noEmailPage = await ejs.renderFile(global.path + '/views/etc/noEmail.ejs', {l: res.__,})
    require(global.path + '/view.js')(req, res,
        {
            title:  global.i18n.__('noEmail'),
            content: noEmailPage
        })
})
app.get('/signup', async (req, res) =>
{
    const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
    const signuppage = await ejs.renderFile(global.path + '/views/user/signup.ejs',{captcha: captchaSVG, l: global.i18n.__})
    require(global.path + '/view.js')(req, res,
    {
        title: global.i18n.__('register'),
        content: signuppage,
        username: req.session.username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        
    })
})
app.post('/signup', (req, res) =>
{
    require(global.path + '/user/signup.js')(req, res, sequelize, users, perm)
})

app.get('/login', csrfProtection, async (req,res) =>
{
    //render page
    const username = req.session.username
    ejs.renderFile(global.path + '/views/user/login.ejs',{csrfToken: req.csrfToken(), l: global.i18n.__}, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        require(global.path + '/view.js')(req, res,
        {
            title: global.i18n.__('login'),
            content: html,
            //notification: r,
            username: username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            
        })
    })
})
app.post('/login', csrfProtection, async (req, res) =>
{
    require(global.path + '/user/login.js')(req, res, users, loginhistory)
})
app.get('/logout', (req, res) =>
{
    req.session.regenerate(() => {});
    res.redirect('/')
})
app.get('/whoami', (req, res) =>
{
    require(global.path + '/view.js')(req, res,{
        title: 'You are',
        content: `${req.session.username}<br>IP Address: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`,
        username: req.session.username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress)
    })
})
app.get('/settings', csrfProtection, async (req, res) =>
{
    const username = req.session.username ? req.session.username : null
    /*if (!username)
    {
        require(global.path + '/error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
        return
    }*/
    const sR = await settings.findOne({
        where:
        {
            user: username,
            key: 'sign'
        }
    })
    const sign = sR ? sR.value : ''
    ejs.renderFile(global.path + '/views/user/settings.ejs',
    {
        csrfToken: req.csrfToken(),
        sign: sign,
        username: username,
        l: global.i18n.__
    }, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        require(global.path + '/view.js')(req, res,
        {
            title: global.i18n.__('settings'),
            content: html,
            //notification: r,
            username: username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            
        })
    })
})
app.post('/settings/:name(*)', csrfProtection, async (req, res) =>
{
    require(global.path + '/user/settings.js')(req, res,
        {
            settings: settings,
            users: users
        })
})

app.get('/edit/:name(*)', csrfProtection, async (req, res) =>
{
    let username = req.session.username
    req.params.name = req.params.name
    if (req.params.name.length > 255)
    {
        require(global.path + '/error.js')(req, res, null, global.i18n.__('pagename_toolong'), '/', global.i18n.__('mainpage'), 200)
        return
    }
    if (!global.legalTitleRegex.test(req.params.name))
    {
        require(global.path + '/error.js')(req, res, null, global.i18n.__('pagename_specialchar'), '/', global.i18n.__('mainpage'), 200)
        return
    }
    const target = await pages.findOne({where: {title: req.params.name}})
    if (!target)
    {
        if (req.params.name.toLowerCase().startsWith('file:'))
        {
            require(global.path + '/error.js')(req, res, null, global.i18n.__('pagename_illegalfile'), '/', global.i18n.__('mainpage'), 200)
            return
        }
    }
    //if (username === undefined) = req.headers['x-forwarded-for'] || req.socket.remoteAddress

    //check for protection 
    const pro = await protect.findOne({where: {title: req.params.name, task: 'edit'}})
    var acl = (pro == undefined ? 'everyone' : pro.protectionLevel) //fallback
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, [acl], perm, block, true, true)
    let prefix = ''
    let suffix = ''
    if (r === true)
    {
        //generate CAPTCHA
        const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
        var content = ''
        if (target)
        {
            content = target.content
            if (req.query.section && !isNaN(req.query.section) && req.query.section * 1 > 0)
            {
                req.query.section *= 1
                let headLookupRegex = /(?=^(?:=+) (?:.*) =+(?: )*\r?\n)/gim
                let splits = content.split(headLookupRegex)
                let offset = 0
                if (/^(?:=+) (?:.*) =+(?: )*\r?\n/igm.test(splits[0])) offset = -1

                if (req.query.section + offset > splits)
                {
                    require(global.path + '/error.js')(req, res, null, global.i18n.__('edit_noparagraph'), '/', global.i18n.__('mainpage'), 200)
                    return
                }
                for (let i = 0; i < req.query.section + offset; i++) prefix += splits[i]
                for (let i = req.query.section + offset + 1; i < splits.length; i++) suffix += splits[i]
                content = splits[req.query.section + offset]
            }
        }
        ejs.renderFile(global.path + '/views/pages/edit.ejs',
        {
            title: req.params.name,
            content: content,
            prefix: prefix,
            suffix: suffix,
            username: username,
            captcha: captchaSVG,
            l: global.i18n.__,
            csrfToken: req.csrfToken()
        }, (err, html) => 
        {
            if (err)
            {
                console.error(err)
                res.writeHead(500).write('Internal Server Error')
                return
            }
            require(global.path + '/view.js')(req, res,
            {
                title: global.i18n.__('edit_pg', {name: req.params.name}),
                content: html,
                isPage: true,
                pageMode: "edit",
                pagename: req.params.name,
                username: username,
                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                
            })
        })
    }
    else if (r === undefined)
    {
        return //error message already given out
    }
    else
    {
        let content = ''
        if (target) content = target.content
        ejs.renderFile(global.path + '/views/pages/edit.ejs',
        {
            title: req.params.name,
            content: content,
            username: username,
            l: global.i18n.__,
            prefix: prefix,
            suffix: suffix,
            disabled: true,
            csrfToken: req.csrfToken()
        },
        (err, html) => 
        {
            if (err)
            {
                console.error(err)
                res.writeHead(500).write('Internal Server Error')
                return
            }
            require(global.path + '/view.js')(req, res,
            {
                title: global.i18n.__('edit_pg', {name: req.params.name}),
                content: html,
                isPage: true,
                notification: r,
                pagename: req.params.name,
                username: username,
                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                
            })
        })
        //require(global.path + '/error.js')(req, res, username, 'You cannot edit because the protection level for this page is ' + acl + '.', '/', 'the main page')
    }
})

app.post('/edit/:name(*)', csrfProtection, async (req, res) =>
{
    const username = req.session.username
    if (req.params.name.length > 255)
    {
        require(global.path + '/error.js')(req, res, null, global.i18n.__('pagename_toolong'), '/', global.i18n.__('mainpage'), 200)
        return
    }
    await require(global.path + '/pages/edit.js')(req, res, req.session.username, users, pages, recentchanges, history, protect, perm, block, category, settings) //actually no need to separately pass on username (in req)
})

app.get('/move/:name(*)', async (req, res) =>
{
    if (req.params.name.toLowerCase().startsWith('file:'))
    {
        require(global.path + '/error.js')(req, res, null, global.i18n.__('move_nofile'), '/', global.i18n.__('pagename_toolong'), 200)
        return
    }
    const pro = await protect.findOne({where: {title: req.params.name, task: 'move'}})
    var acl = (pro == undefined ? 'blocked' : pro.protectionLevel) //fallback
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, [acl], perm, block)
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
        require(global.path + '/error.js')(req, res, null, global.i18n.__('view_noacl'), '/login', global.i18n.__('loginpage'), 403, 'ko')
        return
    }
    pages.findOne({where: {title: req.params.name}}).then(async (target) =>
    {
        if (!target)
        {
            require(global.path + '/error.js')(req, res, null, `${global.i18n.__('page404')} <a href="/edit/${req.params.name}"> ${global.i18n__('page_asknew')}</a>`, '/', global.i18n.__('mainpage'), 404)
            return
        }
        const username = req.session.username
        //generate CAPTCHA
        const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
        ejs.renderFile(global.path + '/views/pages/move.ejs',
        {
            originalName: req.params.name,
            l: global.i18n.__,
            username: username,
            captcha: captchaSVG
        }, (err, html) => 
        {
            require(global.path + '/view.js')(req, res,
            {
                title: global.i18n.__('movepg', {name: req.params.name}),
                content: html,
                isPage: true,
                pagename: req.params.name,
                pageMode: "move",
                username: username,
                ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                
            })
        })
    })
})
app.post('/move/:name(*)', async (req, res) =>
{
    await require(global.path + '/pages/move.js')(req, res, req.session.username, users, pages, recentchanges, history, thread, perm, block, protect, category)
})
app.get('/delete/:name(*)', csrfProtection, (req, res) =>
{
    const username = req.session.username
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, global.i18n.__('loginneeded'), '/login', global.i18n.__('loginpage'), 404, 'ko')
        return
    }
    perm.findOne({where: {username: username, perm: 'deletepage'}}).then(p =>
    {
        if (p)
        {
            pages.findOne({where: {title: req.params.name}}).then(target =>
            {
                if (target)
                {
                    const username = req.session.username
                    ejs.renderFile(global.path + '/views/pages/delete.ejs',{title: req.params.name, l: global.i18n.__, username: username, csrfToken: req.csrfToken()}, (err, html) => 
                    {
                        require(global.path + '/view.js')(req, res,
                        {
                            title: global.i18n.__('deletepg', {name: req.params.name}),
                            isPage: true,
                            pageMode: "delete",
                            pagename: target.title,
                            content: html,
                            username: username,
                            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
                            
                        })
                    })
                }
                else
                {
                    require(global.path + '/error.js')(req, res, null, `${global.i18n.__('page404')} <a href="/edit/${req.params.name}">${global.i18n.__('page_asknew')}</a>`, '/', global.i18n.__('mainpage'), 404, 'ko')
                    return
                }
            })
        }
        else
        {
            require(global.path + '/error.js')(req, res, null, global.i18n.__('deletepermneeded'), '/login', global.i18n.__('loginpage'), 403, 'ko')
        }
    })
})
app.post('/delete/:name(*)', csrfProtection, async (req, res) =>
{
    await require(global.path + '/pages/delete.js')(req,res,req.session.username,users,pages,recentchanges,history, perm, mfile, category)
})
app.get('/revert/:name(*)', async (req, res) =>
{
    const username = req.session.username
    const pro = await protect.findOne({where: {title: req.params.name, task: 'edit'}})
    var acl = (pro == undefined ? 'blocked' : pro.protectionLevel) //fallback
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, [acl], perm, block)
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
        require(global.path + '/error.js')(req, res, null, global.i18n.__('move_noacl', {acl: acl}), '/login', global.i18n.__('loginpage'), 403, 'ko')
        return
    }
    const p = await pages.findOne({where: {title: req.params.name}})
    if (!p)
    {
        require(global.path + '/error.js')(req, res, null, `${global.i18n.__('page404')} <a href="/edit/${req.params.name}">${global.i18n.__('page_asknew')}</a>`, '/', global.i18n.__('mainpage'), 404, 'ko')
        return
    }
    const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
    ejs.renderFile(global.path + '/views/pages/revert.ejs',
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
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        require(global.path + '/view.js')(req, res,
        {
            title: global.i18n.__('revert_title', {page: req.params.name, rev: req.query.rev}),
            content: html,
            username: username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            
        })
    })
})
app.post('/revert/:name(*)', async (req, res) =>
{
    await require(global.path + '/pages/revert.js')(req, res, req.session.username, users, pages, recentchanges, history, protect, perm, block)
})
app.get('/w/:name(*)', async (req, res) =>
{
    await require(global.path + '/pages/view.js')(req, res, pages, mfile, history, protect, perm, block, category, viewcount, updateTime)
})
app.post('/w', async (req,res) =>
{
    await res.redirect('/w/' + req.body.pagename)
})
app.post('/preview', async (req, res) =>
{
    await require(global.path + '/pages/preview.js')(req, res, pages, mfile, category)
})
app.get('/search', async (req, res) =>
{
    await require(global.path + '/pages/search.js')(req, res, pages)
})
app.post('/search', async (req, res) =>
{
    await require(global.path + '/pages/navSearch.js')(req, res, pages)
})
app.get('/protect/:name(*)', async (req, res) =>
{
    await require(global.path + '/admin/protectGet.js')(req, res, perm, protect, block)
})
app.post('/protect/:name(*)', async (req, res) =>
{
    await require(global.path + '/admin/protectPost.js')(req, res, perm, protect, pages, history, recentchanges, block)
})
app.get('/raw/:name(*)', async (req, res) =>
{
    await require(global.path + '/pages/raw.js')(req, res, pages, history, protect, perm, block)
})
app.get('/history/:name(*)', (req, res) =>
{
    require(global.path + '/pages/history.js')(req, res, history)
})
app.get('/RecentChanges', async (req, res) =>
{
    ejs.renderFile(global.path + '/views/pages/recentchanges.ejs',
    {
        l: global.i18n.__
    }, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        require(global.path + '/view.js')(req, res,
        {
            title: global.i18n.__('recentChanges'),
            content: html,
            isPage: false,
            username: req.session.username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            
        })
    })
})
app.get('/PageList', async (req, res) =>
{
    await require(global.path + '/pages/pagelist.js')(req, res, pages)
})

app.get('/Upload', async (req, res) =>
{
    const username = req.session.username
    const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
    ejs.renderFile(global.path + '/views/files/upload.ejs',
    {
        username: username,
        captcha: captchaSVG,
        filetypes: getFileTypes().join(', '),
        fileLimit: fileLimit
    }, (err, html) => 
    {
        require(global.path + '/view.js')(req, res,
        {
            title: global.i18n.__('upload'),
            content: html,
            username: username,
            ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
            
        })
    })
})
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
    destination: (req, file, cb) => {cb(null, global.path + '/public/uploads/')},
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
            if (fs.existsSync(global.path + '/public/uploads/' + req.body.filename))
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
            console.error(err)
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
            require(global.path + '/error.js')(req, res, null, global.i18n.__('loginneeded'), '/login', global.i18n.__('loginpage'), 403, 'ko')
            return
        }
        const b = await block.findOne({where: {target: username, targetType: 'user'}})
        if (b)
        {
            if (b.isForever)
            {
                require(global.path + '/error.js')(req, res, null, `${b.doneBy}에 의해 영구적으로 차단된 상태입니다. (사유: ${b.comment})`, '/', '메인 페이지', 403, 'ko')
                return
            }
            else
            {
                require(global.path + '/error.js')(req, res, null, `${b.doneBy}에 의해 ${dateandtime.format(b.until, global.dtFormat)}까지 차단된 상태입니다. (사유: ${b.comment})`, '/', '메인 페이지', 403, 'ko')
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
app.get('/diff/:name(*)', async (req, res) =>
{
    //usage example: /diff/FrontPage?rev1=20&rev2=30 (compare r20 and r30)
    await require(global.path + '/pages/diff.js')(req, res, history, protect, perm, block)
})
app.get('/RandomPage', async (req, res) =>
{
    const randomPage = await pages.findOne({ 
        order: sequelize.random() 
    })
    res.redirect(`/w/${randomPage.title}`)
})
app.get('/admin', async (req, res) =>
{
    //todo: check admin perm
    if (!req.session.username)
    {
        await require(global.path + '/error.js')(req, res, null, '로그인이 필요합니다.', '/login', '로그인 페이지', 404, 'ko')
        return
    }
    if (await perm.findOne({where:{username: req.session.username, perm: 'admin'}}))
    {
        const adminPage = await ejs.renderFile(global.path + '/views/admin/index.ejs')
        require(global.path + '/view.js')(req, res,
            {
                title: 'Admin tools',
                content: adminPage
            })
    }
    else
    {
        await require(global.path + '/error.js')(req, res, null, `Admin 권한이 필요합니다.`, '/login', '로그인 페이지', 403, 'ko')
    }
})
app.get('/admin/developer', csrfProtection, async (req, res) =>
{
    await require(global.path + '/admin/developerGetHandler.js')(req, res, {perm: perm})
})
app.get('/admin/:name(*)', csrfProtection, async (req, res) =>
{
    //handler
    await require(global.path + '/admin/adminGetHandler.js')(req, res, users, perm, loginhistory, adminlog)
})
app.post('/admin/:name(*)', csrfProtection, async (req, res) =>
{
    await require(global.path + '/admin/adminPostHandler.js')(req, res, users, perm, block, pages, protect, adminlog, threadcomment, thread)
})
app.get('/adminlog', async (req, res) =>
{
    await require(global.path + '/admin/adminlog.js')(req, res, adminlog)
})

app.get('/category/:name(*)', async (req, res) =>
{
    await require(global.path + '/pages/category.js')(req, res, category)
})

app.get('/contribution/:name(*)', async (req, res) =>
{
    await require(global.path + '/user/contribution.js')(req, res, history)
})

app.get('/orphaned', async (req, res) =>
{
    const orph = await ejs.renderFile(global.path + '/views/pages/orphaned.ejs')
    require(global.path + '/view.js')(req, res,
    {
        title: '고립된 문서',
        content: orph
    })
})

app.get('/viewrank', async (req, res) =>
{
    await require(global.path + '/pages/viewrank.js')(req, res, viewcount)
})

app.get('/threads/:name(*)', async (req, res) =>
{
    await require(global.path + '/threads/threadList.js')(req, res,
    {
        'pages': pages,
        'thread': thread,
        'block': block
    })
})
app.post('/threads/:name(*)', async (req, res) =>
{
    await require(global.path + '/threads/createThread.js')(req, res,
    {
        'pages': pages,
        'thread': thread,
        'threadcomment': threadcomment,
        'recentdiscuss': recentdiscuss,
        'block': block,
        'perm': perm
    })
})

app.get('/thread/:name(*)', csrfProtection, async (req, res) =>
{
    //dbs: users, pages, recentdiscuss, protect, perm, block
    await require(global.path + '/threads/thread.js')(req, res,
    {
        'pages': pages,
        'thread': thread,
        'threadcomment': threadcomment,
        'perm': perm
    })
})

app.get('/xref/:name(*)', async (req, res) => {
    await require(global.path + '/pages/xref.js')(req, res)
})

app.get('/RecentDiscuss',  async (req, res) =>
{
    //dbs: users, pages, recentdiscuss, protect, perm, block
    await require(global.path + '/threads/rd.js')(req, res, recentdiscuss, thread)
})

//AJAX
app.get('/ajax/autocomplete', async (req, res) =>
{
    await require(global.path + '/AJAX/pageautocomplete.js')(req, res, pages)
})

app.get('/ajax/recentchanges', async (req, res) =>
{
    await require(global.path + '/AJAX/recentchanges.js')(req, res, recentchanges)
})

app.get('/ajax/username', async (req, res) =>
{
    await require(global.path + '/AJAX/username.js')(req, res, users)
})

app.get('/ajax/threadcomments', async (req, res) =>
{
    await require(global.path + '/AJAX/threadcomments.js')(req, res,
    {
        'pages': pages,
        'thread': thread,
        'threadcomment': threadcomment,
        'file': mfile
    })
})

app.get('/ajax/threadinfo', async (req, res) =>
{
    //user blocked
    //thread current status
    await require(global.path + '/AJAX/threadinfo.js')(req, res,
        {
            'thread': thread,
            'block': block
        })
})

app.get('/ajax/threadlist', async (req, res) =>
{
    await require(global.path + '/AJAX/threadlist.js')(req, res, thread)
})

app.get('/lovelive', (req, res) =>
{
    res.send('<h1><b style="color:#FB217F">LoveLive!!</b></h1>')
    return
})

app.get('/short/logo', (req, res) =>
{
    res.redirect('/w/GECWiki:%EB%A1%9C%EA%B3%A0%20%EA%B3%B5%EB%AA%A8%EC%A0%84')
    return
})

//error handler
app.use((err, req, res, next) =>
{
    console.error(err)
    switch (err.code)
    {
        case 'EBADCSRFTOKEN':
            {
                //Send CSRF Error message
                require(global.path + '/sendfile.js')(req, res, 'CSRF 토큰 오류', '/csrfError.html')
            }
            break
        case 'FILENAMENULL':
            {
                require(global.path + '/error.js')(req, res, null, `파일 이름이 비어 있습니다.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
            }
            break
        case 'FILEEXISTS':
            {
                require(global.path + '/error.js')(req, res, null, `파일이 이미 존재합니다. 다른 파일명으로 다시 시도해 주세요.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
            }
            break
        case 'PROCESSED':
            break
        case 'INVALIDCAPTCHA':
            {
                require(global.path + '/error.js')(req, res, null, `CAPTCHA를 수행해 주세요.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
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
                require(global.path + '/error.js')(req, res, null, `선택된 파일의 크기가 너무 큽니다. 파일은 최대 ${fileLimit}MB여야 합니다.`, 'javascript:window.history.back()', '이전 페이지', 200, 'ko')
            }
            break
        default:
            {
                console.error(err)
                console.error(err.stack)
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
    console.log("App listening at http://%s:%s",host,port)
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
        data.message  = await require(global.path + '/pages/render.js')('', data.message, true, pages, mfile, null, null, false, true, {}, {})
        io.sockets.in(data.roomId).emit('message', data)
    })
    socket.on('input', async data =>
    {
        await require(global.path + '/admin/command.js')(io, socket, data.command, {perm: perm, file: mfile, pages: pages, history: history, category: category})
    })
})
