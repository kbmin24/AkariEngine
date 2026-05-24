import pagesRoutes from './pages.routes.js'
import adminRoutes from './admin.routes.js'
import userRoutes from './user.routes.js'
import uploadRoutes from './upload.routes.js'
import threadsRoutes from './threads.routes.js'
import ajaxRoutes from './ajax.routes.js'
import miscRoutes from './misc.routes.js'

export default (app, services, options = {}) => {
    app.use('/', pagesRoutes(options))
    app.use('/', adminRoutes(options))
    app.use('/', userRoutes(options))
    app.use('/', uploadRoutes())
    app.use('/', threadsRoutes(options))
    app.use('/', ajaxRoutes())
    app.use('/', miscRoutes())
}
