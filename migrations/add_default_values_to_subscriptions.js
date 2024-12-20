exports.up = function (knex) {
  return knex.schema.alterTable('subscriptions', (table) => {
    table.boolean('is_active').defaultTo(false).alter()
    table.date('start_date').nullable().alter()
    table.date('end_date').nullable().alter()
  })
}

exports.down = function (knex) {
  return knex.schema.alterTable('subscriptions', (table) => {
    table.boolean('is_active').defaultTo(null).alter()
    table.date('start_date').notNullable().alter()
    table.date('end_date').notNullable().alter()
  })
}
