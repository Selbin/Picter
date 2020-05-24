const router = require('express').Router()
const { check } = require('express-validator')
const { emailExist, userExist } = require('../middlewares/registerValidation')
const userHandler = require('../controller/userHandler')

router.post('/register', [
  check('username')
    .not()
    .isEmpty()
    .withMessage("Username Shouldn't be empty"),
  check('firstname')
    .not()
    .isEmpty()
    .withMessage('Provide Fisrt name'),
  check('lastname')
    .not()
    .isEmpty()
    .withMessage('Provide Last name'),
  check('email')
    .isEmail()
    .withMessage('Invalid E-mail'),
  check('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 5 characters long')
],
emailExist,
userExist, userHandler.registerUser)

// Login user
router.post('/login', [
  check('email')
    .not()
    .isEmpty()
    .withMessage("Username Shouldn't be empty"),
  check('password')
    .isLength({ min: 5 })
    .withMessage('Wrong password')
], userHandler.loginUser)

// Check logged in and get details
router.get('/check', userHandler.check)

module.exports = router
