function loadRC() {
    const URLSearch = new URLSearchParams(location.search)
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
                $('#rcsidebarcontents').append(`<li class='list-group-item'>${ln}</li>`)
            })
        }
    })
}
loadRC()
setInterval(() => {loadRC()}, 30000)