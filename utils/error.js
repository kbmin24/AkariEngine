//error.js: display error to the user.
const i18n = require("i18n")

module.exports = (req, res, options = {}) => {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('error.js expects options object: { description, returnLink, returnName, statusCode }')
    }

    const {
        description,
        returnLink,
        returnName,
        statusCode
    } = options

    const content = i18n.__('error_returnInfo', {
        description: description || i18n.__('unknown_error'),
        link: returnLink || '/',
        linkname: returnName || i18n.__('mainpage'),
        interpolation: { escapeValue: false }
    })

    res.status(statusCode || 200)
    require('../view.js')(req, res, {
        title: 'Error!',
        content,
        username: req.session.username,
        ipaddr: req.ipAddress
    })
}
