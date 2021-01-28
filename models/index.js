import dotenv from "dotenv"
import mongoose from 'mongoose'

// This file is opened when you are importing a whole folder like this './models' 
// Here all connection to the db magic happens

dotenv.config()

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/bostad"
mongoose.set('useCreateIndex', true)
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise


// Here you including your models from the external files - this makes it easier to add/delete/update model if it is needed
module.exports.User = require('./user')