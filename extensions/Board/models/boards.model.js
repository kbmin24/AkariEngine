import { DataTypes } from 'sequelize'

export default (sequelize) =>
{
    return sequelize.define('boardBoard',
    {
        boardID:
        {
            type: DataTypes.STRING
        },
        boardTitle:
        {
            type: DataTypes.STRING
        },
        postCount:
        {
            type: DataTypes.INTEGER
        },
        readACL:
        {
            type: DataTypes.STRING
        },
        writeACL:
        {
            type: DataTypes.STRING
        },
    })
};