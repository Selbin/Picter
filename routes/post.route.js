const express = require('express')
const router = express.Router()

const postHandler = require('../controller/postHandler')

// posting

router.post('/', postHandler.createPost)

// like posts

router.post('/like', postHandler.like)

// dislike posts

router.delete('/unlike', postHandler.dislike)

// comment posts

router.post('/comment', postHandler.commentPost)

// delete comment

router.delete('/comment', postHandler.deleteComment)

// get comments

router.post('/getcomment', postHandler.getComments)

// delete post

router.delete('/:postId', postHandler.deletePost)

// get user posts

router.post('/:userId', postHandler.getUserPosts)

module.exports = router
