const { DataTypes } = require('sequelize')
module.exports = (sequelize) => {
    return sequelize.define('block',
        {
            target:
            {
                allowNull: false,
                type: DataTypes.STRING
            },
            startIP:
            {
                // only if targetType is 'ip'. Sort of bitmasked version of ip for quick searching.
                allowNull: true,
                type: DataTypes.BIGINT
            },
            endIP:
            {
                allowNull: true,
                type: DataTypes.BIGINT
            },
            targetType:
            {
                allowNull: false,
                type: DataTypes.STRING //EITHER 'ip' OR 'user'
            },
            allowLogin:
            {
                //IP only
                allowNull: true,
                type: DataTypes.BOOLEAN
            },
            isForever:
            {
                allowNull: false,
                type: DataTypes.BOOLEAN
            },
            doneBy:
            {
                type: DataTypes.STRING
            },
            comment:
            {
                type: DataTypes.STRING
            },
            until:
            {
                type: DataTypes.DATE
            }
        },
        {
            indexes: [
                {
                    using: 'BTREE',
                    fields: ['isForever', 'until']
                },
                {
                    using: 'BTREE',
                    fields: ['targetType', 'startIP', 'endIP']
                }
            ]
        })
}