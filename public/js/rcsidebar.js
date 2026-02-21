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
                var ln = `<a href='/w/${data[rc].page}'>${data[rc].page}</a> ${data[rc].rev ? '' : '<em>(삭제)</em>'}`
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
}
$(() =>
{
    if (localStorage.getItem('RC') !== 'false')
    {
        loadRC()
    }
    
})