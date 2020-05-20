const multer = require('multer')
const path = require('path')
const aws = require('aws-sdk')
const multerS3 = require('multer-s3')
const dotenv = require('dotenv')
const { v4 } = require('uuid')

dotenv.config()

aws.config.update({
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  accessKeyId: process.env.AWS_ACCESS_KEY,
  region: process.env.AWS_REGION
})

const s3 = new aws.S3()

const storage = multerS3({
  s3: s3,
  bucket: process.env.AWS_S3_BUCKET,
  acl: 'public-read',
  key: function (req, file, cb) {
    cb(null, v4() + path.extname(file.originalname))
  }
})

const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png/
  const mimetype = filetypes.test(file.mimetype)
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase())
  if (mimetype && extname) {
    return cb(null, true)
  }
  cb(new Error('file format not supported'))
}

const limits = { fileSize: 5e+6 }

const upload = multer({ storage, fileFilter, limits })

const deleteImage = async (file) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET,
    Key: file
  }
  try {
    const result = await s3
      .deleteObject(params, function (err, data) {
        if (err) return err
        return data
      })
      .promise()
    console.log('Response: ', result)
    return true
  } catch (err) {
    console.log('Error: ', err)
    return false
  }
}

module.exports = { upload, deleteImage }
