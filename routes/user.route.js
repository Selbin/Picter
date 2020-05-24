const express = require('express')
const { check } = require('express-validator')
const router = express.Router()

const userHandler = require('../controller/userHandler')

// update user details

router.post('/update', userHandler.updateProfile)

// change password

router.put('/change_pwd', [
  check('newPassword1')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 5 characters long')
], userHandler.updatePwd)

// follow user

router.post('/follow', userHandler.followUser)

// unfollow user

router.delete('/unfollow/:followId', userHandler.unfollowUser)

// get profile info

router.get('/:username', userHandler.getProfile)

// get followers

router.post('/followers/:userId', userHandler.getFollowers)

// get following

router.post('/following/:userId', userHandler.getFollowing)

// search user

router.get('/search/:name/:current', userHandler.searchUser)

module.exports = router
