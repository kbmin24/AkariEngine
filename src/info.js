//error.js: display error to the user.
module.exports = (req, res, username, description, returnlink, returnname, code=200) =>
{
    if (username === null)
    {
        res.status(code)
        res.render('outline',{
            title: 'Information',
            content: description + '<br>Return to ' + '<a href="' + returnlink + '">' + returnname + '</a>.',
            wikiname: global.appname
        })
    }
    else
    {
        res.status(code)
        res.render('outline',{
            title: 'Information',
            content: description + '<br>Return to ' + '<a href="' + returnlink + '">' + returnname + '</a>.',
            username: username,
            wikiname: global.appname
        })
    }
}