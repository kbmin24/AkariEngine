const perms = JSON.parse(document.getElementById('perms').innerHTML)
perms.forEach(p =>
{
    const protectionLevels = {'everyone': 0, 'blocked': 1, 'login': 2, 'admin': 3}
    document.getElementById(p['task'] + 'Select').selectedIndex = protectionLevels[p['protectionLevel']];
})