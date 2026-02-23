import { DataTypes } from 'sequelize'

export default (sequelize) =>
{
    return sequelize.define('boardfile',
    {
        boardID:
        {
            type: DataTypes.STRING
        },
        postID:
        {
            type: DataTypes.INTEGER
        },
        fileName:
        {
            type: DataTypes.STRING
        }
    })
};