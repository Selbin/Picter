const express = require('express')
const router = express.Router()
const postHandler = require('../controller/postHandler')

router.post('/upload', postHandler.uploadImage)
router.delete('/:image', postHandler.deleteImages)

module.export = router
