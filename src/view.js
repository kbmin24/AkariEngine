// View.js: renderer
var ejs = require('ejs')
module.exports = async (req, res, renderOpt) =>
{
    let args = structuredClone(renderOpt)

    args.username = req.session.username,
    args.ipaddr = (req.headers['x-forwarded-for'] || req.socket.remoteAddress)

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
    args.skinPath = `${global.path}/skins/${skin.name}/`
    args.isAdmin = isAdmin

    //render common head
    ejs.renderFile(global.path + '/views/head.ejs', args, (err, html) => 
    {
        args.commonHead = html
        res.render(args.skinPath + 'outline.ejs', args)
    })

}