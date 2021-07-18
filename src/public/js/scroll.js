$(window).on('load', () =>
{
    $('#btnTop').click(() => 
    {
        $('body,html').animate(
        {
            scrollTop: 0
        }, 200)
    })
    $('#btnBottom').click(() => 
    {
        $('body,html').animate(
        {
            scrollTop: $(document).height()-$(window).height()
        }, 200)
    })
    $('#btnTOC').click(() => 
    {
        $('body,html').animate(
        {
            scrollTop: $('#toc').offset().top
        }, 200)
    })
})