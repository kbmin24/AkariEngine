let injectRBoard = (lst) =>
{
    let cnt = 0
    $('#boardVisitList').empty()
    for (let i of lst)
    {
        $('#boardVisitList').append(`<li><a href='/board/${i.id}'>${i.name}</a><a href='javascript:removeRBoard(${cnt++})'><i class="fas fa-times rboard-close text-secondary"></i></a></li>`)
    }
}
let removeRBoard = (cnt) =>
{
    let visitList = JSON.parse(localStorage.getItem('kyoko'))
    visitList.splice(cnt, 1)
    localStorage.setItem('kyoko', JSON.stringify(visitList))
    injectRBoard(visitList)
}
$(() =>
{
    if (!localStorage.getItem('kyoko'))
    {
        localStorage.setItem('kyoko', JSON.stringify([]))
    }
    let visitList = JSON.parse(localStorage.getItem('kyoko'))
    let a = /^\/board\/(?:read|write)?\/?([^\/]*)$/igm.exec(window.location.pathname)
    if (a)
    {
        let idx = -1
        for (let i = 0; i < visitList.length; i++)
        {
            if (visitList[i].id == a[1])
            {
                idx = i
                break
            }
        }
        if (idx != -1) visitList.splice(idx, 1)
        visitList.unshift({
            id: a[1],
            name: $('.pgTitleLink')[0].text
        })
        localStorage.setItem('kyoko', JSON.stringify(visitList))
    }

    if (/^\/board.*$/.exec(window.location.pathname))
    {
        //render recentVisits
        let vl = JSON.parse(localStorage.getItem('kyoko'))
        injectRBoard(vl)
    }
})