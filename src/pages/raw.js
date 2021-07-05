module.exports = (req, res, pages) =>
{
    pages.findOne({where: {title: req.params.name}}).then(page =>
    {
        if (page) //if page exists
        {
            res.send(page.content)
        }
        else
        {
            //404!
            require(global.path + '/error.js')(req, res, null, 'The page requested is not found. Would you like to <a href="/edit/'+req.params.name+'">create one?</a>', '/', 'the main page') //create?
        }
    })
}