// View.js: renderer
var ejs = require('ejs')
const paths = require('./utils/paths')
const logger = require(paths.utils('logger'))
module.exports = async (req, res, renderOpt) =>
{
    let args = structuredClone(renderOpt)

    args.username = req.session.username,
    args.ipaddr = req.ipAddress // TODO look at all references to this function and remove any ref to ipAddress (it's done here)

    //load skin
    let skin = global.skins[0]

    //if available, choose skin
    if (req.session.username)
    {
        const skinSetting = await global.db['settings'].findOne({where: {user: req.session.username, key: 'skin'}})
        if (skinSetting != null)
        {
            const skinVal = skinSetting.value
            global.skins.forEach(e =>{
                if (e['name'] === skinVal)
                {
                    skin = e
                }
            })
        }
    }

    let isAdmin = false
    //see if user is 
    if (req.session.username)
    {
        const p = await global.db['perm'].findOne({where: {username: req.session.username, perm: 'admin'}})
        if (p) isAdmin = true
    }
    
    args.skinName = skin['name']
    args.publicPath= `/skins/${skin.name}/`
    args.skinPath = paths.resolve('skins', skin.name) + '/'
    args.isAdmin = isAdmin

    //render common head
    ejs.renderFile(paths.view('head.ejs'), args, (err, html) => 
    {
        if (err) {
            logger.error('Head rendering failed', err)
            // TODO make prettier 500 page (that doesn't use any ejs for obvious reasons)
            return res.status(500).send('Internal Server Error')
        }
        args.commonHead = html
        res.render(args.skinPath + 'outline.ejs', args)
    })

}
