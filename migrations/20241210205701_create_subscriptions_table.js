exports.up = function (knex) {
    return knex.schema.createTable('subscriptions', (table) => {
        table.increments('id'); // Primary Key
        table.integer('user_id').unsigned().notNullable(); // Harus unsigned
        table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE'); // Foreign Key
        table.boolean('is_active').defaultTo(false);
        table.date('start_date').nullable();
        table.date('end_date').nullable();
        table.timestamps(true, true); // Created At & Updated At
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('subscriptions');
};
