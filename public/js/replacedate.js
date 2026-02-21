$(() =>
{
    $('.dt').each((idx, val) =>
    {
        let dt = moment($(val).attr('datetime')).utcOffset('+0900')
        let dtText = ''
        if (dt.isSame(new Date(), 'day'))
        {
            dtText = dt.format('HH:mm')
        }
        else if (dt.isSame(new Date(), 'year'))
        {
            dtText = dt.format('MM/DD')
        }
        else
        {
            dtText = dt.format('YYYY/MM/DD')
        }
        $(val).text(dtText)
    })
    $('.dt-long').each((idx, val) =>
    {
        let dt = moment($(val).attr('datetime')).utcOffset('+0900')
        $(val).text(dt.format('YYYY/MM/DD HH:mm:ss'))
    })
})