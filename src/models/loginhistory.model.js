import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('loginhistory',
        {
            username:
            {
                type: DataTypes.STRING,
            },
            ipaddr:
            {
                type: DataTypes.STRING
            }
        },
        {
            indexes: [
                {
                    using: 'BTREE',
                    fields: ['username']
                },
            ]
        })
};