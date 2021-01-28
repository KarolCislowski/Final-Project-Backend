import dotenv from "dotenv"
import mongoose from 'mongoose'

dotenv.config()

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/bostad"
mongoose.set('useCreateIndex', true)
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

module.exports.User = require('./user')