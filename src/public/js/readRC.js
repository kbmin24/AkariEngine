$(function() {
    const URLSearch = new URLSearchParams(location.search)
    $.ajax({
        url: '/ajax/recentchanges',
        type: 'GET',
        data: {
            show: URLSearch.get('show')
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

                var bytechange;
                if (data[rc].bytechange > 0)
                {
                    bytechange = `<span class='text-success fw-bold'>+${data[rc].bytechange}</span>`
                }
                else if (data[rc].bytechange == 0)
                {
                    bytechange = `<span class='text-secondary fw-bold'>${data[rc].bytechange}</span>`
                }
                else
                {
                    bytechange = `<span class='text-danger fw-bold'>${data[rc].bytechange}</span>`
                }
                const entry = `
                <tr>
                    <th scope='row'>${ln}</th>
                    <td><a href='/w/User:${data[rc].doneBy}'>${data[rc].doneBy}</a></td>
                    <td>${data[rc].type} (${bytechange})</td>
                    <td>${data[rc].comment}</td>
                    <td>${moment(data[rc].createdAt).format('YYYY/MM/DD HH:mm:ss')}</td>
                </tr>
                `
                $('#rclist').append(entry)
            })
        }
    })
})