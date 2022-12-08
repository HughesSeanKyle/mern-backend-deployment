const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

const Profile = require('../../models/Profile');
const User = require('../../models/User');
const mongoose = require('mongoose');

// @route GET /profile/me
// @desc get the signed in user profile
// @access pvt route => route accessed via token
router.get('/profile/me', auth, async (req, res) => {
	try {
		// See #Note 1 below
		const profile = await Profile.findOne({ user: req.user.id }).populate(
			'user',
			['name', 'avatar']
		);

		if (!profile) {
			return res.status(400).json({ msg: 'There is no profile for this user' });
		}
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route POST /profile
// @desc Create or Update user Profile
// @access Private
/*
	This route is private as it requires an authenticated user to create a profile. The jwt token created on signIn will be the access mechanism for the user to utilize this resource. 

	Futhermore, it is this token that provides the user id the Profile model requires to create a relational link between Profile and User via the user.id (Provided by mongo)
*/
router.post(
	'/profile',
	[
		auth,
		[
			check('status', 'Status is required').not().isEmpty(),
			check('skills', 'Skills is required').not().isEmpty(),
		],
	],
	async (req, res) => {
		// Pass over entire req object to validationResult
		const errors = validationResult(req);

		// Check if errs
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const {
			company,
			website,
			location,
			bio,
			status,
			githubusername,
			skills,
			youtube,
			facebook,
			twitter,
			instagram,
			linkedin,
		} = req.body;

		// Build Profile object
		const profileFields = {};
		profileFields.user = req.user.id;
		profileFields.social = {};

		// Assign any completed fields to the profileFields object
		for (const key of Object.keys(req.body)) {
			const keyArray = ['status', 'company', 'website', 'location'];
			keyArray.map((keyItem) => {
				if (key === keyItem) profileFields[key] = req.body[key];
			});
			if (key && key !== 'status') {
				if (key === 'skills') {
					// Split skills by comma and trim values of spaces
					profileFields.skills = skills.split(',').map((skill) => skill.trim());
				} else if (
					key === 'youtube' ||
					'twitter' ||
					'facebook' ||
					'linkedIn' ||
					'instagram'
				) {
					profileFields.social[key] = req.body[key];
				} else {
					profileFields[key] = req.body[key];
				}
			}
		}

		try {
			// Find profile in db based on the AUTHORIZED user accessing this route
			// // id comes from jwt and when decrypted id will be present in decrypted object
			let profile = await Profile.findOne({ user: req.user.id });

			if (profile) {
				// update the profile if found
				profile = await Profile.findOneAndUpdate(
					{ user: req.user.id },
					{ $set: profileFields },
					{ new: true }
				);

				return res.json({
					data: profile,
				});
			} else {
				// Create new profile
				profile = new Profile(profileFields);

				await profile.save();
				res.json({
					data: profile,
				});
			}
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route GET /profile
// @desc Get all profiles (No auth required as this should be available for all to access)
// @access Public
router.get('/profile', async (req, res) => {
	try {
		// #Note 2
		const profiles = await Profile.find().populate('user', ['name', 'avatar']);
		res.json({
			data: profiles,
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route GET /profile/user/:user_id
// @desc Get profile by user id
// @access Public
router.get('/profile/user/:user_id', async (req, res) => {
	try {
		// #Note 2
		const profile = await Profile.findOne({
			user: req.params.user_id,
		}).populate('user', ['name', 'avatar']);

		if (!profile) {
			// Bad req
			return res.status(400).json({ msg: 'Profile not found' });
		} else {
			return res.status(200).json({
				data: profile,
			});
		}
	} catch (err) {
		console.error(err.message);
		// If error relates to that of an object id
		if ((err.kind = 'ObjectId')) {
			return res.status(400).json({ msg: 'Profile not found' });
		}
		res.status(500).send('Server Error');
	}
});

// @route DELETE /profile/user/:user_id
// @desc DELETE profile, user & post
// @access Private
router.delete('/profile', auth, async (req, res) => {
	try {
		//  @todo - remove users posts

		// Remove profile
		// Tip: Inside of a lambda function only these db commands will exist => Once serverless deploys the lamda function it will get its own url/endpoint. The conditions for the routes can then be tweaked even further inside of API gateway.
		await Profile.findOneAndRemove({ user: req.user.id });

		await User.findOneAndRemove({ _id: req.user.id });

		res.json({
			msg: 'Profile and User Deleted',
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route PUT /profile/experience
// @desc Update parts of profile profile. This route could have been a post route as well. The main aim of this route is just for adding(Create/POST(Classified as put as it is part of the profile)) purposes. The route below will be to edit the added instance (target by id)
// @access Private

router.put(
	'/profile/experience',
	[
		auth,
		[
			check('title', 'Title is a required field').not().isEmpty(),
			check('company', 'Company is a required field').not().isEmpty(),
			check('from', 'From Date is a required field').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);

		// If there are any errors
		if (!errors.isEmpty()) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { title, company, location, from, to, current, description } =
			req.body;

		// e.g short hand for title:title => Below allocated from req.body
		// Creates a new object with the data the user submits
		const newExp = { title, company, location, from, to, current, description };

		try {
			// The persistence of this record will add it's own id within the experience array. Making it easy to update/delete/show this record on the client side
			const profile = await Profile.findOne({ user: req.user.id });

			// unshift => Same as push but adds to front rather than back of array
			// This will ensure the most recent exp is first in the array and older exp is pushed to back of array.
			profile.experience.unshift(newExp);

			await profile.save();

			res.json({
				data: profile,
			});
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route PUT /profile/experience
// @desc Update any experience fields within the array (For user experience purposes - The user will have an edit button next to experience - on Click => User will have all experience listed out in a list item => React requires item keys in a list to be unique, the experience id in the array will be the key and once the element with this key is selected, this will then be the key used to access and update the same object in the db). For now simulate id selection via postman.

/* - // @ Additional Contex -
	- steps in flow
		- 1. Signs In and gets jwt token
		- 2. User gets directed to say profile page
		- 2.1 - (Clientside) Once route hit for profile useEffect will trigger get req to get user profile by user id (route === profile/me)
		- 2.2 - Profile then rendered with various key fields 
			- An edit button will will be located close to profile key 
		- 3. The user selects edit experience as field to update
			- This info is already present as get req for entire profile was made when user logged in  
		- 4. A list of experience is then rendered from most recent to oldest as per array setup above 
		- 5. User clicks on LI (Which has a key val that matches the id of the exp in the db)
		- 6. Post req then made to query profile.experience[key_id]
*/
// @access Private - Only an Authenticated user will be able to update their experience
router.put(
	'/profile/experience/:exp_id',
	[
		auth,
		[
			check('title', 'Title is a required field').not().isEmpty(),
			check('company', 'Company is a required field').not().isEmpty(),
			check('from', 'From Date is a required field').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);

		// If there are any errors
		if (!errors.isEmpty) {
			// Bad request
			return res.status(400).json({ errors: errors.array() });
		}

		// Get the index of exp object in exp array
		const selectedExpIdx = req.headers.selectedexpidx;
		console.log(('selectedExpIdx', selectedExpIdx));

		console.log(('HEADERS', req.headers));

		let updatedProfile;

		try {
			// First get the profile by user id => This is passed through by auth token
			const updateExperience = async (selectedExpIdx) => {
				for (var prop in req.body) {
					console.log(prop);

					let ExpArrayElm = `experience.${selectedExpIdx}.id`;
					updatedProfile = await Profile.findOneAndUpdate(
						{
							user: req.user.id,
							ExpArrayElm: mongoose.Types.ObjectId(req.params.exp_id),
						},
						{
							$set: {
								[`experience.${selectedExpIdx}.${prop}`]: req.body[prop],
							},
						}
					);
				}
			};

			await updateExperience(selectedExpIdx);
			await updatedProfile.save();

			return res.status(200).json({
				updatedProfile: updatedProfile,
			});
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route    DELETE Experience profile/experience/:exp_id
/* 
	Route can also be a PUT req as it is editing props within Profile
*/
// @desc     Delete exp from profile
// @access   Private
router.delete('/profile/experience/:exp_id', auth, async (req, res) => {
	try {
		// Get the profile of the authenticated user
		const profile = await Profile.findOne({ user: req.user.id });

		// Index in Experience array to remove
		// Compare the ID given in params to id provided in Exp element. Use map to loop each of them and test against each expItem then return
		const removeIndex = profile.experience
			.map((expItem) => expItem.id)
			.indexOf(req.params.exp_id);

		// Create an instance of profile where the respective ExpId is removed
		profile.experience.splice(removeIndex, 1);

		// persist the edited profile instance to db
		await profile.save();

		return res.status(200).json({
			updatedProfile: profile,
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route    ADD/CREATE/POST Profile Education profile/education/:exp_id
/* 
	Route can also be a PUT req as it is editing props within Profile
*/
// @desc     Add Education to profile
// @access   Private
router.post(
	'/profile/education/',
	[
		auth,
		[
			check('school', 'School is a required field').not().isEmpty(),
			check('degree', 'Degree is a required field').not().isEmpty(),
			check('fieldofstudy', 'Field of study is a required field')
				.not()
				.isEmpty(),
			check('from', 'From Date is a required field').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);

		// If there are any errors
		if (!errors.isEmpty) {
			return res.status(400).json({ errors: errors.array() });
		}

		const { school, degree, fieldofstudy, from, to, current, description } =
			req.body;

		// e.g short hand for title:title => Below allocated from req.body
		// Creates a new object with the data the user submits
		const newEdu = {
			school,
			degree,
			fieldofstudy,
			from,
			to,
			current,
			description,
		};

		try {
			// The persistence of this record will add it's own id within the experience array. Making it easy to update/delete/show this record on the client side
			const profile = await Profile.findOne({ user: req.user.id });

			// unshift => Same as push but adds to front rather than back of array
			// This will ensure the most recent exp is first in the array and older exp is pushed to back of array.
			profile.education.unshift(newEdu);

			await profile.save();

			res.json({
				data: profile,
			});
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// --------------------------------
// @route    DELETE Profile Education profile/education/:edu_id
/* 
	Route can also be a PUT req as it is editing props within Profile
*/
// @desc     Delete Education from profile profile
// @access   Private
router.delete('/profile/education/:edu_id', auth, async (req, res) => {
	try {
		// Get the profile of the authenticated user
		const profile = await Profile.findOne({ user: req.user.id });

		const removeIndex = profile.education
			.map((eduItem) => eduItem.id)
			.indexOf(req.params.edu_id);

		// Create an instance of profile where the respective EduId is removed
		profile.education.splice(removeIndex, 1);

		// persist the edited profile instance to db
		await profile.save();

		return res.status(200).json({
			updatedProfile: profile,
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

module.exports = router;

/*
    #Note 1
    - const profile = await Profile.findOne({ user: req.user.id }).populate(
			'user',
			['name', 'avatar']
		);

        - Find the profile which matches the req.user.id 
            - req.user.id 
                - This is the decrypted JWT user id returned from auth 
                - If this user is not returned then this route cannot be accessed  

        - .populate(
			'user',
			['name', 'avatar']
		);
            - Include these fields from the user model when returning the user Profile 

	#Note 2 
	- const profiles = await Profile.find().populate('user', ['name', 'avatar'])
		- Get all profiles and append these user attributes 
			- 1. name
			- 2. avatar 

	#Note 3 
	- Further client side planning for edit experience route - 
	// Update each field in req.body
					/*
						1. Get the profile associated with the authed user 
						2. Target the experience array at elm 1 with the provided id 
						3. Set the prop provided with the prop value provided in req.body

						- Next 
							- Make it so that the user can dynamically target any elm in the array
								- Visualize the UX for that particular selection 

							- Potential client side flow 
								- Scenario 1 (From perspective of Authenticated user)
									- User visits https://mydomain/<layout-page>/profile/me 
										- 1. on the layout page 
											- Run a UseEffect[] that will GET an authenticated user's 
												- 1.1 Credentials 
													- Use this to manage session
												- 1.2 Profile information 
													- This will be displayed on the the /profile/me route
													- The keys within the response will be clickable headings 
														- with a drop down 
												- 1.3 User clicks Experience drop down 
													- 1.3.1 A selection field is rendered for each elm in array 
														- Each Selection field will have the following props
															- i) Rendering items via a map requires a key in react 
																- The key will be the array[elm].mongoDbID
																	- an update and delete button will be rendered on each selection 
												- 1.4 The user clicks update on the respective selection (array[elm]/index) they wish to update
													- 1.4.1 - A form on a modal appears 
													- 1.4.2 - User enters info 
													- 1.4.3 - Clicks submit 
													- 1.4.4 - A put request is made from client side to this route 
														- INSIDE THE PUT REQUEST HEADERS 
															- The JWT token the user received from signIn
																- This token will be available in state and will be made 
																	- globally available for all comps 
																		- Example of app structure 
																			- App.js (token state here - auth will pass back if not using redux)
																				- Auth (Layout file)
																				- <Any additional layout> 
														- FROM THE URL PARAMS 
															- The ExpArray[elm].id  
																- This will be retrieved when the user clicks update 
																	- The key will be stored in state
																		- The index of this selected field will also be part of this state 
																			- example state : {
																				slectedExpID: 54645464,
																				selectedExpIdx: 0
																			}
																				- The selectedExpIdx can be sent through the req.headers
																					- This piece of state can then alter the desired elm in array 
																	- This piece of state will be sent along as the exp_id in params 
																		- Example on client side 
																			- fetch("https://mydomain/profile/experience/${idOrkeyFromSelectedExp}".....)
																	- The index param from the map statement will be assigned to 
														- FORM DATA 
															- FRom request.body  

						- 21/07/
							- Next steps 
								- 1. Create a new object in array (New ID )
									- Implemented
								- 2. Target update of that new object 
									- Implemented

					

*/
