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
function pwAppropriateCheck()
{
    const pw = document.getElementById('passwordInputbox').value
    const badlength = document.getElementById('passwordbadlength')
    const badchar = document.getElementById('passwordbadchar')
    const badcharlist = document.getElementById('passwordbadcharlist')
    const goodchars = /^[A-Za-z\d@\$!%\*\?&\^#_\-\+=<>,\.\/\|]$/
    //passwordbadlength
    if (pw.length < 8 || pw.length > 255)
        badlength.style.display = 'block'
    else
        badlength.style.display = 'none'
    let badchars = new Set()
    for (let c of pw)
    {
        if (!goodchars.test(c))
        {
            badchars.add(c)
        }
    }
    if (badchars.size)
    {
        badchar.style.display = 'block'
        badcharlist.innerHTML = '\'' + Array.from(badchars).join('\', \'') + '\''
    }
    else
    {
        badchar.style.display = 'none'
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