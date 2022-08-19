const mongoose = require('mongoose');

// For now focus only on the home seller. Add roles for the buyer later

const UserSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
	avatar: {
		type: String,
	},
	date: {
		type: Date,
		default: Date.now,
	},
});

module.exports = User = mongoose.model('user', UserSchema);

/*
	For more fine grained user modelign. e.g roles, triming strings stc 
	- https://stackoverflow.com/questions/26321250/mongoose-schema-for-multi-user-application
*/
