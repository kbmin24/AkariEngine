const ejs = require('ejs')
const { Op } = require('sequelize')
module.exports = (req, res, recentchanges) =>
{
    //Scans RecentChanges and delete ones which are too old
    //that is: cut down front records until 100 records are left
    //firstly get the last row's id.
    recentchanges.findAll({
        limit:1.,
        order: [['id', 'DESC']]
    })
    .then(entries =>
    {
        const latestChange = entries[0].id
        console.log(latestChange)
        recentchanges.destroy(
        {
            where:
            {
                id: {[Op.lt]: latestChange - 100}
            }
        })
    })
}