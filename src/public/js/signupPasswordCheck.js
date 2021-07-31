//사실 ID도 체크함
function idCheck()
{
    const goodid = document.getElementById('goodid')
    const badid = document.getElementById('badid')
    if (/^\w{3,}$/.test(document.getElementById('idInputbox').value))
    {
        goodid.style.display = 'inline'
        badid.style.display = 'none'
    }
    else
    {
        goodid.style.display = 'none'
        badid.style.display = 'inline'
    }
}
function pwMatchCheck()
{
    const pw = document.getElementById('passwordInputbox')
    const pwconfirm = document.getElementById('passwordConfirmInputbox')
    const msgSuccess = document.getElementById('passwordmatch')
    const msgFail = document.getElementById('passwordnotmatch')
    if (pw.value == pwconfirm.value)
    {
        msgSuccess.style.display = 'inline'
        msgFail.style.display = 'none'
    }
    else
    {
        msgSuccess.style.display = 'none'
        msgFail.style.display = 'inline'
    }
}