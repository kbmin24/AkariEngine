//error.js: display error to the user.
module.exports = (req, res, username, description, returnlink, returnname) =>
{
    if (username === null)
    {
        res.render('outline',{
            title: 'Error!',
            content: description + '<br>Return to ' + '<a href="' + returnlink + '">' + returnname + '</a>.',
            wikiname: global.appname
        })
    }
    else
    {
        res.render('outline',{
            title: 'Error!',
            content: description + '<br>Return to ' + '<a href="' + returnlink + '">' + returnname + '</a>.',
            username: username,
            wikiname: global.appname
        })
    }
}