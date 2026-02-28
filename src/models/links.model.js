import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('link',
        {
            source:
            {
                allowNull: false,
                type: DataTypes.STRING
            },
            dest:
            {
                allowNull: false,
                type: DataTypes.STRING
            }
        }, {
        indexes: [
            {
                using: 'BTREE',
                fields: ['source']
            },
            {
                using: 'BTREE',
                fields: ['dest']
            }
        ]
    })
};