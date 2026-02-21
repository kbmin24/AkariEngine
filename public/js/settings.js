$(() =>
{
    switch (localStorage.getItem('theme'))
    {
        case 'light':
            $('#radioDarkLight').prop('checked', true)
            break
        case 'dark':
            $('#radioDarkDark').prop('checked', true)
            break
        default:
        //system r else
            $('#radioDarkSystem').prop('checked', true)
            break
    }
    switch (localStorage.getItem('RC'))
    {
        case 'false':
            $('#radioRCfalse').prop('checked', true)
            break
        default:
            $('#radioRCtrue').prop('checked', true)
            break
    }
})
function setDarkPref()
{
    localStorage.setItem('theme',$('input[name=radioDark]:checked').val())
    alert('저장되었습니다. 새로고침합니다.')
    location.reload()
}
function setRCPref()
{
    localStorage.setItem('RC',$('input[name=radioRC]:checked').val())
    alert('저장되었습니다. 새로고침합니다.')
    location.reload()
}
