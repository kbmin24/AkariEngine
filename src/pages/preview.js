async function getCategory(title, category, categorys)
{
    let categorySwitch = /User:.*/.test(title) ? (categorys == 'on') : !(categorys == 'off')
    const categories = await category.findAll({where: {page: title}})

    const cardBeginning = `<div class='card mb-2'><div class='card-body'>Categories: `
    const cardEnd = `</div></div>`

    if (categories.length == 0)
    {
        if (!categorySwitch) return '' //we don't need category for user page
        return cardBeginning + '<i>None</i>' + cardEnd
    }

    var res = cardBeginning

    categories.forEach((c, i) =>
    {
        res += `<a href='/category/${c.category.replace(`'`,`&apos;`)}'>${c.category}</a> `
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
    let content = await require(global.path + '/pages/render.js')(req.body.title, req.body.content, true, pages, files, req, res, false, true, {}, opt)
    content = await getCategory(req.body.title, category, opt['category']) + content
    content = `<div class='alert alert-warning' role='alert'>The page has <b>not</b> been saved yet. Make sure to return to the edit page and save your changes.</div>` + content
    let renderOpt = {
        title: req.body.title,
        titleInfo: '(<i>Preview</i>)',
        content: content,
        isPage: true,
        pagename: req.body.title,
        ipaddr: (req.headers['x-forwarded-for'] || req.socket.remoteAddress),
        username: req.session.username,
        wikiname: global.appname
    }
    res.render('outline',renderOpt)
}