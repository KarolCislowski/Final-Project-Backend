import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from "mongoose"
//__________ New imports
import bcrypt from "bcrypt"
import crypto from "crypto"
import listEndpoints from 'express-list-endpoints'
import dotenv from "dotenv"
import bent from "bent"

//__________ Database Code
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/bostads-api"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

//__________ Schema for authentication
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
})

//__________ Saved add Schema
const savedItemSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
	},
  annonsId: {
		type: Number,
		unique: [true, "You have already saved this item"], //FIXME: working?
	},
})

//__________ Mongoose models 
const User = mongoose.model("User", userSchema)
const SavedItem = mongoose.model("SavedItem", savedItemSchema)

//__________ Middleware to authenticate the user
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
		const { username, password, email } = req.body
		const salt = bcrypt.genSaltSync()
		const user = await new User({
			username,
			password:bcrypt.hashSync(password, salt),
			email,
		}).save()

		res.status(201).json({ userId: user._id, accessToken: user.accessToken })
	} catch (err) {
		res.status(400).json({ message: "could not create this user", errors: err })
	}
})

//__________Login session
app.post("/sessions", async (req, res) => {
	try {
		
		const user = await User.findOne({ email: req.body.email })
		console.log(user)
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

//__________ Secure personal endpoint for signed in user
app.get("/users/:id", authenticateUser)
app.get("/users/:id", async (req, res) => {
	try {
		// const user = await User.findOne({ _id: req.params.id })
		const profile = `Welcome to your page ${req.user.username}`
		res.status(201).json(profile)
	} catch (error) {
		res.status(400).json({message: "could not find user"})
	}
}),

//__________ Endpoint with all data 
app.get("/list", async (req, res) => {
	const bent = require('bent')
	const getJSON = bent('json')
	const object = await getJSON('https://bostad.stockholm.se/Lista/AllaAnnonser')
	res.status(201).json(object)
})

//__________ Endpoint to save specific ad 
//FIXME: At the moment you can save the ad multiple times - how to fix?
app.post("/saveData/:annonsId", authenticateUser)
app.post("/saveData/:annonsId", async (req, res) => {
	const { annonsId } = req.body
	console.log(annonsId)
	const id = new SavedItem({ annonsId, userId })
	try {
		const savedId = await id.save()
		res.status(201).send(savedId)
	} catch (err) {
		res.status(404).json({
			message: "Could not save add to database",
			error: err.errors
		})
	}
	//res.status(201).json(body)
})

//__________ Endpoint to list users saved ads
app.get("/getData", authenticateUser)
app.get("/getData", async (req, res) => {
	try {
    //Success
		const items = await SavedItem.find().sort({ createdAt: "desc" })
		console.log(items)
    res.status(200).json(items)
  } catch (err) {
    res
      .status(400)
      .json({ message: "Could not get item", error: err.errors })
  }
})

//__________ TODO:Endpoint for deleting listings

//__________ Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})


// TODO: 
// Authentication - sign in not working - DONE
// FIXME: Save function - can save ad multiple time- fix
// Add authentication - DONE
// Schema for user - DONE
// Schema for bostad - DONE
// Add get request to bostads api - DONE
// Add custom error handling
// Save & delete endpoint
// Validator for email?
// Dotenv



// //__________ Appartment Schema  - Save to DB? If not Remove this
// const appartmentSchema = new mongoose.Schema({
// 	userId: {
// 		type: mongoose.Schema.Types.ObjectId,
// 		ref: "User"
// 	},
//   annonsID: {
//     type: Number,
// 	},
// 	saved: {
// 		type: Boolean,
// 		default: false,
// 	},
//   stadsdel: {
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
// 	}
// })
