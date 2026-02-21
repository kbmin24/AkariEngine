// similar to error.js but for information
// TODO enforce use of i18n
const paths = require('./utils/paths')

module.exports = (req, res, username, description, returnlink, returnname, code=200, lang='en') =>
{
    username = req.session.username
    res.status(code)
    if (lang=='ko')
    {
        require(paths.resolve('view.js'))(req, res,{
            title: '정보',
            content: description + '<br>' + '<a href="' + returnlink + '">' + returnname + '</a>(으)로 돌아갑니다.',
            username: username,
            ipaddr: req.ipAddress
        })
    }
    else
    {
        require(paths.resolve('view.js'))(req, res,{
            title: 'Information',
            content: description + '<br>Return to ' + '<a href="' + returnlink + '">' + returnname + '</a>.',
            username: username,
            ipaddr: req.ipAddress
        })
    }
}
