function loadRC() {
    $('#rcsidebarcontents').empty()
    $.ajax({
        url: '/ajax/recentchanges',
        type: 'GET',
        data: {
            show: 10,
            isunique: true,
            excludefile: true,
            editonly: true
        },
        success: (data) =>
        {
            $.each(data, (rc) =>
            {
                var ln = `<a href='/w/${data[rc].page}?redirect=false'>${data[rc].page}</a> ${data[rc].rev ? '' : '<em>(deleted)</em>'}`
                let dt = ''
                if (moment(data[rc].createdAt).isSame(moment(), 'day'))
                {
                    dt = moment(data[rc].createdAt).format('HH:mm')
                }
                else
                {
                    dt = moment(data[rc].createdAt).format('MM/DD')
                }
                res = `<li class='list-group-item' style='overflow: hidden; text-overflow : ellipsis;white-space: nowrap;'>${dt} ${ln}</li>`
                $('#rcsidebarcontents').append(res)
            })
        }
    })
}
var registered = false
function regLoadRC()
{
    if (registered === true) return
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