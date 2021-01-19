import express from 'express'
import bodyParser from 'body-parser'
import cors from 'cors'
import mongoose from "mongoose"
//Nya imports 
import bcrypt from "bcrypt";
import crypto from "crypto";
import dotenv from "dotenv";

//  CODE FOR DATABASE
const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/enBostad"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

// SCHEMA FOR AUTHENTICATION 
const userSchema = new mongoose.Schema({
	username: {
		type: String,
		unique: true,
		required: true,
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
});

userSchema.pre("save", async function (next) {
	const user = this;
	if (!user.isModified("password")) {
		return next();
	}
	const salt = bcrypt.genSaltSync();
	user.password = bcrypt.hashSync(user.password, salt);
	next();
});

//mongoose model for creating a user object
const User = mongoose.model("User", userSchema);

// // BOSTAD MODEL
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

//   SERVER
const port = process.env.PORT || 8080
const app = express()

// Middleware, authenticate user. Checks access tokens in header of the request.
const authenticateUser = async (req, res, next) => {
	const user = await User.findOne({ accessToken: req.header("Authorization")});
	if (user) {
		req.user = user;
		next();
	} else {
		res.status(403).json({ loggedOut: true });
	}
};

// MIDDLEWARES
app.use(cors())
app.use(bodyParser.json())
const listEndpoints = require('express-list-endpoints')

// ERROR HANDLING WHEN DATABASE IS DOWN OR OUT OF REACH
app.use((req, res, next) => {
  if (mongoose.connection.readyState === 1) {
    next()
  } else {
    res.status(503).json({ error: 'Service unavailable' })
  }
})

// ROOT ENDPOINT
app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

// Create user
app.post("/users", async (req, res) => {
	try {
		const { username, password } = req.body;
		const user = await new User({
			username,
			password,
		}).save();

		res.status(201).json({ userId: user._id, accessToken: user.accessToken });
	} catch (err) {
		res.status(400).json({ message: "could not create this user", errors: err });
	}
});

// Login endpoint
app.post("/sessions", async (req, res) => {
	try {
		const user = await User.findOne({ username: req.body.username });
		if (user && bcrypt.compareSync(req.body.password, user.password)) {
			res.status(200).json({
				userFound: true,
				userId: user._id,
				accessToken: user.accessToken,
			});
		} else {
			res.status(400);
			res.json({
				userFound: false,
				message: "Login failed, please try again.",
			});
		}
	} catch (err) {
		res
			.status(400)
			.json({ message: "Login failed, please try again.", errors: err });
	}
});


// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})

// SECURE ENDPOINT WHICH USER NEED TO LOGIN TO ACCESS
app.get("/listings", authenticateUser);
app.get("/listings", (req, res) => {
	const bostadsListing = {
		imageUrl: `https://images.unsplash.com/photo-1570129477492-45c003edd2be?ixid=MXwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHw%3D&ixlib=rb-1.2.1&auto=format&fit=crop&w=1500&q=80`,
	};

	res.status(201).json({ bostadsListing });
});



//TODO: 
// Add authentication 
// Add get request to bostads api 
// Add error handling
// save & like function