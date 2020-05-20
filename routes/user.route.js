const express = require('express')
const { check } = require('express-validator')
const { emailExist, userExist } = require('../middlewares/registerValidation')
const router = express.Router()

const userHandler = require('../controller/userHandler')

// register user

router.post(
  '/register',
  [
    check('userName')
      .not()
      .isEmpty()
      .withMessage("Username Shouldn't be empty"),
    check('fullName')
      .not()
      .isEmpty()
      .withMessage('Provide Fullname'),
    check('email')
      .isEmail()
      .withMessage('Invalid E-mail'),
    check('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 5 characters long')
  ],
  emailExist,
  userExist,
  userHandler.registerUser
)

// user login

router.post(
  '/login',
  [
    check('userName')
      .not()
      .isEmpty()
      .withMessage("Username Shouldn't be empty"),
    check('password')
      .isLength({ min: 5 })
      .withMessage('Wrong password')
  ],
  userExist,
  userHandler.loginUser
)

// update user details

router.put(
  '/update',
  [
    check('fullName')
      .not()
      .isEmpty()
      .withMessage('provide Fullname')
  ],
  userHandler.updateProfile
)

// change password

router.put('/change_pwd', [
  check('newPassword1')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 5 characters long')
], userHandler.updatePwd)

// change profile pic

router.put('/change_dp', userHandler.changeDp)

// logged in check

router.get('/check', userHandler.check)

// follow user

router.post('/follow', userHandler.followUser)

// unfollow user

router.post('/unfollow', userHandler.unfollowUser)

// get profile info

router.post('/profile/:userName', userHandler.getProfile)

// get followers

router.get('/getfollowers', userHandler.getFollowers)

// get following

router.get('/getfollowing', userHandler.getFollowing)

// show requests

router.get('/show_request', userHandler.showRequest)

// accept follow request

router.post('/request', userHandler.acceptRequest)

// search user

router.post('/search', userHandler.searchUser)

module.exports = router
