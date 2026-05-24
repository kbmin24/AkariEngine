import renderView from './view.js'

/**
 * Renders an info page with the provided options.
 * @param {Object} req - The Express request object.
 * @param {Object} res - The Express response object.
 * @param {Object} [options={}] - An object containing options for the info page.
 * @param {String} [options.description] - A description of the information to display to the user.
 * @param {String} [options.returnLink] - A URL to link to for returning from the info page.\
 * @param {String} [options.returnName] - The display name for the return link.
 * @param {Number} [options.statusCode=200] - The HTTP status code to set for the response.
 * @throws {TypeError} If the options parameter is not an object or is an array.
 */
export default (req, res, options = {}) => {
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
        throw new TypeError('info.js expects options object: { description, returnLink, returnName, statusCode }')
    }

    const {
        description,
        returnLink,
        returnName,
        statusCode
    } = options

    const content = res.__('info_returnInfo', {
        description: description || '',
        link: returnLink || '/',
        linkname: returnName || res.__('mainpage'),
        interpolation: { escapeValue: false }
    })

    res.status(statusCode || 200)
    renderView(req, res, {
        title: 'Information',
        content,
        username: req.session.username,
        ipaddr: req.ipAddress
    })
}
