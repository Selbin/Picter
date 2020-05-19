const express = require('express')
const router = express.Router()

const postHandler = require('../controller/postHandler')

// get user posts

router.post('/:userId', postHandler.getUserPosts)

// posting

router.post('/', postHandler.createPost)

// delete post

router.delete('/:postId', postHandler.deletePost)

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

// display timeline

// router.get('/timeline', postHandler.loadTimeline)

module.exports = router
