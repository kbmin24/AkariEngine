//error.js: display error to the user.
module.exports = (req, res, username, description, returnlink, returnname, code=200, lang='en_GB') =>
{
    let content = global.i18n.__('error_returnInfo', {description: description, link: returnlink, linkname: returnname, interpolation: { escapeValue: false }})
    res.status(code)
    require(global.path + '/view.js')(req, res,{
        title: 'Error!',
        content: content,
        username: req.session.username,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress)
    })
}