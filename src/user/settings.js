module.exports = async (req, res, tables = {}) =>
{
    switch (req.params.name)
    {
        case 'setSign':
            {
                tables['settings'].destroy({
                    where:
                    {
                        user: req.session.username,
                        key: 'sign'
                    }
                })
                tables['settings'].create({
                        user: req.session.username,
                        key: 'sign',
                        value: req.body.sign
                })

            }
    }
    require(global.path + '/info.js')(req, res, null, 'Done.', '/settings', 'the settings page')
}