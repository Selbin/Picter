const jwt = require('jsonwebtoken')

const authenticate = (req, res, next) => {
  if (req.url === '/api/picter/auth/register' || req.url === '/api/picter/auth/login' || req.url === '/api/picter/auth/check') return next()
  const token = req.headers['x-auth-token']
  if (!token) return res.status(401).json({ message: 'please login' })
  jwt.verify(token, process.env.PRIVATEKEY, (err, user) => {
    if (err) return res.status(401).json({ message: 'invalid user' })
    req.user = user
    next()
  })
}

module.exports = authenticate
