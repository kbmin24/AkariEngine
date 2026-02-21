
$(() =>
{
    $('.gechu').click(() =>
    {
        let csrf = $('#csrf').text()
        let boardID = $('#boardID').text()
        let postID = $('#postID').text()
        $.ajax({
            url: '/board/AJAX/gechu',
            data:
            {
                _csrf: csrf,
                boardID: boardID,
                postID: postID
            },
            method: 'POST',
            dataType: 'json'
        })
        .done(result =>
            {
                if (result.status === 'error')
                {
                    alert(result.message)
                }
                else
                {
                    $('.gechuCount').text(result.newGechu)
                    $('.bichuCount').text(result.newBichu)
                }
            })
        .fail((xhr, status, errorThrown) =>
        {
            alert('추천 도중 문제가 발생하였습니다.')
        })
    })
    $('.bichu').click(() =>
    {
        let csrf = $('#csrf').text()
        let boardID = $('#boardID').text()
        let postID = $('#postID').text()
        $.ajax({
            url: '/board/AJAX/bichu',
            data:
            {
                _csrf: csrf,
                boardID: boardID,
                postID: postID
            },
            method: 'POST',
            dataType: 'json'
        })
        .done(result =>
            {
                if (result.status === 'error')
                {
                    alert(result.message)
                }
                else
                {
                    $('.gechuCount').text(result.newGechu)
                    $('.bichuCount').text(result.newBichu)
                }
            })
        .fail((xhr, status, errorThrown) =>
        {
            alert('비추천 도중 문제가 발생하였습니다.')
        })
    })
    $('.commentDaedaetgul').click(function (event)
    {
        let commentElement = $(`.commentContentWrap[data-id='${$(this).attr('data-id')}']`)
        
        //check if form is already there
        if (commentElement.attr('data-subEnabled') == 'true')
        {
            $('#commentSubForm').remove()
            commentElement.attr('data-subEnabled', 'false')
            return
        }

        //check if the form is in somewhere else
        let otherForm = $('#commentSubForm')
        if (otherForm.length)
        {
            //move form and change properties
            otherForm.prev().attr('data-subEnabled', 'false')
            otherForm.insertAfter(commentElement)
            commentElement.attr('data-subEnabled', 'true')
        }
        else
        {
            //else: attach a new form
            let newForm = $('#commentMainForm').clone()
            newForm.attr('id', 'commentSubForm')
            newForm.insertAfter(commentElement)
            commentElement.attr('data-subEnabled', 'true')
            $('#commentSubForm > form > fieldset > .commentFormTitle').text('대댓글 작성')
        }
        //alter necessary informations
        let newForm = $('#commentSubForm')
        newForm.find('input[name="depth"]').attr('value', commentElement.attr('data-depth') * 1 + 1)
        newForm.find('input[name="parent"]').attr('value', commentElement.attr('data-id'))
    })
})