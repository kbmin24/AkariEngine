import { DataTypes } from 'sequelize'

export default (sequelize) =>
{
    return sequelize.define('boardgongji',
    {
        boardID:
        {
            type: DataTypes.STRING
        },
        postID:
        {
            type: DataTypes.INTEGER
        },
        priority:
        {
            type: DataTypes.INTEGER
        }
    })
};