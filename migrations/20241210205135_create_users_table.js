exports.up = function (knex) {
    return knex.schema.createTable('users', (table) => {
        table.increments('id').unsigned().primary(); // Kolom id sebagai primary key
        table.string('name').notNullable().unique();
        table.string('email').notNullable().unique();
        table.string('password').notNullable();
        table.timestamps(true, true); // Created At & Updated At
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('users');
};
