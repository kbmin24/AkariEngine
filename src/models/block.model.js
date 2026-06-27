import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('block',
        {
            target:
            {
                allowNull: false,
                type: DataTypes.STRING
            },
            startIP:
            {
                // Only for IP blocks. Stores a zero-padded 128-bit comparable address key.
                allowNull: true,
                type: DataTypes.STRING(39)
            },
            endIP:
            {
                allowNull: true,
                type: DataTypes.STRING(39)
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
                },
                {
                    using: 'BTREE',
                    fields: ['targetType', 'target']
                }
            ]
        })
};
