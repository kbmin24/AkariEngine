const pagesRoutes = require('./pages.routes')
const adminRoutes = require('./admin.routes')
const userRoutes = require('./user.routes')
const uploadRoutes = require('./upload.routes')
const threadsRoutes = require('./threads.routes')
const ajaxRoutes = require('./ajax.routes')
const miscRoutes = require('./misc.routes')

module.exports = (app, services, options = {}) => {
    app.use('/', pagesRoutes(services, options))
    app.use('/', adminRoutes(services, options))
    app.use('/', userRoutes(services, options))
    app.use('/', uploadRoutes(services, options))
    app.use('/', threadsRoutes(services, options))
    app.use('/', ajaxRoutes(services, options))
    app.use('/', miscRoutes(services, options))
}
