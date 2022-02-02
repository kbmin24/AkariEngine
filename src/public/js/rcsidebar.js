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
                    dt = moment(data[rc].createdAt).utcOffset('+0900').format('HH:mm')
                }
                else
                {
                    dt = moment(data[rc].createdAt).utcOffset('+0900').format('MM/DD')
                }
                res = `<li class='list-group-item' style='overflow: hidden; text-overflow : ellipsis;white-space: nowrap;'>${dt} ${ln}</li>`
                $('#rcsidebarcontents').append(res)
            })
        }
    })
    $('#rcsidebarposts').empty()
    $.ajax({
        url: '/board/AJAX/recentposts',
        type: 'GET',
        data: {
            show: 10,
        },
        success: (data) =>
        {
            $.each(data, (rp) =>
            {
                var ln = `<a href='/board/read/${data[rp].boardID}?no=${data[rp].idAtBoard}'>${data[rp].title}</a>`
                let dt = ''
                if (moment(data[rp].createdAt).isSame(moment(), 'day'))
                {
                    dt = moment(data[rp].createdAt).utcOffset('+0900').format('HH:mm')
                }
                else
                {
                    dt = moment(data[rp].createdAt).utcOffset('+0900').format('MM/DD')
                }
                res = `<li class='list-group-item' style='overflow: hidden; text-overflow : ellipsis;white-space: nowrap;'>${dt} ${ln}</li>`
                $('#rcsidebarposts').append(res)
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
        setInterval(() => {loadRC()}, 60000)
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