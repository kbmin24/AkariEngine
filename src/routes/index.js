const pagesRoutes = require('./pages.routes')
const adminRoutes = require('./admin.routes')
const userRoutes = require('./user.routes')

module.exports = (app, services, options = {}) => {
    app.use('/', pagesRoutes(services, options))
    app.use('/', adminRoutes(services, options))
    app.use('/', userRoutes(services, options))
}
