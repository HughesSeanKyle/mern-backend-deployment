const express = require('express');
const app = express();
const connectToMongo = require('./config/db')();
const path = require('path');

const userRouter = require('./routes/api/users');
const authRouter = require('./routes/api/auth');
const postRouter = require('./routes/api/post');
const profileRouter = require('./routes/api/profile');
const chartRouter = require('./routes/api/chart');

// console.log(chartRouter);
const PORT = process.env.PORT || 5000;

// Init Middleware
app.use(express.json({ extended: false }));

// Define Routes
/*
	Reference this for restful route guide 
	- https://medium.com/@shubhangirajagrawal/the-7-restful-routes-a8e84201f206
*/
app.use(userRouter);
app.use('/auth', authRouter);
app.use('/post', postRouter);
app.use('/profile', profileRouter);
app.use('/chart', chartRouter);

app.get('/test-get', (req, res) => {
	res.send('Hello from the root route');
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
