import path from 'path'
import config from '../config/index.js'

class PathResolver {
    constructor(basePath) {
        this.base = basePath
    }

    resolve(...segments) {
        return path.join(this.base, ...segments)
    }

    get models() { return this.resolve('src/models') }
    get views() { return this.resolve('src/views') }
    get pages() { return this.resolve('src/pages') }
    get admin() { return this.resolve('src/admin') }
    get locales() { return this.resolve('locales') }
    get public() { return this.resolve('public') }
    get uploads() { return this.resolve('uploads')}
    get services() { return this.resolve('src/services') }
    get middlewares() { return this.resolve('src/middlewares') }
    get utilities() { return this.resolve('src/utils') }
    get controllers() { return this.resolve('src/controllers') }

    model(name) { return this.resolve('src/models', `${name}.model.js`) }
    view(name) { return this.resolve('src/views', name) }
    middleware(name) { return this.resolve('src/middlewares', `${name}.js`) }
    upload(name) { return this.resolve('uploads', name) }
    util(name) { return this.resolve('src/utils', `${name}.js`) }
    utils(name) { return this.resolve('src/utils', `${name}.js`) }
    tool(name) { return this.resolve('src/tools', `${name}.js`) }
    service(name) { return this.resolve('src/services', `${name}.js`) }
    page(name) { return this.resolve('src/pages', `${name}.js`) }
    controller(name) { return this.resolve('src/controllers', `${name}.js`) }
}

export default new PathResolver(config.basePath);
