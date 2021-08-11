/* eslint-disable no-unused-vars */
const { Router } = require('express')
const express = require('express')
const app = express()

const port = 8080
global.appname = 'GECWiki'
global.path = __dirname
//global.loopbackAddress = 'http://127.0.0.1:' + port.toString() //change if running behind a load balancer
global.license = 'CC BY-SA 4.0'
//(이 문서를 편집함으로써 당신은 ${global.appname}가 당신의 기여를 ${global.license} 하에 배포하는 데에 동의하는 것입니다. 이 동의는 철회할 수 없습니다)
global.copyrightNotice = `By saving this edit, you are allowing ${global.appname} to distribute your contribution under ${global.license}. This agreement cannot be withdrawn. (이 문서를 편집함으로써 당신은 ${global.appname}가 당신의 기여를 ${global.license} 하에 배포하는 데에 동의하는 것입니다. 이 동의는 철회할 수 없습니다)`
global.dtFormat = 'YYYY/MM/DD HH:mm:ss'
global.perms = ['admin', 'block', 'grant', 'acl', 'deletepage', 'deletefile', 'developer', 'loginhistory', 'bypasscaptcha']

//initialise db
const {Sequelize} = require('sequelize')
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: __dirname + '/db.sqlite',
    logging: false
})


//session
const secret = '6YOhz+9FXUDnTCl1OcqUTDbE0yy39a37JDUYvuhdhQ/PNXopXu7iLKFdnIEFKlQv5WcwHD4hDn8Gg8Pb4DgEIg=='
const session = require('express-session')
const cookieParser = require('cookie-parser')
const sessionStore = require('express-session-sequelize')(session.Store)
const sequelizeSessionStore = new sessionStore({db: sequelize})
app.use(cookieParser(secret))
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: secret,
    store: sequelizeSessionStore,
    name: 'akari',
    expires: new Date(Date.now() + (30 * 86400 * 1000)), //expires after 30 days
    cookie:
    {
        samesite: 'strict',
        //secure: true, //TODO: change it to TRUE on production
        httpOnly: true, //so that the cookie cannot be taken away
        maxAge: 30 * 86400 * 1000
    }
}))

//CSRF
const csurf = require('csurf')
const csrfProtection = csurf({})

app.use(express.json())
app.use(express.urlencoded({extended: false}))

app.disable('x-powered-by')

//db
const users = require(__dirname + '/models/user.model.js')(sequelize)
const pages = require(__dirname + '/models/page.model.js')(sequelize)
const recentchanges = require(__dirname + '/models/recentchanges.model.js')(sequelize)
const history = require(__dirname + '/models/history.model.js')(sequelize)
const mfile = require(__dirname + '/models/file.model.js')(sequelize)
const perm = require(__dirname + '/models/perm.model.js')(sequelize)
const protect = require(__dirname + '/models/protect.model.js')(sequelize)
const adminlog = require(__dirname + '/models/adminlog.model.js')(sequelize)
const block = require(__dirname + '/models/block.model.js')(sequelize)
const loginhistory = require(__dirname + '/models/loginhistory.model.js')(sequelize)
const category = require(__dirname + '/models/category.model.js')(sequelize)
const settings = require(__dirname + '/models/setting.model.js')(sequelize)
const viewcount = require(__dirname + '/models/viewcount.model.js')(sequelize)
const updateTime = require(__dirname + '/models/updateTime.model.js')(sequelize)
sequelize.sync()

