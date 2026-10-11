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
            },
            isInclude: {
                allowNull: false,
                type: DataTypes.BOOLEAN,
                defaultValue: false
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

// Plain sync creates new tables but does not add columns to existing ones.
export async function ensureLinksIncludeColumn(links) {
    const queryInterface = links.sequelize.getQueryInterface();
    const table = links.getTableName();
    const columns = await queryInterface.describeTable(table);
    if (!columns.isInclude) {
        await queryInterface.addColumn(table, 'isInclude', {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        });
    }
}
