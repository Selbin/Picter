const multer = require('multer')
const path = require('path')
const fs = require('fs')

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = `static/images/${req.body.userName}`
    fs.stat(dir, (err, stats) => {
      if (err) {
        fs.mkdirSync(dir, error => cb(error, dir))
      }
      return cb(null, dir)
    })
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
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

module.exports = upload
