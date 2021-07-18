const { Router } = require('express')
const express = require('express')
const app = express()

const port = 8080
global.appname = 'testwiki'
global.path = __dirname
//global.loopbackAddress = 'http://127.0.0.1:' + port.toString() //change if running behind a load balancer
global.license = 'CC BY-SA 3.0'
global.copyrightNotice = `By saving this edit, you are allowing ${global.appname} to distribute your contribution under ${global.license}. This cannot be undone.`
global.dtFormat = 'YYYY/MM/DD HH:mm:ss'
global.perms = ['developer', 'grant', 'admin', 'deletepage', 'acl', 'globalacl']
//session
const secret = '6YOhz+9FXUDnTCl1OcqUTDbE0yy39a37JDUYvuhdhQ/PNXopXu7iLKFdnIEFKlQv5WcwHD4hDn8Gg8Pb4DgEIg=='
const session = require('express-session')
const cookieParser = require('cookie-parser')
app.use(cookieParser(secret))
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: secret,
    cookie:
    {
        secure: false,
        httpOnly: true //so that the cookie cannot be taken away
    }
}))

app.use(express.json())
app.use(express.urlencoded({extended: false}))

app.disable('x-powered-by')


//initialise db
const {Sequelize} = require('sequelize')
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: __dirname + '/db.sqlite'
})

//db
const users = require(__dirname + '/models/user.model.js')(sequelize)
const pages = require(__dirname + '/models/page.model.js')(sequelize)
const recentchanges = require(__dirname + '/models/recentchanges.model.js')(sequelize)
const history = require(__dirname + '/models/history.model.js')(sequelize)
const mfile = require(__dirname + '/models/file.model.js')(sequelize)
const perm = require(__dirname + '/models/perm.model.js')(sequelize)
const protect = require(__dirname + '/models/protect.model.js')(sequelize)
const adminlog = require(__dirname + '/models/adminlog.model.js')(sequelize)
sequelize.sync()


global.sanitiseOptions =
{
    allowedTags: ['div', 'span', 'blockquote', 'p', 'pre',
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
        a: ['href', 'name', 'id', 'target', 'rel', 'class', 'title'],
        i: ['class', 'id', 'aria-hidden'],
        font: ['class', 'id', 'style', 'size', 'color', 'face'],
        div: ['class', 'id', 'style'],
        span: ['class', 'id', 'style'],
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
        thead: ['class', 'id', 'style', 'colspan', 'rowspan'],
        tbody: ['class', 'id', 'style', 'colspan', 'rowspan'],
        iframe: ['class', 'width', 'height', 'src', 'frameborder', 'allow', 'allowfullscreen'],
        img: ['class', 'id', 'style', 'height', 'width', 'src']
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
app.get('/License', (req, res) =>
{
    require(__dirname + '/sendfile.js')(req, res, 'License', '/license.html')
})
app.get('/noEmail', (req, res) =>
{
    require(__dirname + '/sendfile.js')(req, res, '이메일 주소 무단 수집 거부', '/views/etc/noEmail.html')
})
app.get('/signup', (req, res) =>
{
    require(__dirname + '/sendfile.js')(req, res, 'Sign up', '/views/user/signup.html')
})
app.post('/signup', (req, res) =>
{
    require(__dirname + '/user/signup.js')(req, res, sequelize,users)
})

app.get('/login', (req,res) =>
{
    require(__dirname + '/sendfile.js')(req, res, 'Login', '/views/user/login.html')
})
app.post('/login', (req, res) =>
{
    require(__dirname + '/user/login.js')(req, res, sequelize,users)
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
        content: req.session.username,
        wikiname: global.appname
    })
})

app.get('/edit/:name', async (req, res) =>
{
    //TODO: error if the name is too long (>255)s
    if (req.params.name.length > 255)
    {
        require(global.path + '/error.js')(req, res, username, 'The page name given is too long. Pages can be 256 characters long at most.', '/', 'the main page')
        return
    }
    const target = await pages.findOne({where: {title: req.params.name}})
    var username = req.session.username
    if (username === undefined) doneby = req.headers['x-forwarded-for'] || req.socket.remoteAddress

    //check for protection 
    const pro = await protect.findOne({where: {title: req.params.name, task: 'edit'}})
    var acl = (pro == undefined ? 'everyone' : pro.protectionLevel) //fallback
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, acl, perm)
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
        require(global.path + '/error.js')(req, res, username, 'You cannot edit because the protection level for this page is ' + acl + '.', '/', 'the main page')
        return
    }

    var content = ''
    if (target) content = target.content
    ejs.renderFile(global.path + '/views/pages/edit.ejs',{title: req.params.name, content: content, username: username}, (err, html) => 
    {
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
})

app.post('/edit/:name', async (req, res) =>
{
    if (req.params.name.length > 255)
    {
        require(global.path + '/error.js')(req, res, username, 'The page name given is too long. Pages can be 256 characters long at most.', '/', 'the main page')
        return
    }
    await require(global.path + '/pages/edit.js')(req, res, req.session.username, users, pages, recentchanges, history, protect, perm) //actually no need to separately pass on username (in req)
})

