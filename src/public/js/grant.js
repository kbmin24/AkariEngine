//grant.js: client side js to load existing permissions.
//1: read
const perms = JSON.parse(document.getElementById('perms').innerHTML)
perms.forEach(p =>
{
    document.getElementById('cb' + p['perm']).checked = true
})