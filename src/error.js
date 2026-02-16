//error.js: display error to the user.
const paths = require('./utils/paths')

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

    const content = global.i18n.__('error_returnInfo', {
        description: description || global.i18n.__('unknown_error'),
        link: returnLink || '/',
        linkname: returnName || global.i18n.__('mainpage'),
        interpolation: { escapeValue: false }
    })

    res.status(statusCode || 200)
    require(paths.resolve('view.js'))(req, res, {
        title: 'Error!',
        content,
        username: req.session.username,
        ipaddr: req.ipAddress
    })
}
