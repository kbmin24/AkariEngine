export function showCategory(title, categoryOption) {
    return /User:.*/.test(title) ? (categoryOption == 'on') : (categoryOption != 'off')
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