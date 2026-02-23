import { DataTypes } from 'sequelize'

export default (sequelize) =>
{
    return sequelize.define('boardbichu',
    {
        boardID:
        {
            type: DataTypes.STRING
        },
        postID:
        {
            type: DataTypes.INTEGER
        },
        userID:
        {
            type: DataTypes.STRING
        },
        userIP:
        {
            type: DataTypes.STRING
        }
    })
};