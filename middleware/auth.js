const jwt = require('jsonwebtoken');

// next() = move on to next mw when resolved
module.exports = function (req, res, next) {
	// Get token from header
	// This token is generated via the users id
	// // Will be present on signIn and Signup
	// // // Token will manage session
	const token = req.header('x-auth-token');

	// Check if there is no token
	if (!token) {
		return res.status(401).json({ msg: 'No token, authorization denied' });
	}

	// Verify token
	try {
		// Decrypt and get value from jwt
		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		// Use this user in any protected routes
		req.user = decoded.user;
		next();
	} catch (err) {
		res.status(401).json({ msg: 'Token is not valid' });
	}
};
