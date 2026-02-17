const path = require('path')
const config = require('../config')

class PathResolver {
    constructor(basePath) {
        this.base = basePath
    }

    resolve(...segments) {
        return path.join(this.base, ...segments)
    }

    get models() { return this.resolve('models') }
    get views() { return this.resolve('views') }
    get pages() { return this.resolve('pages') }
    get admin() { return this.resolve('admin') }
    get tools() { return this.resolve('tools') }
    get locales() { return this.resolve('locales') }
    get public() { return this.resolve('public') }
    get services() { return this.resolve('services') }
    get middleware() { return this.resolve('middleware') }
    get utils() { return this.resolve('utils') }
    get controllers() { return this.resolve('controllers') }

    model(name) { return this.resolve('models', `${name}.model.js`) }
    view(name) { return this.resolve('views', name) }
    middleware(name) { return this.resolve('middleware', `${name}.js`) }
    utils(name) { return this.resolve('utils', `${name}.js`) }
    tools(name) { return this.resolve('tools', `${name}.js`) }
    services(name) { return this.resolve('services', `${name}.js`) }
    pages(name) { return this.resolve('pages', `${name}.js`) }
    controllers(name) { return this.resolve('controllers', `${name}.js`) }
}

module.exports = new PathResolver(config.basePath)
