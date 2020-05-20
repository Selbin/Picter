const bcrypt = require('bcryptjs')
const exeQuery = require('../models/db')
const jwt = require('jsonwebtoken')
const { validationResult } = require('express-validator')

const registerUser = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ type: 'error', messages: errors.array() })
  if (req.user) return res.status(409).json({ type: 'error', messages: [{ msg: 'Username already exist' }] })
  if (req.email) return res.status(409).json({ type: 'error', messages: [{ msg: 'Email already exist' }] })
  const {
    userName,
    email,
    password,
    fullName
  } = req.body
  const query =
    'insert into users (username, email_address, password, first_name, last_name, registered_on) values($1, $2, $3, $4, $5)'
  const registeredDate = new Date()
  try {
    const encryptPwd = bcrypt.hashSync(password, 8)
    await exeQuery(query, [
      userName,
      email,
      encryptPwd,
      fullName,
      registeredDate
    ])
    res.status(201).json({ type: 'success', messages: [{ msg: 'Registration successfull, Please login to continue' }] })
  } catch (error) {
    console.log('register user', error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const loginUser = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).json({ type: 'error', messages: errors.array() })
  if (!req.user) return res.status(404).json({ type: 'error', messages: [{ msg: 'User doesn\'t exist' }] })
  const { userName, password } = req.body
  const query = 'select * from users where username = $1'
  try {
    const result = await exeQuery(query, [userName])
    if (!bcrypt.compareSync(password, result.rows[0].password)) return res.status(401).json({ type: 'error', messages: [{ msg: 'Invalid credentials' }] })
    delete result.rows[0].password
    const accessToken = jwt.sign(
      { email: result.rows[0].email, userName, userId: result.rows[0].user_id },
      process.env.PRIVATEKEY
    )
    res.cookie('Authorization', accessToken, { expires: new Date(new Date().getTime() + 10 * 24 * 60 * 60 * 1000) })
    res.status(200).json({ type: 'success', user: result.rows[0], accessToken })
  } catch (error) {
    console.log('login', error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const getProfile = async (req, res) => {
  const userName = req.params.userName
  const currentUserId = req.user.userId
  let followingStatus = false
  const query = 'select user_id, username, email_address, fullname, bio, follower_count, following_count, profile_pic, gender from users where username = $1'
  const query1 = 'select follow_id from following where user_id = $1 and following_id = $2'
  try {
    const result = await exeQuery(query, [userName])
    if (!result.rowCount) return res.status(404).json({ type: 'error', messages: 'User not Found' })
    const result1 = await exeQuery(query1, [currentUserId, result.rows[0].user_id])
    if (result1.rowCount) followingStatus = true
    result.rows[0].followingStatus = followingStatus
    res.status(200).json({ type: 'Success', profile: result.rows[0] })
  } catch (error) {
    console.log(error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const updateProfile = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).send(errors.array())
  if (!req.body) return res.status(400).json({ messages: 'fields are empty' })
  const {
    userName,
    gender,
    fullName,
    phoneNo,
    bio,
    accType,
    website,
    profilePic
  } = req.body
  const query =
    'update users set gender = $1, fullname = $2, phone_no = $3, bio = $4, acc_type = $5, website = $6, profile_pic = $7 where username = $8 returning user_id'
  try {
    const result = await exeQuery(query, [
      gender,
      fullName,
      phoneNo,
      bio,
      accType,
      website,
      profilePic,
      userName
    ])
    res
      .status(200)
      .json({ type: 'Success', result: result.rows[0], messages: 'successfully updated' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const updatePwd = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) return res.status(422).send(errors.array())
  const { oldPassword, newPassword1, newPassword2 } = req.body
  const userName = req.user.userName
  if (!(newPassword1 === newPassword2)) return res.status(401).json({ messages: "new passwords doesn't match" })
  let query = 'select password from users where username = $1'
  try {
    let result = await exeQuery(query, [userName])
    if (!bcrypt.compareSync(oldPassword, result.rows[0].password)) return res.status(401).json({ message: 'Current password is wrong' })
    const encryptPwd = bcrypt.hashSync(newPassword1, 8)
    query =
      'update users set password = $1 where username = $2 returning user_id'
    result = await exeQuery(query, [encryptPwd, userName])
    res
      .status(200)
      .json({ result: result.rows[0], message: 'password changed' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const changeDp = async (req, res) => {
  const userId = req.user.userId
  const images = req.body.images
  if (!images) return res.status(400).json({ message: 'Please select image to upload' })
  if (!userId) return res.status(400).json({ type: 'error', messages: [{ msg: 'There was an error while creating new post. Please try again later.' }] })
  const query = 'update users set profile_pic = $1 where user_id = $2 returning profile_pic'
  try {
    const result = await exeQuery(query, [images, userId])
    res.status(200).json({ result: result.rows[0], message: 'profile pic updated' })
  } catch (error) {
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const check = async (req, res) => {
  const query = 'select user_id, username, email_address, fullname, bio, follower_count, following_count, profile_pic, gender from users where username = $1'
  try {
    const result = await exeQuery(query, [req.user.userName])
    res.status(200).json({ user: result.rows[0], message: 'user logged in' })
  } catch (error) {
    console.log(error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const followUser = async (req, res) => {
  const { followUser, followingUser } = req.body
  // const query1 = 'select acc_type from users where user_id = $1'
  const query2 = 'insert into following (follow_user, following_user, followed_on) values ($1, $2, $3) returning follow_id'
  const query3 = 'update users set following_count = following_count+1 where username = $1'
  const query5 = 'update users set follower_count = follower_count+1 where username = $1'
  // const query6 = 'insert into requests (user_id, following_id, requested_on) values ($1, $2, $3) returning request_id'
  try {
    // let result = await exeQuery(query1, [followingId])
    // if (result.rows[0].acc_type === 1) {
    //   result = await exeQuery(query6, [req.user.userId, followingId, new Date()])
    //   return res.status(200).json({ type: 'success', message: [{ msg: 'request sent' }, { msg: result.rows[0] }] })
    // }
    let result = await exeQuery(query2, [followUser, followingUser, new Date()])
    const followId = result.rows[0]
    result = await exeQuery(query3, [followUser])
    result = await exeQuery(query5, [followingUser])
    return res.status(200).json({ type: 'success', message: [{ msg: 'following user' }, { msg: followId }] })
  } catch (error) {
    console.log(error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const unfollowUser = async (req, res) => {
  const { followingId } = req.body
  try {
    let query = 'delete from following where user_id = $1 and following_id = $2 returning follow_id'
    const result = await exeQuery(query, [req.user.userId, followingId])
    if (!result.rows[0]) return res.status(400).json({ type: 'error', messages: [{ msg: 'not following user' }] })
    res.status(200).json({ type: 'success', message: [{ msg: result.rows[0] }, { msg: 'Unfollowed user' }] })
    query = 'update users set following_count = following_count-1 where user_id = $1'
    await exeQuery(query, [req.user.userId])
    query = 'update users set follower_count = follower_count-1 where user_id = $1 '
    await exeQuery(query, [followingId])
  } catch (error) {
    console.log(error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const getFollowers = async (req, res) => {
  const userId = req.user.userId
  const names = []
  const query = 'select user_id from following where following_id =$1'
  try {
    const result = await exeQuery(query, [userId])
    for (const userObj of result.rows) {
      names.push(await getFullName(userObj.user_id))
    }
    return res.status(200).json({ type: 'success', user: names })
  } catch (error) {
    console.log(error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const getFollowing = async (req, res) => {
  const userId = req.user.userId
  const names = []
  const query = 'select following_id from following where user_id =$1'
  try {
    const result = await exeQuery(query, [userId])
    for (const userObj of result.rows) {
      names.push(await getFullName(userObj.following_id))
    }
    return res.status(200).json({ type: 'success', user: names })
  } catch (error) {
    console.log(error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

const getFullName = async (userId) => {
  const query = 'select fullname from users where user_id = $1'
  try {
    const result = await exeQuery(query, [userId])
    return result.rows[0].fullname
  } catch (error) {
    console.log('getfullname function: ', error)
  }
}

const searchUser = async (req, res) => {
  const pattern = req.body.pattern
  const query = `select username, fullname, user_id from users where username like '${pattern}%'`
  try {
    const result = await exeQuery(query)
    res.status(200).json({ type: 'success', users: result.rows })
  } catch (error) {
    console.log(error)
    res.status(500).json({ type: 'error', messages: [{ msg: 'Server error' }] })
  }
}

module.exports = { registerUser, loginUser, updateProfile, updatePwd, changeDp, check, getProfile, followUser, unfollowUser, getFollowers, getFollowing, searchUser }
