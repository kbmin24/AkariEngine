module.exports = async (req, res, gongji) =>
{
    return res.json(await gongji.findAll(
        {
            where: {boardID: req.query.board},
            order:
            [
                ['priority', 'ASC']
            ]
        }
    ))
}