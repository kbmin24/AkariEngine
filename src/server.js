const { Router } = require('express')
const express = require('express')
const app = express()

app.use(express.json())
app.use(express.urlencoded({extended: false}))

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

const port = 8080
global.appname = 'testwiki'
global.path = __dirname

//initialise db
const {Sequelize} = require('sequelize')
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: __dirname + '/db.sqlite'
})

//db
const users = require(__dirname + '/models/user.model.js')(sequelize)
const pages = require(__dirname + '/models/page.model.js')(sequelize)
sequelize.sync()

//views
const ejs = require('ejs')
app.set('view engine', 'ejs')
app.set('views',__dirname + '/views')
app.use(express.static(__dirname + '/public'))

app.get('/', (req, res) =>
{
    res.redirect('/w/FrontPage')
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

app.get('/edit/:name', (req, res) =>
{
    //TODO: error if the name is too long (>255)s
    ejs.renderFile(global.path + '/views/pages/edit.ejs',{title: req.params.name}, (err, html) => 
    {
        const username = req.session.username
        res.render('outline',
        {
            title: 'Edit ' + req.params.name,
            content: html,
            username: username,
            wikiname: global.appname
        })
    })
})

app.post('/edit/:name', (req, res) =>
{
    require(global.path + '/pages/edit.js')(req, res, req.session.username, users, pages) //actually no need to separately pass on username (in req)
})

app.get('/w/:name', (req, res) =>
{
    require(global.path + '/pages/view.js')(req, res, pages)
})

app.get('/raw/:name', (req, res) =>
{
    res.setHeader('content-type', 'text/plain')
    require(global.path + '/pages/raw.js')(req, res, pages)
})

var server = app.listen(port, () =>
{
    const host = server.address().address
    const port = server.address().port
    console.log("App listening at http://%s:%s",host,port)
})
