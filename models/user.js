import mongoose from 'mongoose'
import crypto from 'crypto'

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: [true, "Email address already exists in the database"],
    required: [true, "Email address is required"],
  },
  username: {
    type: String,
    minlength: [2, "Username is to short - minimum 2 characters"],
    maxlength: [30, "Username is to long, max 30 characters"],
    required: [true, "Username is required"],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [5, "Password must be at least 5 characters"],
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString("hex"),
    unique: true,
  },
  savedApartments: []
})

const User = mongoose.model("User", userSchema)

module.exports = User
