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
                    ln = `<a href='/w/${data[rc].page}?redirect=false'>${data[rc].page}</a> ${data[rc].rev ? '(r' + data[rc].rev + ')' : '<em>(deleted)</em>'}`
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
                let entry = `
                <tr>
                    <th scope='row'>${ln}</th>`
                //entry += <td>$<a href='/w/User:${data[rc].doneBy}'>${data[rc].doneBy}</a></td>
                entry += '<td>' + (!/\d\d?\d?\.\d\d?\d?\.\d\d?\d?\.\d\d?\d?/.test(data[rc].doneBy) ? `<a href='/w/User:${data[rc].doneBy}'>${data[rc].doneBy}</a>` : data[rc].doneBy) + `<sup><a href='/contribution/${data[rc].doneBy}'>C</a></sup>` + '</td>'
                entry += `
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