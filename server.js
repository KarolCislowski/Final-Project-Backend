import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from "mongoose"
//__________ New imports
import bcrypt from "bcrypt"
import crypto from "crypto"
import listEndpoints from 'express-list-endpoints'
import dotenv from "dotenv"

//__________ Database Code
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/bostads-api"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

//__________ Schema for authentication
const userSchema = new mongoose.Schema({
	username: {
		type: String,
		unique: [true, "Email address already exists in the database"],
		required: [true, "Email address is required"]
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
}, { timestamps: true })

userSchema.pre("save", async function (next) {
	const user = this
	if (!user.isModified("password")) {
		return next()
	}
	const salt = bcrypt.genSaltSync()
	user.password = bcrypt.hashSync(user.password, salt)
	next()
})

//__________ Mongoose model for creating a user object
const User = mongoose.model("User", userSchema)

//__________ Bostad Model (should i use this?)
// const Bostad = mongoose.model('Bostad', {
//   annonsID: {
//     type: Number,
//   },
//   stadsdel: {
//     type: String,
//   }, 
//   kommun: {
//     type: String,
//   },
//   antalRum: {
//     type: String,
//   },
//   yta: {
//     type: String,
//   },
//   hyra: {
//     type: Number,
//   },
//   url: {
//     type: String
//   }
// })

//__________ Middleware to hash password before new user is saved

const authenticateUser = async (req, res, next) => {
	const user = await User.findOne({ accessToken: req.header("Authorization")})
	if (user) {
		req.user = user
		next()
	} else {
		res.status(403).json({ loggedOut: true })  
	}
}

//__________ Server
const port = process.env.PORT || 8080
const app = express()

//__________ Middlewares
app.use(cors())
app.use(bodyParser.json())

//__________ Error handling when database is down or out of reach
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).json({ error: 'Service unavailable' })
  }
})

//__________ Root endpoint
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

//__________Create user
app.post("/users", async (req, res) => {
	try {
		const { username, password } = req.body
		const user = await new User({
			username,
			password,
		}).save()

		res.status(201).json({ userId: user._id, accessToken: user.accessToken })
	} catch (err) {
		res.status(400).json({ message: "could not create this user", errors: err })
	}
})

//__________Login endpoint
app.post("/sessions", async (req, res) => {
	try {
		const user = await User.findOne({ username: req.body.username })
		if (user && bcrypt.compareSync(req.body.password, user.password)) {
			res.status(200).json({
				userFound: true,
				userId: user._id,
				accessToken: user.accessToken,
			})
		} else {
			res.status(400)
			res.json({
				userFound: false,
				message: "Login failed, please try again.",
			})
		}
	} catch (err) {
		res
			.status(400)
			.json({ message: "Login failed, please try again.", errors: err })
	}
})

//__________ Secure endpoint for signed in users (fetch to external api here soon)
app.get("/listings", authenticateUser)
app.get("/listings", (req, res) => {
	const bostadsListing = {
		imageUrl: `https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80`,
	}
	res.status(201).json({ bostadsListing })
})

//__________ Secure personal endpoint for signed in user
app.get("/users/:id", authenticateUser)
app.get("/users/:id", async (req, res) => {
	try {
		const user = await User.findOne({ _id: req.params.id })
  	const profile = `Welcome to your site ${req.user.name}`
	} catch (error) {
		res.status(400).json({message: "could not find profile"})
	}
})

// //__________ Endpoints for saving listings 
app.post("users/:id/listings", authenticateUser)
app.post("users/:id/listings", async (req, res) => {
	const { id } = req.params
		try {
			const save = await bostadsListing.findOne({_id: req.params.id})
			res.status(200).json({ success: "listing saved" })
		} catch (err) {
			res.status(400).json({ message: "Could not save listing to database", error: err.errors,})
		}
})

//__________ Endpoint for deleting listings


//__________ Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

//TODO: 
// Add authentication 
// Add get request to bostads api 
// Add error handling
// save & delete save function