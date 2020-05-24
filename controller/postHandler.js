const exeQuery = require('../models/db')
const { promisify } = require('util')
const { upload, deleteImage } = require('../middlewares/multerConfig')

const uploadImage = async (req, res) => {
  const uploader = promisify(upload.array('images', 10))
  try {
    await uploader(req, res)
    if (!req.files.length) {
      return res.status(400).json({ message: 'Image not selected' })
    }
    const files = req.files.map((file) => file.location)
    return res.status(200).json({ message: 'image uploaded', images: files })
  } catch (error) {
    console.log(error)
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(500).json({ message: 'Image size cannot be more than 5MB.' })
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(500).json({ message: 'Cannot upload more than 10 images' })
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(500).json({ message: 'Please select an image file to upload.' })
    }
    return res.status(500).json({ message: 'Upload failed. Please try again later.' })
  }
}

const deleteImages = async (req, res) => {
  const result = await deleteImage(req.params.image)
  if (result) return res.status(200).json({ message: 'File removed!' })
  return res.status(500).json({ message: 'There was an error. Failed to delete.' })
}

const createPost = async (req, res) => {
  const userId = req.user.userId
  const { caption, images } = req.body
  const postedOn = Date.now()
  if (!images.length) return res.status(400).json({ message: 'Please select files to upload' })
  if (!userId) return res.status(400).json({ type: 'error', messages: [{ msg: 'There was an error while creating new post. Please try again later.' }] })
  const query =
    'insert into posts (posted_by, image_urls, caption, posted_on) values ($1,$2,$3,$4) returning *'
  try {
    const result = await exeQuery(query, [userId, images, caption, postedOn])
    const post = result.rows[0]
    const response = {
      posts: {
        contents: {},
        ids: []
      },
      users: {},
      comments: {}
    }
    response.posts.contents[post.post_id] = {
      caption: post.caption,
      images: post.image_url,
      timestamp: post.posted_on,
      likes: post.like_count,
      comments: post.comment_count,
      commentIds: [],
      author: post.user_id,
      liked: false
    }
    response.posts.ids.push(post.post_id)
    return res.status(200).json({ message: 'Added new post', post: response })
  } catch (error) {
    console.log(error)
    res.status(500).json({ messages: 'Upload failed. Please try again later.' })
  }
}

const getUserPosts = async (req, res) => {
  const loggedUserId = req.user.userId
  const displayUserId = req.params.userId
  const current = req.body.current
  const value = [loggedUserId, displayUserId]
  let str = ''
  if (current) {
    value.push(current)
    str = 'and posts.post_id < $3'
  }
  const query = `select posts.*, username, first_name, last_name, profile_pic, like_id from posts inner join users on posts.posted_by = users.user_id left join likes on likes.post_id = posts.post_id and likes.user_id = $1 where posted_by = $2 ${str} order by posts.post_id desc limit 5`
  try {
    const result = await exeQuery(query, value)
    const posts = {
      contents: {},
      ids: []
    }
    const users = {}
    result.rows.forEach((post) => {
      posts.contents[post.post_id] = {
        caption: post.caption,
        images: post.image_urls,
        timestamp: post.posted_on,
        likes: post.like_count,
        comments: post.comment_count,
        commentIds: [],
        author: post.posted_by,
        liked: post.like_id || false
      }
      posts.ids.push(post.post_id)
      if (!(post.posted_by in users)) {
        users[post.posted_by] = {
          username: post.username,
          firstname: post.first_name,
          lastname: post.last_name,
          avatar: post.profile_pic
        }
      }
    })
    return res.status(200).json({ posts, users, comments: [] })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Fetch failed. Please try again later.' })
  }
}

const deletePost = async (req, res) => {
  const postId = req.params.postId
  const currentUserId = req.user.userId
  const query = 'delete from posts where post_id = $1 and posted_by = $2 returning post_id'
  try {
    const result = await exeQuery(query, [postId, currentUserId])
    if (!result.rowCount) res.status(404).json({ message: 'Post not Found' })
    res.status(200).json({ message: 'Post deleted' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ messages: 'Post deletion failed. Please try again later' })
  }
}

const like = async (req, res) => {
  const postId = req.body.postId
  const loggedUserId = req.user.userId
  const likedOn = Date.now()
  const query = 'update posts set like_count = like_count+1 where post_id = $1 returning like_count'
  const query2 = 'insert into likes (post_id, user_id, liked_on) values ($1, $2, $3) returning *'
  try {
    let result = await exeQuery(query2, [postId, loggedUserId, likedOn])
    if (result.rows[0]) {
      const response = { liked: result.rows[0].like_id, likes: 0 }
      result = await exeQuery(query, [postId])
      response.likes = result.rows[0].like_count
      res.status(200).json({ message: 'Post liked', content: response })
    }
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Like failed. PLease try again later' })
  }
}

