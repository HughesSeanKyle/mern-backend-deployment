const mongoose = require('mongoose');
require('dotenv').config();

const connectToMongo = () => {
	try {
		// Connect to the MongoDB cluster
		mongoose
			.connect(process.env.MONGO_DB_URI, {
				dbName: 'newDatabaseForFun',
				useNewUrlParser: true,
				useUnifiedTopology: true,
			})
			.then(() => console.log('connection successful'))
			.catch((err) => console.log(err));
	} catch (e) {
		console.log(`Database connection error: ${err.message}`);
	}
};

module.exports = connectToMongo;
