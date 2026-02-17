const paths = require('../utils/paths')
const i18n = require("i18n")

async function getCategory(title, category, categorys)
{
    let categorySwitch = /User:.*/.test(title) ? (categorys == 'on') : (categorys != 'off')
    const categories = await category.findAll({where: {page: title}})

    const cardBeginning = `<div class='card'><div class='category'>${i18n.__('category')}: `
    const cardEnd = `</div></div>`

    if (categories.length == 0)
    {
        if (!categorySwitch) return '' //we don't need category for user page
        return cardBeginning + i18n.__('none') + cardEnd
    }

    var res = cardBeginning

    categories.forEach((c, i) =>
    {
        res += `<a href='/category/${c.category.replace(/\'/g,`&apos;`)}'>${c.category}</a> `
        if (i < categories.length - 1) res += '| '
    })
    res += cardEnd
    return res
}

async function getOptions(content)
{
    let res = {}
    let regRes =  /^((?:Option \w+ \w+\r?\n)+)/ig.exec(content)
    if (!regRes || regRes.length < 2) return {}
    let options = regRes[1]
    if (!options) return res //blank
    options.split('\n').forEach((option) =>
    {
        if (option == '') return
        const sp = option.split(' ')
        res[sp[1].toLowerCase()] = sp[2].replace('\r', '').toLowerCase()
    })
    return res
}
module.exports = async (req, res, pages, files, category) =>
{
    let opt = await getOptions(req.body.content)
    let content = await require(paths.resolve('pages', 'render.js'))(req.body.title, req.body.content, true, pages, files, req, res, false, true, {}, opt)
    content = await getCategory(req.body.title, category, opt['category']) + content
    content = `<div class='alert alert-warning' role='alert'>${i18n.__('previewWarning')}</div>` + content
    let renderOpt = {
        title: req.body.title,
        titleInfo: '(<i>미리보기</i>)',
        content: content,
        isPage: true,
        pagename: req.body.title,
        ipaddr: req.ipAddress,
        username: req.session.username,
        
    }
    require(paths.resolve('view.js'))(req, res, renderOpt)
}