global.sanitiseOptions =
{
    allowedTags: ['div', 'span', 'blockquote', 'p', 'pre', 'caption',
    'i', 'b', 'u', 'del', 'em', 'strong', 'a', 'sup', 'sub', 'font',
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
        i: ['class', 'id', 'aria-hidden', 'style'],
        font: ['class', 'id', 'size', 'color', 'face', 'style'],
        div: ['class', 'id', 'style'],
        span: ['class', 'id', 'style'],
        caption: ['class', 'id', 'style'],
        p: ['class', 'id', 'style'],
        del: ['class', 'id', 'style'],
        pre: ['class', 'id', 'style'],
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
        iframe: ['class', 'width', 'height', 'src', 'frameborder', 'allow', 'allowfullscreen'],
        img: ['class', 'id', 'style', 'height', 'width', 'src'],
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
            'font-size': [/^ *\d+(?:px|em|%) *$/],
            'word-break': [/^ *normal *$/, /^ *break-all *$/, /^ *keep-all *$/],
            'margin': [/^ *(((-|\+)?\d+(px|em|%) *)+|auto) *$/],
            'margin-top': [/^ *(((-|\+)?\d+(px|em|%) *)+|auto) *$/],
            'margin-bottom': [/^ *(((-|\+)?\d+(px|em|%) *)+|auto) *$/],
            'margin-left': [/^ *(-|\+)?\d+(?:px|em|%) *$/],
            'margin-right': [/^ *(((-|\+)?\d+(px|em|%) *)+|auto) *$/],
            'padding': [/^ *(((-|\+)?\d+(px|em|%) *)+|auto) *$/],
            'padding-left': [/^ *(-|\+)?\d+(?:px|em|%) *$/],
            'padding-right': [/^ *(((-|\+)?\d+(px|em|%) *)+|auto) *$/],
            'padding-top': [/^ *(((-|\+)?\d+(px|em|%) *)+|auto) *$/],
            'padding-bottom': [/^ *(((-|\+)?\d+(px|em|%) *)+|auto) *$/],
            'border': [/^ *(thin|medium|thick|\d+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
            'border-bottom': [/^ *(thin|medium||\d+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
            'border-top': [/^ *(thin|medium|thick|\d+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
            'border-left': [/^ *(thin|medium|thick|\d+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
            'border-right': [/^ *(thin|medium|thick|\d+(?:px|em|%))? ?(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset) ?((?!url).*)? *$/],
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
    exclusiveFilter: (img) =>
    {
        if (img.tag !== 'img') return false
        if (!img.attribs['src']) return false 
        return !(/^\/uploads\/.*$/.test(img.attribs['src']))
    },
    disallowedTagsMode: 'escape',
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com']
}

const path = require('path')

//views
const ejs = require('ejs')
app.set('view engine', 'ejs')
app.set('views',__dirname + '/views')
app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) =>
{
    res.redirect('/w/FrontPage')
})
app.get('/Licence', async (req, res) =>
{
    await require(__dirname + '/sendfile.js')(req, res, 'Licence', '/license.html')
})
app.get('/noEmail', async (req, res) =>
{
    await require(__dirname + '/sendfile.js')(req, res, '이메일 주소 무단 수집 거부', '/views/etc/noEmail.html')
})
app.get('/signup', async (req, res) =>
{
    const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
    const signuppage = await ejs.renderFile(global.path + '/views/user/signup.ejs',{captcha: captchaSVG})
    res.render('outline',
    {
        title: 'Sign up',
        content: signuppage,
        username: req.session.username,
        wikiname: global.appname
    })
})
app.post('/signup', (req, res) =>
{
    require(__dirname + '/user/signup.js')(req, res, sequelize, users, perm)
})

app.get('/login', csrfProtection, async (req,res) =>
{
    //render page
    const username = req.session.username
    ejs.renderFile(global.path + '/views/user/login.ejs',{csrfToken: req.csrfToken()}, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        res.render('outline',
        {
            title: 'Login',
            content: html,
            //notification: r,
            username: username,
            wikiname: global.appname
        })
    })
})
app.post('/login', csrfProtection, async (req, res) =>
{
    require(__dirname + '/user/login.js')(req, res, users, loginhistory)
})
app.get('/logout', (req, res) =>
{
    req.session.destroy()
    res.redirect('/')
})
app.get('/whoami', (req, res) =>
{
    res.render('outline',{
        title: 'You are',
        content: `${req.session.username}<br>IP Address: ${req.headers['x-forwarded-for'] || req.socket.remoteAddress}`,
        username: req.session.username,
        wikiname: global.appname
    })
})
app.get('/settings', csrfProtection, async (req, res) =>
{
    const username = req.session.username
    if (!username)
    {
        require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
        return
    }
    const sR = await settings.findOne({
        where:
        {
            user: req.session.username,
            key: 'sign'
        }
    })
    const sign = sR ? sR.value : ''
    if (!username)
    {
        require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
        return
    }
    ejs.renderFile(global.path + '/views/user/settings.ejs',
    {
        csrfToken: req.csrfToken(),
        sign: sign
    }, (err, html) => 
    {
        if (err)
        {
            console.error(err)
            res.writeHead(500).write('Internal Server Error')
            return
        }
        res.render('outline',
        {
            title: 'User Settings',
            content: html,
            //notification: r,
            username: username,
            wikiname: global.appname
        })
    })
})
app.post('/settings/:name', csrfProtection, async (req, res) =>
{
    require(__dirname + '/user/settings.js')(req, res,
        {
            settings: settings
        })
})

app.get('/edit/:name', csrfProtection, async (req, res) =>
{
    //TODO: error if the name is too long (>255)s
    if (req.params.name.length > 255)
    {
        require(global.path + '/error.js')(req, res, username, 'The page name given is too long. Pages can be 256 characters long at most.', '/', 'the main page')
        return
    }
    const target = await pages.findOne({where: {title: req.params.name}})
    var username = req.session.username
    //if (username === undefined) = req.headers['x-forwarded-for'] || req.socket.remoteAddress

    //check for protection 
    const pro = await protect.findOne({where: {title: req.params.name, task: 'edit'}})
    var acl = (pro == undefined ? 'everyone' : pro.protectionLevel) //fallback
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, [acl], perm, block, true, true)
    if (r === true)
    {
        //generate CAPTCHA
        const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
        var content = ''
        if (target) content = target.content
        ejs.renderFile(global.path + '/views/pages/edit.ejs',
        {
            title: req.params.name,
            content: content,
            username: username,
            captcha: captchaSVG,
            csrfToken: req.csrfToken()
        }, (err, html) => 
        {
            if (err)
            {
                console.error(err)
                res.writeHead(500).write('Internal Server Error')
                return
            }
            res.render('outline',
            {
                title: 'Edit ' + req.params.name,
                content: html,
                isPage: true,
                pagename: req.params.name,
                username: username,
                wikiname: global.appname
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
        ejs.renderFile(global.path + '/views/pages/edit.ejs',{title: req.params.name, content: content, username: username, disabled: true, csrfToken: req.csrfToken()}, (err, html) => 
        {
            if (err)
            {
                console.error(err)
                res.writeHead(500).write('Internal Server Error')
                return
            }
            res.render('outline',
            {
                title: 'Edit ' + req.params.name,
                content: html,
                isPage: true,
                notification: r,
                pagename: req.params.name,
                username: username,
                wikiname: global.appname
            })
        })
        //require(global.path + '/error.js')(req, res, username, 'You cannot edit because the protection level for this page is ' + acl + '.', '/', 'the main page')
    }
})

app.post('/edit/:name', csrfProtection, async (req, res) =>
{
    const username = req.session.username
    if (req.params.name.length > 255)
    {
        require(global.path + '/error.js')(req, res, username, 'The page name given is too long. Pages can be 256 characters long at most.', '/', 'the main page')
        return
    }
    await require(global.path + '/pages/edit.js')(req, res, req.session.username, users, pages, recentchanges, history, protect, perm, block, category, settings) //actually no need to separately pass on username (in req)
})

app.get('/move/:name', async (req, res) =>
{
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
        require(global.path + '/error.js')(req, res, null, 'You cannot view because the protection level for this page is ' + acl + '.', '/', 'the main page')
        return
    }
    pages.findOne({where: {title: req.params.name}}).then(async (target) =>
    {
        if (!target)
        {
            require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page', 404)
            return
        }
        const username = req.session.username
        //generate CAPTCHA
        const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
        ejs.renderFile(global.path + '/views/pages/move.ejs',
        {
            originalName: req.params.name,
            username: username,
            captcha: captchaSVG
        }, (err, html) => 
        {
            res.render('outline',
            {
                title: 'Move ' + req.params.name,
                content: html,
                username: username,
                wikiname: global.appname
            })
        })
    })
})
app.post('/move/:name', async (req, res) =>
{
    await require(global.path + '/pages/move.js')(req, res, req.session.username, users, pages, recentchanges, history, perm, block, protect)
})
app.get('/delete/:name', csrfProtection, (req, res) =>
{
    const username = req.session.username
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
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
                    ejs.renderFile(global.path + '/views/pages/delete.ejs',{title: req.params.name, username: username, csrfToken: req.csrfToken()}, (err, html) => 
                    {
                        res.render('outline',
                        {
                            title: 'Delete ' + req.params.name,
                            isPage: true,
                            pagename: target.title,
                            content: html,
                            username: username,
                            wikiname: global.appname
                        })
                    })
                }
                else
                {
                    require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page')
                }
            })
        }
        else
        {
            require(global.path + '/error.js')(req, res, null, 'You do not have permission to delete page.', '/login', 'the login page')
        }
    })
})
app.post('/delete/:name', csrfProtection, (req, res) =>
{
    require(global.path + '/pages/delete.js')(req,res,req.session.username,users,pages,recentchanges,history, perm)
})
app.get('/revert/:name', async (req, res) =>
{
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
        require(global.path + '/error.js')(req, res, username, 'You cannot view because the protection level for this page is ' + acl + '.', '/', 'the main page')
        return
    }
    const p = await pages.findOne({where: {title: req.params.name}})
    if (!p)
    {
        require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page', 404)
        return
    }
    const username = req.session.username
    const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
    ejs.renderFile(global.path + '/views/pages/revert.ejs',
    {
        pagename: req.params.name,
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
        res.render('outline',
        {
            title: 'Revert ' + req.params.name + ' to r' + req.query.rev,
            content: html,
            username: username,
            wikiname: global.appname
        })
    })
})
app.post('/revert/:name', async (req, res) =>
{
    await require(global.path + '/pages/revert.js')(req, res, req.session.username, users, pages, recentchanges, history, protect, perm, block)
})
app.get('/w/:name', async (req, res) =>
{
    await require(global.path + '/pages/view.js')(req, res, pages, history, protect, perm, block, category, viewcount, updateTime)
})
app.post('/w', async (req,res) =>
{
    await res.redirect('/w/' + req.body.pagename)
})
app.post('/preview', async (req, res) =>
{
    await require(global.path + '/pages/preview.js')(req, res, pages, category)
})
app.get('/search', async (req, res) =>
{
    await require(global.path + '/pages/search.js')(req, res, pages)
})
app.post('/search', async (req, res) =>
{
    await require(global.path + '/pages/navSearch.js')(req, res, pages)
})
app.get('/protect/:name', async (req, res) =>
{
    await require(global.path + '/admin/protectGet.js')(req, res, perm, protect, block)
})
app.post('/protect/:name', async (req, res) =>
{
    await require(global.path + '/admin/protectPost.js')(req, res, perm, protect, pages, history, recentchanges, block)
})
app.get('/raw/:name', async (req, res) =>
{
    await require(global.path + '/pages/raw.js')(req, res, pages, history, protect, perm, block)
})
app.get('/history/:name', (req, res) =>
{
    require(global.path + '/pages/history.js')(req, res, history)
})
app.get('/RecentChanges', async (req, res) =>
{
    await require(global.path + '/sendfile.js')(req, res, 'RecentChanges', '/views/pages/recentchanges.html')
})
app.get('/PageList', (req, res) =>
{
    require(global.path + '/pages/pagelist.js')(req, res, pages)
})

app.get('/Upload', async (req, res) =>
{
    const username = req.session.username
    const captchaSVG = await require(global.path + '/tools/captcha.js').genCaptcha(req)
    ejs.renderFile(global.path + '/views/files/upload.ejs',
    {
        username: username,
        captcha: captchaSVG
    }, (err, html) => 
    {
        res.render('outline',
        {
            title: 'Upload',
            content: html,
            username: username,
            wikiname: global.appname
        })
    })
})
const multer = require('multer')
const fs = require('fs')
function checkFileType(file, cb)
{
    //https://stackoverflow.com/questions/60408575/how-to-validate-file-extension-with-multer-middleware
    const filetypes = /jpeg|jpg|png|gif|webp/i
    const ext = filetypes.test(path.extname(file.originalname).toLowerCase())
    const mime = filetypes.test(file.mimetype)
    if (mime && ext)
    {
        return cb(null,true)
    }
    else
    {
        cb('You can only upload JPEG, JPG, PNG, GIF and WebP files.')
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
            if (fs.existsSync(__dirname + '/public/uploads/' + req.body.filename))
            {
                let e = new Error('File already exists')
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
var upload = multer({
    storage: storage,
    limits:
    {
        fields: 3,
        fieldNameSize: 255,
        fileSize: 4 * 1024 * 1024
    },
    fileFilter: async (req, file, cb) =>
    {
        const p = await perm.findOne({where: {perm: 'bypasscaptcha', username: req.session.username}})
        if (p)
        {
            //do nothing
        }
        else
        {
            if (req.body.captcha !== req.session.captcha)
            {
                console.error('止まれ')
                let e = new Error('Captcha Error')
                e.code = 'INVALIDCAPTCHA'
                return cb(e)
            }
            else
            {
                req.session.captcha = require(global.path + '/tools/captcha.js').genArbitaryString(16)
            }
        }
        checkFileType(file, cb)
    }
})
app.post('/Upload', upload.single('inputFile'), (req, res) =>
{
    //exploit: user can upload by sending a POST request directly
    mfile.create(
    {
        filename: req.body.filename,
        uploader: req.session.username,
        explanation: req.body.explanation
    }).then(() =>
    {
        recentchanges.create(
        {
            page: req.body.filename,
            rev: 0,
            doneBy: req.session.username,
            comment: `Uploaded ${req.body.filename}`,
            bytechange: req.body.explanation.length,
            type: 'upload'
        })
        res.redirect('/file/' + req.body.filename)
    })
})
app.get('/diff/:name', async (req, res) =>
{
    //usage example: /diff/FrontPage?rev1=20&rev2=30 (compare r20 and r30)
    await require(global.path + '/pages/diff.js')(req, res, history, protect, perm, block)
})
app.get('/file/:name', async (req, res) => 
{
    await require(global.path + '/files/viewfile.js')(req, res, mfile)
})
app.get('/deletefile/:name', csrfProtection, (req, res) =>
{
    const username = req.session.username
    if (username === undefined)
    {
        require(global.path + '/error.js')(req, res, null, 'Please login.', '/login', 'the login page')
        return
    }
    perm.findOne({where: {username: username, perm: 'deletefile'}}).then(p =>
    {
        if (!p)
        {
            require(global.path + '/error.js')(req, res, null, 'You do not have permission to delete file.', '/login', 'the login page')
            return
        }
        mfile.findOne({where: {filename: req.params.name}}).then(target =>
            {
                if (target)
                {
                    const username = req.session.username
                    ejs.renderFile(global.path + '/views/files/delete.ejs',{title: req.params.name, username: username, csrfToken: req.csrfToken()}, (err, html) => 
                    {
                        res.render('outline',
                        {
                            title: 'Delete ' + req.params.name,
                            content: html,
                            username: username,
                            wikiname: global.appname
                        })
                    })
                }
                else
                {
                    require(global.path + '/error.js')(req, res, null, 'The file requested is not found. Would you like to <a href="/upload/'+req.params.name+'">upload one?</a>', '/', 'the main page')
                }
            })
    })
})
app.post('/deletefile/:name', csrfProtection, (req, res) =>
{
    require(global.path + '/files/deletefile.js')(req, res, mfile, history, recentchanges, perm)
})
app.get('/FileList', (req, res) =>
{
    require(global.path + '/files/filelist.js')(req, res, mfile)
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
        await require(global.path + '/error.js')(req, res, null, 'Please Login.', '/login', 'the login page')
        return
    }
    if (perm.findOne({where:{username: req.session.username, perm: 'admin'}}))
    {
        await require(__dirname + '/sendfile.js')(req, res, 'Admin tools', '/views/admin/index.html')
    }
    else
    {
        await require(global.path + '/error.js')(req, res, null, 'You need admin permission.', '/', 'the main page')
    }
})
app.get('/admin/:name', csrfProtection, async (req, res) =>
{
    //handler
    await require(global.path + '/admin/adminGetHandler.js')(req, res, users, perm, loginhistory, adminlog)
})
app.post('/admin/:name', csrfProtection, async (req, res) =>
{
    await require(global.path + '/admin/adminPostHandler.js')(req, res, users, perm, block, pages, protect, adminlog)
})
app.get('/adminlog', async (req, res) =>
{
    await require(global.path + '/admin/adminlog.js')(req, res, adminlog)
})

app.get('/category/:name', async (req, res) =>
{
    await require(global.path + '/pages/category.js')(req, res, category)
})

app.get('/contribution/:name', async (req, res) =>
{
    await require(global.path + '/user/contribution.js')(req, res, history)
})

app.get('/viewrank', async (req, res) =>
{
    await require(global.path + '/pages/viewrank.js')(req, res, viewcount)
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

app.get('/robots.txt', (req, res) =>
{
    res.type('text/plain')
    res.send('User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /login\nDisallow: /logout\nDisallow: /signup\nDisallow: /settings\nDisallow: /upload\nDisallow: /file/\nUser-agent: Googlebot-Image\nDisallow: /')
})
app.get('/lovelive', (req, res) =>
{
    res.send('<h1><b style="color:#FB217F">LoveLive!!</b></h1>')
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
                require(__dirname + '/sendfile.js')(req, res, 'CSRF token error', '/csrfError.html')
            }
            break
        case 'FILENAMENULL':
            {
                require(global.path + '/error.js')(req, res, null, 'File name cannot be blank.', 'javascript:window.history.back()', 'the previous page')
            }
            break
        case 'FILEEXISTS':
            {
                require(global.path + '/error.js')(req, res, null, 'File already exists. Please change the file name.', 'javascript:window.history.back()', 'the previous page')
            }
            break
        case 'PROCESSED':
            break
        case 'INVALIDCAPTCHA':
            {
                require(global.path + '/error.js')(req, res, null, 'Please complete CAPTCHA correctly.', 'javascript:window.history.back()', 'the previous page')
            }
            break
        default:
            {
                console.error(err)
                console.error(err.stack)
                res.status(500).send('Internal Server Error')
            }
            break
    }
})

var server = app.listen(port, '0.0.0.0', () =>
{
    const host = server.address().address
    const port = server.address().port
    console.log("App listening at http://%s:%s",host,port)
})
