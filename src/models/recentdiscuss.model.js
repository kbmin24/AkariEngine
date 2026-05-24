import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('recentdiscuss',
        {
            id:
            {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: DataTypes.INTEGER
            },
            threadname:
            {
                type: DataTypes.STRING
            },
            threadID:
            {
                type: DataTypes.STRING
            },
            pagename:
            {
                type: DataTypes.STRING
            }
        },
        {
            indexes: [
                {
                    using: 'BTREE',
                    fields: ['id']
                }
            ]
        })
};