app.get('/move/:name', (req, res) =>
{
    pages.findOne({where: {title: req.params.name}}).then(target =>
    {
        if (target) content = target.content
        const username = req.session.username
        ejs.renderFile(global.path + '/views/pages/move.ejs',{originalName: req.params.name, username: username,}, (err, html) => 
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
app.post('/move/:name', (req, res) =>
{
    require(global.path + '/pages/move.js')(req, res, req.session.username, users, pages, recentchanges, history)
})
app.get('/delete/:name', (req, res) =>
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
                    ejs.renderFile(global.path + '/views/pages/delete.ejs',{title: req.params.name, username: username}, (err, html) => 
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
app.post('/delete/:name', (req, res) =>
{
    require(global.path + '/pages/delete.js')(req,res,req.session.username,users,pages,recentchanges,history, perm)
})
app.get('/revert/:name', async (req, res) =>
{
    await require(global.path + '/pages/revert.js')(req, res, req.session.username, users, pages, recentchanges, history, protect, perm)
})
app.get('/w/:name', async (req, res) =>
{
    await require(global.path + '/pages/view.js')(req, res, pages, history, protect, perm)
})
app.post('/w', async (req,res) =>
{
    await res.redirect('/w/' + req.body.pagename)
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
    await require(global.path + '/admin/protectGet.js')(req, res, perm, protect)
})
app.post('/protect/:name', async (req, res) =>
{
    await require(global.path + '/admin/protectPost.js')(req, res, perm, protect, pages, history, recentchanges)
})
app.get('/raw/:name', async (req, res) =>
{
    await require(global.path + '/pages/raw.js')(req, res, pages, history, protect, perm)
})
app.get('/history/:name', (req, res) =>
{
    require(global.path + '/pages/history.js')(req, res, history)
})
app.get('/RecentChanges', (req, res) =>
{
    require(global.path + '/sendfile.js')(req, res, 'RecentChanges', '/views/pages/recentchanges.html')
})
app.get('/PageList', (req, res) =>
{
    require(global.path + '/pages/pagelist.js')(req, res, pages)
})

app.get('/Upload', (req, res) =>
{
    const username = req.session.username
    ejs.renderFile(global.path + '/views/files/upload.ejs', {username: username}, (err, html) => 
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
app.get('/diff/:name', async (req, res) =>
{
    //usage example: /diff/FrontPage?rev1=20&rev2=30 (compare r20 and r30)
    await require(global.path + '/pages/diff.js')(req, res, history, protect, perm)
})
const multer = require('multer')
const fs = require('fs')
function checkFileType(file, cb)
{
    //https://stackoverflow.com/questions/60408575/how-to-validate-file-extension-with-multer-middleware
    const filetypes = /jpeg|jpg|png|gif|webp/
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
            cb('Filename cannot be null')
        }
        try
        {
            //todo: refuse comma
            if (fs.existsSync(__dirname + '/public/uploads/' + req.body.filename))
            {
                cb('File already exists.')
            }
            else
            {
                cb(null, req.body.filename.trim()) //req.body.filename
            }
        }
        catch(err)
        {
            cb(err + 'Internal Server Error')
        }
    }
})
var upload = multer({
    storage: storage,
    limits:
    {
        fields: 3,
        fieldNameSize: 255,
        fieldSize: 20 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => checkFileType(file, cb)
})
app.post('/Upload', upload.single('inputFile'), (req, res, ) =>
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

app.get('/file/:name', async (req, res) => 
{
    await require(global.path + '/files/viewfile.js')(req, res, mfile)
})
app.get('/deletefile/:name', (req, res) =>
{
    mfile.findOne({where: {filename: req.params.name}}).then(target =>
        {
            if (target)
            {
                const username = req.session.username
                ejs.renderFile(global.path + '/views/files/delete.ejs',{title: req.params.name, username: username}, (err, html) => 
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
app.post('/deletefile/:name', (req, res) =>
{
    require(global.path + '/files/deletefile.js')(req, res, mfile, history, recentchanges)
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
    const r = await require(global.path + '/pages/satisfyACL.js')(req, res, 'admin', perm)
    if (r)
    {
        require(__dirname + '/sendfile.js')(req, res, 'Admin tools', '/views/admin/index.html')
    }
    else if (r === undefined)
    {
        return //error message already given out
    }
    else
    {
        require(global.path + '/error.js')(req, res, null, 'You need admin permission.', '/', 'the main page')
    }
})
app.get('/admin/:name', (req, res) =>
{
    //handler
    require(global.path + '/admin/adminGetHandler.js')(req, res, users, perm)
})
app.post('/admin/:name', (req, res) =>
{
    require(global.path + '/admin/adminPostHandler.js')(req, res, users, perm, adminlog)
})
app.get('/adminlog', async (req, res) =>
{
    await require(global.path + '/admin/adminlog.js')(req, res, adminlog)
})
app.get('/ajax/autocomplete', async (req, res) =>
{
    await require(global.path + '/pages/autocompleteAJAX.js')(req, res, pages)
})

app.get('/ajax/recentchanges', async (req, res) =>
{
    await require(global.path + '/pages/recentchanges.js')(req, res, recentchanges)
})

app.get('/lovelive', (req, res) =>
{
    res.send('<h1><b style="color:#FB217F">LoveLive!!</b></h1>')
    return
})

var server = app.listen(port, '0.0.0.0', () =>
{
    const host = server.address().address
    const port = server.address().port
    console.log("App listening at http://%s:%s",host,port)
})
