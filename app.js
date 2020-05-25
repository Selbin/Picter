const express = require('express')
const cookieParser = require('cookie-parser')
const indexRoutes = require('./routes/index.route')
const dotEnv = require('dotenv')
const authenticate = require('./middlewares/auth')
const cors = require('cors')

const app = express()
dotEnv.config()

if (!process.env.PRIVATEKEY) process.exit(1)
app.use(cors())
app.use(cookieParser())
app.use(express.json())
app.use(authenticate)

app.use('/picter/api', indexRoutes)

app.use(express.static())

const port = process.env.PORT || 6000
app.listen(port, () => console.log(`Listening on port ${port}...`))
