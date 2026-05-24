import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('file',
        {
            filename:
            {
                allowNull: false,
                type: DataTypes.STRING,
                unique: true,
            },
            filenameOnDisk:
            {
                allowNull: false,
                type: DataTypes.STRING,
                unique: true,
            },
            uploader:
            {
                type: DataTypes.STRING
            },
            explanation:
            {
                type: DataTypes.TEXT
            }
        }, {
        indexes: [
            {
                using: 'BTREE',
                fields: ['filename']
            }
        ]
    })
};