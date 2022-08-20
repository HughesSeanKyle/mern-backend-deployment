const express = require('express');
const app = express();
const connectToMongo = require('./config/db')();
const path = require('path');
const cors = require('cors');

const userRouter = require('./routes/api/users');
const authRouter = require('./routes/api/auth');
const postRouter = require('./routes/api/post');
const profileRouter = require('./routes/api/profile');
const chartRouter = require('./routes/api/chart');

// console.log(chartRouter);
const PORT = process.env.PORT || 5000;

// Init Middleware
app.use(express.json({ extended: false }));
app.use(cors());

// Define Routes
/*
	Reference this for restful route guide 
	- https://medium.com/@shubhangirajagrawal/the-7-restful-routes-a8e84201f206
*/

/*
19/08 - Update all other routes like user router. Then continue with client. Push to Netlify and use heroku routes when building out app further
*/
app.use(userRouter);
app.use(authRouter);
app.use(postRouter);
app.use(profileRouter);
app.use(chartRouter);

app.get('/test-get', (req, res) => {
	res.send('Hello from the root route. Update, Two three four ');
});

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
	// Set static folder
	app.use(express.static('client/build'));

	// Server index.html file
	app.get('*', (req, res) => {
		// From current directory, go into client folder, into the build folder, and load the index.html file
		res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
	});
}

app.listen(PORT, () => {
	console.log(`Serving from port ${PORT}.`);
});
