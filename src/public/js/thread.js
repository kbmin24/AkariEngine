var threadNum = 1
function renderDiscuss(thNumber, username, date, message, isHidden, type)
{
    let isme = username == $('#threadUsername').text()
    if (isHidden) message = '<em>This comment is hidden.</em>'
    if (type !== 'comment') message = '<em>' +type + ' ' + message + '</em>'

    let thNumberField = `<a href='#${thNumber}'>#${thNumber}</a>`
    let usernameField = ''
    let contrib = `<sup><a href='/contribution/${username}'>C</a></sup>`
    if ((/\d\d?\d?\.\d\d?\d?\.\d\d?\d?\.\d\d?\d?/.test(username)))
    {
        //IP
        usernameField = username
    }
    else
    {
        //user
        usernameField = `<a href='/w/User:${username}'>${username}</a>`
    }

    let dateStr = moment(date).utcOffset('+0900').format('YYYY/MM/DD HH:mm:ss')
    
    let topRow = ''
    topRow += `<tr class='thTop ${isme ? 'thTopMe' : '' } ${!isHidden ? '' : 'thTopHidden'} ${type == 'comment' ? '' : 'thTopAdmin'}'>`
    topRow += `<td class='thNumber'>${thNumberField}</td>`
    topRow += `<td>${usernameField}${contrib}</td>`
    topRow += `<td class='thTime'>${dateStr}</td></tr>`
    topRow += `</tr>`

    let bottomRow = ''
    bottomRow += `<tr><td colspan='3'><div class='thText'>${message}</div></td></tr>`

    let res = ''
    res += `<table id='${thNumber}' class='thBox'><tbody>`
    res += topRow
    res += bottomRow
    res += `</tbody></table>`
    return res
}
$(document).ready(() =>
{
    $.ajax({
        url: '/ajax/threadcomments',
        type: 'GET',
        data: {
            q: $('#roomId').text()
        },
        success: (data) =>
        {
            for (let d of data)
            {
                $('#thread').html($('#thread').html() + renderDiscuss(threadNum++, d.username, d.date, d.content, d.isHidden, d.type))
            }
        }
    })
    $.ajax(
        {
            url: '/ajax/threadinfo',
            type: 'GET',
            data: {
                q: $('#roomId').text()
            },
            success: data =>
            {
                if (!data['isOpen'])
                {
                    $("#commentBox").prop('disabled', true)
                    $("#commentBox").val('This thread has been closed (Hint: It may be reopened; please refresh to check).')
                }
                else
                {
                    if (data['r'] !== true)
                    {
                        $("#commentBox").prop('disabled', true)
                        $("#commentBox").val(data['r'])
                    }
                    else
                    {
                        $("#commentBox").val('')
                    }
                }
            }
        }
    )
    const socket = io()
    socket.emit('joinRoom', {roomId: $('#roomId').text()})
    socket.on('message', data =>
    {
        $('#thread').html($('#thread').html() + renderDiscuss(threadNum++, data.username, data.date, data.message, false, 'comment'))
    })
    $('#btnSubmit').click(()=>
    {
        socket.emit('message',
        {
            message: $('#commentBox').val(),
            roomId: $('#roomId').text(),
            date: new Date()
        })
        $('#commentBox').val('')
    })
})