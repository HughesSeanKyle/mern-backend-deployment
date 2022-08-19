const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const auth = require('../../middleware/auth');
const jwt = require('jsonwebtoken');
const { validationResult, check } = require('express-validator');

const User = require('../../models/User');

// @route GET api/auth
// @desc Get Authenticated user after signUp/Registration
// @access Pvt - Route requires a jwt generated at signup(user route)
router.get('/api/auth', auth, async (req, res) => {
	try {
		// Do not return pw
		// This user will be stored in redux store
		const user = await User.findById(req.user.id).select('-password');
		res.json(user);
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route POST api/auth
// @desc Authenticate user & get token (Existing user - SignIn)
// @access Public - User needs to be able to post credentials to this route to get a token

/*
	In this case the regex does not need to be placed on the PW and the user already signed up. 
	- The goal of this route 
		- Send credential 
		- Check credentials 
		- Get token 
			- Pass token to Auth check above 
		- Return verified user 
*/
router.post(
	'/api/auth',
	[
		check('email', 'Please include a valid email').isEmail(),
		check('password', 'Password is required').exists(),
	],
	async (req, res) => {
		const errors = validationResult(req);
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { email, password } = req.body;

		try {
			// In this case it is expected that the user exists
			// Invalid Credentials msg chosen for security reasons
			let user = await User.findOne({ email: email });

			if (!user) {
				return res
					.status(400)
					.json({ errors: [{ msg: 'Invalid Credentials' }] });
			}

			// Compare plain text pw with encrypted pw - Check for match
			const isMatch = await bcrypt.compare(password, user.password);

			if (!isMatch) {
				return res
					.status(400)
					.json({ errors: [{ msg: 'Invalid Credentials' }] });
			}

			const payload = {
				user: {
					id: user.id,
				},
			};

			jwt.sign(
				payload,
				process.env.JWT_SECRET,
				{ expiresIn: 360000 },
				(err, token) => {
					if (err) throw err;
					res.status(200).json({ token: token });
				}
			);
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

module.exports = router;

/*
	When the user signs in they will be using the auth routes on client side 
	- Say for example you would have a container comp 
		- App 
			- Take jwt token and passed is logged in flag to admin 
			- Auth 
				- This would be responsible for Authorizing the user 
				- This route (Client side)
					- will interact with the Auth route (Server side)
					- A JWT will be returned
						- If valid JWT then grant access to Admin/User routes (below)
				- The token passed to container comp (App)
			- Admin 
				- Receive comms from Auth via App 

			- By adding redux code can be a bit cleaner
				- Global state can be passed via mapStateToProps
				- Global Action creators can be passed as props via mapDispatchToProps
*/
