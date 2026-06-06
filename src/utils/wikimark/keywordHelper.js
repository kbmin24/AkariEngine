import i18n from 'i18n'

export function showCategory(title, categoryOption) {
    return /User:.*/.test(title) ? (categoryOption == 'on') : (categoryOption != 'off')
}
export async function getCategory(title, category, categorys) {
    let categorySwitch = /User:.*/.test(title) ? (categorys == 'on') : (categorys != 'off')
    const categories = await category.findAll({ where: { page: title } })

    const cardBeginning = `<div class='category'>${i18n.__('category')}: `
    const cardEnd = `</div>`

    if (categories.length == 0) {
        if (!categorySwitch) return '' //we don't need empty category for user page
        return cardBeginning + i18n.__('none') + cardEnd
    }

    var res = cardBeginning

    categories.forEach((c, i) => {
        res += `<a href='/category/${c.category.replace(/'/g, `&apos;`)}'>${c.category}</a> `
        if (i < categories.length - 1) res += '| '
    })
    res += cardEnd
    return res
}

export async function getOptions(content) {
    let res = {}
    let regRes = /^((?:Option \w+ \w+\r?\n)+)/ig.exec(content)
    if (!regRes || regRes.length < 2) return {}
    let options = regRes[1]
    if (!options) return res //blank
    options.split('\n').forEach((option) => {
        if (option == '') return
        const sp = option.split(' ')
        res[sp[1].toLowerCase()] = sp[2].replace('\r', '').toLowerCase()
    })
    return res
}