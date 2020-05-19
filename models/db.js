const { Pool } = require('pg')

const pool = new Pool()

/**
 *  Execute postgresql query
 * @param  query
 * @param  values
 */

async function exeQuery (query, values) {
  try {
    return await pool.query(query, values)
  } catch (e) { console.log(e.stack) }
}

module.exports = exeQuery
