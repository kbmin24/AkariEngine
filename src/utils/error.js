//error.js: display error to the user.
import renderView from '../view.js'

export default (req, res, options = {}) => {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('error.js expects options object: { description, returnLink, returnName, statusCode }')
    }

    const {
        description,
        returnLink,
        returnName,
        statusCode
    } = options

    const content = res.__('error_returnInfo', {
        description: description || res.__('unknown_error'),
        link: returnLink || '/',
        linkname: returnName || res.__('mainpage'),
        interpolation: { escapeValue: false }
    })

    res.status(statusCode || 200)
    renderView(req, res, {
        title: 'Error!',
        content,
        username: req.session.username,
        ipaddr: req.ipAddress
    })
}