const dislike = async (req, res) => {
  const likeId = req.body.likeId
  const query = 'update posts set like_count = like_count-1 where post_id = $1 returning like_count'
  const query2 = 'delete from likes where like_id = $1 returning *'
  try {
    let result = await exeQuery(query2, [likeId])
    if (!result.rows[0]) return res.status(404).json({ messages: 'Dislike failed' })
    result = await exeQuery(query, [result.rows[0].post_id])
    res.status(200).json({ message: 'Post disliked', content: { liked: false, likes: result.rows[0].like_count } })
  } catch (error) {
    console.log(error)
    res.status(500).json({ messages: 'Dislike failed. Try again later.' })
  }
}

const commentPost = async (req, res) => {
  const { comment, postId } = req.body
  const commentedOn = Date.now()
  const query = 'insert into comments (comment, user_id, post_id, commented_on) values ($1, $2, $3, $4) returning *'
  const query1 = 'update posts set comment_count = comment_count+1 where post_id = $1 returning comment_count'
  try {
    let result = await exeQuery(query, [comment, req.user.userId, postId, commentedOn])
    const response = {
      postId: postId,
      comment_ids: [result.rows[0].comment_id],
      comment: {
        [result.rows[0].comment_id]: {
          comment: result.rows[0].comment,
          author: req.user.userId,
          timestamp: result.rows[0].commented_on
        }
      }
    }
    result = await exeQuery(query1, [postId])
    response.comments = result.rows[0].comment_count
    res.status(200).json({ message: 'Commented successfully', contents: response })
  } catch (error) {
    console.log(error)
    res.status(500).json({ messages: 'Commenting failed. Please try again later.' })
  }
}

const deleteComment = async (req, res) => {
  const commentId = req.body.commentId
  const query = 'delete from comments where comment_id = $1 returning *'
  const query1 = 'update posts set comment_count = comment_count-1 where post_id = $1 returning comment_count, post_id'
  try {
    let result = await exeQuery(query, [commentId])
    result = await exeQuery(query1, [result.rows[0].post_id])
    res.status(200).json({
      message: 'Comment deleted',
      content: { postId: result.rows[0].post_id, comments: result.rows[0].comment_count }
    })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'deleting comment failed. please try again later' })
  }
}

const getComments = async (req, res) => {
  const { postId, current } = req.body
  const value = [postId]
  let str = ''
  if (current) {
    value.push(current)
    str = ' and comment_id < $2'
  }
  const query = `select comments.*, first_name, last_name, username, profile_pic from comments inner join users on users.user_id = comments.user_id where post_id = $1${str} order by comment_id desc limit 3`
  const result = await exeQuery(query, value)
  const response = {
    postId: postId,
    commentIds: [],
    comments: {},
    users: {}
  }
  result.rows.forEach((comment) => {
    response.commentIds.push(comment.comment_id)
    response.comments[comment.comment_id] = {
      comment: comment.comment,
      author: comment.user_id,
      timestamp: comment.commented_on
    }
    if (!(comment.user_id in response.users)) {
      response.users[comment.user_id] = {
        username: comment.username,
        firstname: comment.first_name,
        lastname: comment.last_name,
        avatar: comment.profile_pic
      }
    }
  })
  response.commentIds.sort((a, b) => a - b)
  res.status(200).json({ comments: response })
}

// const loadTimeline = async (req, res) => {
//   const userId = req.user.userId
//   const offset = req.body.offset
//   const limit = req.body.limit
//   const posts = []
//   const likedPosts = []
//   const query = 'select posts.*, users.username, users.fullname from posts inner join users on users.user_id = posts.user_id where posts.user_id in (select following_id from following where user_id = $1) order by posted_on desc limit $2 offset $3'
//   try {
//     const result = await exeQuery(query, [userId, limit, offset])
//     result.rows.forEach((post) => {
//       posts.push(post.post_id)
//     })
//     for (const post of posts) {
//       likedPosts.push(await userLikeStatus(post, userId, 'post'))
//     }
//     result.rows.forEach((post) => {
//       if (likedPosts.includes(post.post_id)) post.liked = true
//       else post.liked = false
//     })
//     res.status(200).json({ type: 'success', post: result.rows })
//   } catch (error) {
//     console.log(error)
//     res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
//   }
// }

module.exports = {
  createPost,
  getUserPosts,
  deletePost,
  like,
  commentPost,
  deleteComment,
  getComments,
  dislike,
  uploadImage,
  deleteImages
}
