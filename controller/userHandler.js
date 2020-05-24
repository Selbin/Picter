const bcrypt = require('bcryptjs')
const exeQuery = require('../models/db')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')

const registerUser = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array() })
  if (req.user) return res.status(409).json({ message: 'Username already exist' })
  if (req.email) return res.status(409).json({ message: 'Email already exist' })
  const { username, email, password, firstname, lastname } = req.body
  const query = 'insert into users (username, email_address, password, first_name, last_name, registered_on) values($1, $2, $3, $4, $5, $6)'
  const registeredDate = Date.now()
  try {
    const encryptPwd = bcrypt.hashSync(password, 8)
    await exeQuery(query, [
      username,
      email,
      encryptPwd,
      firstname,
      lastname,
      registeredDate
    ])
    res.status(201).json({ message: 'Registration successfull, Please login to continue' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Registration failed, Please try again' })
  }
}

const loginUser = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ message: errors.array() })
  const { email, password } = req.body
  const query = 'select * from users where email_address = $1'
  try {
    const result = await exeQuery(query, [email])
    if (!result.rowCount) return res.status(404).json({ message: 'User doesn\'t exist' })
    if (!bcrypt.compareSync(password, result.rows[0].password)) return res.status(401).json({ message: 'Invalid credentials' })
    const accessToken = jwt.sign({ userId: result.rows[0].user_id }, process.env.PRIVATEKEY, { expiresIn: '3 days' })
    const response = {
      accessToken,
      user: {
        id: result.rows[0].user_id,
        username: result.rows[0].username,
        firstname: result.rows[0].first_name,
        lastname: result.rows[0].last_name
      }
    }
    return res.status(200).json(response)
  } catch (error) {
    console.log('login', error)
    res.status(500).json({ message: 'Login failed. Please try again' })
  }
}

const getProfile = async (req, res) => {
  const username = req.params.username
  const currentUserId = req.user.userId
  const query = 'select user_id, first_name, last_name, bio, registered_on, followers, following, profile_pic, follower_id from users left join followers on followers.follower_user = $1 and followers.following_user = users.user_id where username = $2'
  try {
    const result = await exeQuery(query, [currentUserId, username])
    if (!result.rowCount) return res.status(404).json({ message: 'User not Found' })
    const response = {
      user: {},
      following: [],
      followers: [],
      users: {}
    }
    response.user = {
      id: result.rows[0].user_id,
      firstname: result.rows[0].first_name,
      lastname: result.rows[0].last_name,
      username: username,
      bio: result.rows[0].bio,
      followers: result.rows[0].followers,
      following: result.rows[0].following,
      avatar: result.rows[0].profile_pic,
      isFollowing: result.rows[0].follower_id || false,
      registeredOn: result.rows[0].registered_on
    }
    res.status(200).json({ user: response })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'There was an error. Please try again later' })
  }
}

const updateProfile = async (req, res) => {
  const updateProfile = req.body
  const currentUserId = req.user.userId
  if (!req.body) return res.status(400).json({ messages: 'fields are empty' })
  const values = [currentUserId]
  const dbFields = {
    firstname: 'first_name',
    lastname: 'last_name',
    bio: 'bio',
    avatar: 'profile_pic'
  }
  let str = 'update users set'
  try {
    updateProfile.forEach((field, index) => {
      if (index) str += ', '
      str += `${dbFields[field]} = $${index + 2}`
      values.push(updateProfile[field])
    })
    const query = str + 'where user_id = $1 returning first_name, last_name, profile_pic, bio'
    const result = await exeQuery(query, values)
    const response = {
      id: currentUserId,
      username: result.rows[0].username,
      firstname: result.rows[0].first_name,
      lastname: result.rows[0].last_name,
      avatar: result.rows[0].profile_pic,
      bio: result.rows[0].bio
    }
    res.status(200).json(response)
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Something went wrong. Please try again' })
  }
}

const updatePwd = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).send(errors.array())
  const { password, newPassword } = req.body
  const userId = req.user.userId
  let query = 'select password from users where user_id = $1'
  try {
    const result = await exeQuery(query, [userId])
    if (!bcrypt.compareSync(password, result.rows[0].password)) return res.status(401).json({ message: 'Current password is wrong' })
    const encryptPwd = bcrypt.hashSync(newPassword, 8)
    query = 'update users set password = $1 where user_id = $2'
    await exeQuery(query, [encryptPwd, userId])
    res.status(200).json({ message: 'Password updated successfully' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Something went wrong. Please try again' })
  }
}

const check = async (req, res) => {
  const query = 'select user_id as id, username, first_name as firstname, last_name as lastname, profile_pic as avatar from users where user_id = $1'
  try {
    const result = await exeQuery(query, [req.user.userId])
    if (!result.rowCount) return res.status(404).json({ message: 'User not found' })
    res.status(200).json(result.rows[0])
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: 'Something went wrong, Please try again' })
  }
}

