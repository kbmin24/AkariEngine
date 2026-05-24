$(() =>
{
    $('#btnread').click(() =>
    {
        $.ajax({
            url: '/board/AJAX/gongji',
            type: 'GET',
            data: {
                board: $('#tbBoardName').val().trim()
            },
            success: (data) =>
            {
                let res = ''
                for (let r of data)
                {
                    res += `${r.postID}\n`
                }
                $('#gongjis').val(res)
            }
        })
    })
})