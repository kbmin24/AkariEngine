function CIDRcheck()
{
    const CIDRregex = /^([0-9]{1,3}\.){3}[0-9]{1,3}($|\/(1[6-9]|2[0-9]|3[0-2]))$/
    if (CIDRregex.test($('#target').val()))
    {
        $('#msgRight').css('display','inline')
        $('#msgWrong').css('display','none')
        $('#btnSubmit').attr('disabled', false)
    }
    else
    {
        $('#msgRight').css('display','none')
        $('#msgWrong').css('display','inline')
        $('#btnSubmit').attr('disabled', true)
    }
}
function unblockCheck()
{
    if ($('#blockfor').val() == 'unblock')
    {
        $('#allowLoginGrp').css('display', 'none')
    }
    else
    {
        $('#allowLoginGrp').css('display', '')
    }
}