//ext.js: extension manager
import paths from '../src/utils/paths.js'

import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

let extensions = {}
global.extensions = extensions
global.hooks = {
    'beginRender': [], //right after processing redirects
    'endRender': [], //right before sanitising everything
}
let registerHook = async (hook, f) =>
{
    global.hooks[hook].push(f)
}
let registerDB = async(name, model) =>
{
    //name: name by which the DB model will be accessed with.
    //model: supply the model defined with 'sequelize.define', NOT the file path.
    global.db[name] = model(global.sequelize)
}

export default async (app) =>
{
    // TODO change it so that it doesn't use global.conf.extensions directly
    for (let e of global.conf.extensions)
    {
        const manifestPath = paths.resolve(path.join(`extensions/${e}/manifest.json`))
        const extPath = paths.resolve(path.join(`extensions/${e}/main.js`))
        const extManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
        const { default: obj } = await import(pathToFileURL(extPath).href)
        extensions[e] = {'manifest': extManifest, 'obj': obj}
    }
    for (let e of global.conf.extensions)
    {
        extensions[e].obj(app, registerHook, registerDB)
    }
}
