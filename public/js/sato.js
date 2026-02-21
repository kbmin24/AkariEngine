$(() =>
{
    let username = $('#hdusername').text()
    if (!username) return
    $.ajax(
        {
            url: '/ajax/threadlist',
            type: 'GET',
            data: {
                q: 'User:' + username
            },
            success: data =>
            {
                if (data.length != 0)
                {
                    $('#satoboxlink').attr('href', '/threads/User:' + username)
                    $('#satobox').css('display', 'block')
                }
            }
        }
    )
})