const followUser = async (req, res) => {
  const currentUserId = req.user.userId
  const followedUser = req.body.followedUser

  const query1 = 'insert into followers (follower_user, following_user, followed_on) values ($1, $2, $3) returning *'
  const query2 = 'update users set following = following+1 where user_id = $1 returning first_name, last_name, username, profile_pic, following'
  const query3 = 'update users set followers = followers+1 where user_id = $1 returning followers'
  try {
    const followUser = await exeQuery(query1, [currentUserId, followedUser, Date.now()])
    const followingCount = await exeQuery(query2, [currentUserId])
    const followerCount = await exeQuery(query3, [followedUser])
    const response = {
      followerId: followedUser,
      followerCount: followerCount.rows[0].followers,
      followers: [currentUserId],
      users: {
        [currentUserId]: {
          firstname: followingCount.rows[0].first_name,
          lastname: followingCount.rows[0].last_name,
          username: followingCount.rows[0].username,
          avatar: followingCount.rows[0].profile_pic,
          count: followingCount.rows[0].following
        }
      },
      isFollowing: followUser.rows[0].follower_id
    }
    res.status(200).json(response)
  } catch (error) {
    console.log(error)
    res.status(500).json({ messages: 'Something went wrong. Please try again later' })
  }
}

const unfollowUser = async (req, res) => {
  const followId = req.params.followId
  const query1 = 'delete from followers where follower_id = $1 returning *'
  const query2 = 'update users set following = following-1 where user_id = $1 returning following'
  const query3 = 'update users set followers = followers-1 where user_id = $1 returning followers'
  try {
    const unfollowUser = await exeQuery(query1, [followId])
    if (!unfollowUser.rows[0]) return res.status(400).json({ message: 'not following user' })
    const followingCount = await exeQuery(query2, [unfollowUser.rows[0].follower_user])
    const followerCount = await exeQuery(query3, [unfollowUser.rows[0].following_user])
    const response = {
      followerCount: followerCount.rows[0].followers,
      unfollower: unfollowUser.rows[0].follower_user,
      isFollowing: false
    }
    res.status(200).json(response)
  } catch (error) {
    console.log(error)
    res.status(500).json({ messages: 'Something went wrong. Please try again later' })
  }
}

const getFollowers = async (req, res) => {
  const userId = req.params.userId
  const current = req.body.current
  const value = [userId]
  let str = ''
  if (current) {
    value.push(current)
    str = 'and follower_id < $2 '
  }

  const query = `select followers.*, first_name, last_name, username, profile_pic from followers inner join users on follower_user = users.user_id where following_user = $1 ${str}order by follower_id desc limit 100`
  try {
    const result = await exeQuery(query, value)
    if (!result.rowCount) return res.status(200).json({ followers: [], users: {} })
    const response = {
      followers: [],
      users: {}
    }
    result.rows.forEach((row) => {
      response.followers.push(row.follower_user)
      response.users[row.follower_user] = {
        firstname: row.first_name,
        lastname: row.last_name,
        username: row.username,
        avatar: row.profile_pic
      }
    })
    return res.status(200).json(response)
  } catch (error) {
    console.log(error)
    res.status(500).json({ messages: 'Something went wrong. Please try again later' })
  }
}

const getFollowing = async (req, res) => {
  const userId = req.params.userId
  const current = req.body.current
  const value = [userId]
  let str = ''
  if (current) {
    value.push(current)
    str = 'and follower_id < $2 '
  }

  const query = `select followers.*, first_name, last_name, username, profile_pic from followers inner join users on following_user = users.user_id where follower_user = $1 ${str}order by follower_id desc limit 100`
  try {
    const result = await exeQuery(query, value)
    if (!result.rowCount) return res.status(200).json({ following: [], users: {} })
    const response = {
      following: [],
      users: {}
    }
    result.rows.forEach((row) => {
      response.following.push(row.following_user)
      response.users[row.following_user] = {
        firstname: row.first_name,
        lastname: row.last_name,
        username: row.username,
        avatar: row.profile_pic
      }
    })
    return res.status(200).json(response)
  } catch (error) {
    console.log(error)
    res.status(500).json({ messages: 'Something went wrong. Please try again later' })
  }
}

const searchUser = async (req, res) => {
  const { name, current } = req.params
  const query = 'select user_id as id, username, first_name as firstname, last_name as lastname, profile_pic as avatar, bio from users where first_name ilike $1 or last_name ilike $1 or username ilike $1 and user_id > $2 order by user_id asc limit 20'
  try {
    const result = await exeQuery(query, [`%${name}%`, current])
    res.status(200).json(result.rows)
  } catch (error) {
    console.log(error)
    res.status(500).json({ messages: 'Something went wrong. Please try again later' })
  }
}

const userFeed = async (req, res) => {
  const userId = req.user.userId
  const { current } = req.body
  const value = [userId]
  let str = ''
  if (current) {
    value.push(current)
    str = ' and posts.post_id < $2'
  }
  const query = `select posts.*, username, first_name, last_name, profile_pic, like_id from posts inner join users on posts.posted_by = users.user_id left join likes on likes.post_id = posts.post_id and likes.user_id = $1 where posts.posted_by in ((select following_user from followers where follower_user = $1), $1)${str} order by posts.post_id desc limit 5`
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
    res.status(500).json({ messages: 'Something went wrong. Please try again later' })
  }
}

module.exports = { registerUser, loginUser, updateProfile, updatePwd, check, getProfile, followUser, unfollowUser, getFollowers, getFollowing, searchUser, userFeed }
