$(() =>
{
    switch (localStorage.getItem('theme'))
    {
        case 'light':
            $('#radioThemeLight').prop('checked', true)
            break
        case 'dark':
            $('#radioThemeDark').prop('checked', true)
            break
        default:
        //system r else
            $('#radioThemeSystem').prop('checked', true)
            break
    }
})
function setThemePref()
{
    localStorage.setItem('theme',$('input[name=radioTheme]:checked').val())
    alert('저장되었습니다. 새로고침해 주세요.')
}