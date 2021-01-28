import mongoose from 'mongoose'
import db from '../models'

export const authenticateUser = async (req, res, next) => {
  const user = await db.User.findOne({ accessToken: req.header("Authorization") })
  if (user) {
    req.user = user
    next()
  } else {
    res.status(403).json({ loggedOut: true })
  }
}

export const checkConnection = ((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).json({ error: 'Service unavailable' })
  }
})