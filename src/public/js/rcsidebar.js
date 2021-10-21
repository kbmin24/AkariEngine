function loadRC() {
    $('#rcsidebarcontents').empty()
    $.ajax({
        url: '/ajax/recentchanges',
        type: 'GET',
        data: {
            show: 10
        },
        success: (data) =>
        {
            $.each(data, (rc) =>
            {
                var ln;
                if (data[rc].type == 'upload')
                {
                    ln = `<a href='/file/${data[rc].page}'>${data[rc].page}</a> <em>(file)</em>`
                }
                else
                {
                    ln = `<a href='/w/${data[rc].page}?redirect=false'>${data[rc].page}</a> (r${data[rc].rev})`
                }
                $('#rcsidebarcontents').append(`<li class='list-group-item' style='overflow-wrap: anywhere;'>${ln}</li>`)
            })
        }
    })
}
var registered = false
function regLoadRC()
{
    if (registered=== true) return
    if ($('#rcsidebar').css('display') !== 'none') 
    {
        registered = true
        loadRC()
        setInterval(() => {loadRC()}, 30000)
    }
}
$(() =>
{
    regLoadRC()
})
$( window ).resize(() =>
{
    regLoadRC()
})