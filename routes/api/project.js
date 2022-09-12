const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { check, validationResult } = require('express-validator');

// Models
const Project = require('../../models/Project');
const Profile = require('../../models/Profile');
const User = require('../../models/User');
const mongoose = require('mongoose');

// @route POST /project
// @desc Create a project
// @access private (USer must be logged in to create a project)

router.post(
	'/api/projects',
	[
		auth,
		[
			check('title', 'Title is required').not().isEmpty(),
			check('description', 'Description is required').not().isEmpty(),
		],
	],
	async (req, res) => {
		const errors = validationResult(req);

		// If errors array is not empty
		if (!errors.isEmpty()) {
			// Bad request
			return res.status(400).json({ errors: errors.array() });
		}

		try {
			// The user will be logged in and the userId will be in the token
			// User object made available via decrypted JWT using auth middleware
			const user = await User.findById(req.user.id).select('-password');

			// Create new post instance from Post model
			const newProject = new Project({
				title: req.body.title,
				description: req.body.description,
				name: user.name,
				avatar: user.avatar,
				user: req.user.id,
			});

			const project = await newProject.save();

			res.status(200).json({
				data: project,
			});
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

// @route GET /projects
// @desc Get all projects
// @access private (Users must be logged in to see comments)

router.get('/api/projects', auth, async (req, res) => {
	try {
		// Sorting by -1 will return the most recent projects
		const projects = await Project.find().sort({ date: -1 });
		res.status(200).json({
			data: projects,
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route GET /project/:id
// @desc Get post by id
// @access private (Users must be logged in to see comments)

router.get('/api/project/:id', auth, async (req, res) => {
	try {
		const project = await Project.findById(req.params.id);

		if (!project) {
			return res.status(404).json({ msg: 'Project not found' });
		}

		res.status(200).json({
			data: project,
		});
	} catch (err) {
		console.error(err.message);
		// If == to object id means it is not a formatted object id
		if (err.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Project not found' });
		}
		res.status(500).send('Server Error');
	}
});

// @route DELETE /project/:id
// @desc Delete post by id
// @access private (User must be logged in to delete => This is a user admin log in (The content provider))

router.delete('/api/project/:id', auth, async (req, res) => {
	try {
		const project = await Project.findById(req.params.id);

		if (!project) {
			return res.status(404).json({ msg: 'Project not found' });
		}

		// Match the user id linked to the post with the authenticated user.
		if (project.user.toString() !== req.user.id) {
			// Not authorized
			return res.status(401).json({ msg: 'User not authorized' });
		}

		await project.remove();

		res.status(200).json({
			msg: 'Project removed',
		});
	} catch (err) {
		console.error(err.message);
		// If == to object id means it is not a formatted object id (If not valid obj id)
		if (err.kind === 'ObjectId') {
			return res.status(404).json({ msg: 'Project not found' });
		}
		res.status(500).send('Server Error');
	}
});

// @route PUT /project/like/:id
// @desc Like a project - (Voting mechanism will come into play here. For now use eth as a unit to vote)
// @access private
router.put('/api/project/like/:id', auth, async (req, res) => {
	try {
		const project = await Project.findById(req.params.id);

		// Check if the post has already been liked
		if (
			project.likes.filter((like) => like.user.toString() == req.user.id)
				.length > 0
		) {
			// 400 Bad Request
			return res.status(400).json({ msg: 'Project already liked' });
		}

		// If post not like then add users like to the beginning of the particular post's likes array (unshift opposite of push - adds at beginning of array rather than at end)
		project.likes.unshift({ user: req.user.id });

		await project.save();

		res.status(200).json({
			data: project.likes,
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route PUT /project/unlike/:id
// @desc Like a project
// @access private
router.put('/api/project/unlike/:id', auth, async (req, res) => {
	try {
		const project = await project.findById(req.params.id);

		// Check if === 0 to see if user has NOT liked it yet

		if (
			project.likes.filter((like) => like.user.toString() == req.user.id)
				.length === 0
		) {
			// 400 Bad Request
			return res.status(400).json({ msg: 'Post has not yet been liked' });
		}

		// Get remove index
		const removeIndex = project.likes
			.map((like) => like.user.toString())
			.indexOf(req.user.id);

		project.likes.splice(removeIndex, 1);

		await project.save();

		res.status(200).json({
			data: project.likes,
		});
	} catch (err) {
		console.error(err.message);
		res.status(500).send('Server Error');
	}
});

// @route POST /project/comments/:id
// @desc Comment on a project
// @access private (User must be logged in to comment on a project)

router.post(
	'/api/project/comment/:id',
	[auth, [check('text', 'Text is required').not().isEmpty()]],
	async (req, res) => {
		console.log('Posts route hit');

		const errors = validationResult(req);

		// If errors array is not empty
		if (!errors.isEmpty()) {
			// Bad request
			return res.status(400).json({ errors: errors.array() });
		}

		try {
			const user = await User.findById(req.user.id).select('-password');
			const project = await Project.findById(req.params.id);

			const newComment = {
				text: req.body.text,
				name: user.name,
				avatar: user.avatar,
				user: req.user.id,
			};

			// Add to beginning of comments array
			project.comments.unshift(newComment);

			await project.save();

			res.status(200).json({
				data: project.comments,
			});
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

/*
	- For the below route, first the post must be found then the respective comment to delete
*/
// @route DELETE /project/comment/:id/:comment_id
// @desc Delete on a comment on a project
// @access private (USer must be logged in to delete a post)
router.delete(
	'/api/project/comment/:id/:comment_id',
	auth,
	async (req, res) => {
		try {
			const project = await Project.findById(req.params.id);

			// Extract comment
			const extractedComment = project.comments.find(
				(comment) => comment.id === req.params.comment_id
			);

			// Make sure comment exist
			if (!extractedComment) {
				return res.status(404).json({
					msg: 'Comment does not exists',
				});
			}

			// Check user
			/*
			The user id within the model is of type object and must be converted to a string to compare to id of authorized user (from JWT)
		*/
			if (extractedComment.user.toString() !== req.user.id) {
				return res.status(401).json({ msg: 'User not authorized' });
			}

			// Get remove index
			/*
			Return the index of the comment where the user id on comment matches the authed user
		*/
			const removeIndex = project.comments
				.map((comment) => comment.user.toString())
				.indexOf(req.user.id);

			project.comments.splice(removeIndex, 1);

			await project.save();

			res.status(200).json({
				data: project.comments,
			});
		} catch (err) {
			console.error(err.message);
			res.status(500).send('Server Error');
		}
	}
);

module.exports = router;
