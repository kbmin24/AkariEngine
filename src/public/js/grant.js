//grant.js: client side js to load existing permissions.
$(() =>
{
    const perms = JSON.parse(document.getElementById('perms').innerHTML)
    perms.forEach(p =>
    {
        $('#cb' + p['perm']).attr('checked', true)
    })
})
