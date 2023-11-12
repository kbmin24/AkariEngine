//ext.js: extension manager
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
module.exports = async (app, ext) =>
{
    let registerHook = async (hook, f) =>
    {
        global.hooks[hook].push(f)
    }
    for (let e of global.conf.extensions)
    {
        let extManifest = require(`${global.path}/extensions/${e}/manifest.json`)
        let obj = require(`${global.path}/extensions/${e}/main.js`)
        extensions[e] = {'manifest': extManifest, 'obj': obj}
    }
    for (let e of global.conf.extensions)
    {
        extensions[e].obj(app, registerHook, registerDB)
    }
}