const { Op } = require('sequelize')
module.exports = async (recentchanges) =>
{
    //Scans RecentChanges and delete ones which are too old
    //that is: cut down front records until 100 records are left
    //firstly get the last row's id.
    await recentchanges.findAll({
        limit:1,
        order: [['id', 'DESC']]
    })
    .then(entries =>
    {
        const latestChange = entries[0].id
        recentchanges.destroy(
        {
            where:
            {
                id: {[Op.lt]: latestChange - 100}
            }
        })
    })
}