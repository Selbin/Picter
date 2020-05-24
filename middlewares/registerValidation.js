const exeQuery = require('../models/db')

const emailExist = async (req, res, next) => {
  const email = req.body.email
  try {
    const result = await exeQuery('select user_id from users where email_address = $1', [email])
    result.rowCount > 0 ? req.email = true : req.email = false
    next()
  } catch (error) {
    next(error)
  }
}

const userExist = async (req, res, next) => {
  const userName = req.body.userName
  try {
    const result = await exeQuery('select user_id from users where username = $1', [userName])
    result.rowCount > 0 ? req.user = true : req.user = false
    next()
  } catch (error) {
    next(error)
  }
}
module.exports = { emailExist, userExist }
