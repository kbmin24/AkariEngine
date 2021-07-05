module.exports = (req, res, username, users, pages) =>
{
    //username parameter: reserved for history
    //todo: ACL
    pages.findOne({where: {title: req.params.name}}).then(page =>
    {
        if (page) //if page exists
        {
            page.update({content: req.body.content})
        }
        else
        {
            //add one
            pages.create(
            {
                title: req.params.name,
                content: req.body.content
            })
            .then(() => res.redirect("/w/" + req.params.name))
        }
    })
}