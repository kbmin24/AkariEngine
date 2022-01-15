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
    alert('Saved. Please reload the page to apply.')
}