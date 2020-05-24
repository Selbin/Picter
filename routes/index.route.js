const express = require('express')
const router = express.Router()
const userRouter = require('./user.route')
const postRouter = require('./post.route')
const imageRouter = require('./image.route')
const authRouter = require('./auth.route')

router.use('/user', userRouter)
router.use('/post', postRouter)
router.use('/image', imageRouter)
router.use('/auth', authRouter)

module.exports = router
