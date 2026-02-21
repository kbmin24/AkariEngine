let stdout = (data) =>
{
    $('.consoleWindow').text($('.consoleWindow').text() + data)
    let csw = document.getElementsByClassName('consoleWindow')[0]
    csw.scrollTop = csw.scrollHeight
}
let stdin = (socket) =>
{
    socket.emit('input', {command: $('#inputCommand').val()})
    $('#inputCommand').val('')
}
$(document).ready(async () =>
{
    stdout('Connecting...')
    const socket = io()
    await socket.emit('joinRoom', {roomId: 'developerconsole', notAThread: true})
    
    socket.on('joinok', data =>
    {
        stdout('OK!\n')
    })

    socket.on('output', data =>
    {
        stdout(data)
    })

    $('#inputCommand').on("keyup",key =>
    {
        if(key.keyCode==13)
        {
            stdin(socket)
        }
    })

    $('#btnSend').click(()=>
    {
        stdin(socket)
    })
})