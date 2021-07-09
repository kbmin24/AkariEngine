const sanitiseHtml = require('sanitize-html')
const diff = require('diff')
module.exports = (req, res, history) =>
{
    //rule: OLD AND NEW
    var rev1 = req.query.rev1
    var rev2 = req.query.rev2

    if (rev1 > rev2) [rev1, rev2] = [rev2, rev1]
    history.findOne(
    {
        where:
        {
            page: req.params.name,
            rev: rev1
        }
    }
    ).then(pagev1 =>
    {
        if (pagev1)
        {
            history.findOne(
            {
                where:
                {
                    page: req.params.name,
                    rev: rev2
                }
            }
            ).then(pagev2 =>
            {
                if (pagev2)
                {
                    var html = ''
                    html = html.replace(/\r?\n/igm, '')
                    const diffResult = diff.diffChars(pagev1.content, pagev2.content)
                    //https://www.npmjs.com/package/diff
                    diffResult.forEach(part =>
                    {
                        const color = part.added ? 'text-success' : part.removed ? 'text-danger' : 'text-muted'
                        html += `<span class='${color}'>${part.value}</span>`
                    })
                    html = sanitiseHtml(html, {allowedTags: ['span'], allowedAttributes: {'span': ['class']}, disallowedTagsMode: escape})
                    html = html.replace(/\r?\n/igm, '<br>')
                    html = `<div class='conatiner w-auto bg-light justify-content-center border rounded' style='display: inline-block;'>
                    <!-- <div class='row'><div class='col m-2'>Key</div></div> -->
                    <div class='row'><div class='col m-2'><span class='text-success'>green</span>: Added in r${rev2}</div></div>
                    <div class='row'><div class='col m-2'><span class='text-muted'>grey</span>: No Change</div></div>
                    <div class='row'><div class='col m-2'><span class='text-danger'>red</span>: Removed in r${rev2}</div></div>
                    </div><br><br>` + html
                    res.render('outline',
                    {
                        title: `Difference of ${req.params.name} r${rev1} and r${rev2}`,
                        content: html,
                        username: req.session.username,
                        wikiname: global.appname
                    })
                }
                else
                {
                    require(global.path + '/error.js')(req, res, null, 'The page (or revision) requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page')
                }

            })
        }
        else
        {
            require(global.path + '/error.js')(req, res, null, 'The page (or revision) requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page')
        }
    })
}