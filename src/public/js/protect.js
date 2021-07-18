const perms = JSON.parse(document.getElementById('perms').innerHTML)
perms.forEach(p =>
{
    var index = 0;
    const protectionLevels = {'everyone': 0, 'blocked': 1, 'login': 2, 'admin': 3}
    document.getElementById(p['task'] + 'Select').selectedIndex = protectionLevels[p['protectionLevel']];
})