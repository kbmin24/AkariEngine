import pagesRoutes from './pages.routes.js'
import adminRoutes from './admin.routes.js'
import userRoutes from './user.routes.js'
import uploadRoutes from './upload.routes.js'
import threadsRoutes from './threads.routes.js'
import ajaxRoutes from './ajax.routes.js'
import miscRoutes from './misc.routes.js'

export default (app, services, options = {}) => {
    app.use('/', pagesRoutes(services, options))
    app.use('/', adminRoutes(services, options))
    app.use('/', userRoutes(services, options))
    app.use('/', uploadRoutes(services, options))
    app.use('/', threadsRoutes(services, options))
    app.use('/', ajaxRoutes(services, options))
    app.use('/', miscRoutes(services, options))
}
