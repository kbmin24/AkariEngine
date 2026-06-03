import pagesRoutes from './pages.routes.js'
import adminRoutes from './admin.routes.js'
import userRoutes from './user.routes.js'
import uploadRoutes from './upload.routes.js'
import threadsRoutes from './threads.routes.js'
import ajaxRoutes from './ajax.routes.js'
import miscRoutes from './misc.routes.js'

export default (app, services, options = {}) => {
    app.use('/api', pagesRoutes(options))
    app.use('/api', adminRoutes(options))
    app.use('/api', userRoutes(options))
    app.use('/api', uploadRoutes())
    app.use('/api', threadsRoutes(options))
    app.use('/api', ajaxRoutes())
    app.use('/api', miscRoutes())
}
