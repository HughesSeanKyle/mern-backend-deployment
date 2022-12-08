const express = require('express');
const app = express();
const connectToMongo = require('./config/db')();
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');

const userRouter = require('./routes/api/users');
const authRouter = require('./routes/api/auth');
const postRouter = require('./routes/api/post');
const projectRouter = require('./routes/api/project');
const profileRouter = require('./routes/api/profile');
const chartRouter = require('./routes/api/chart');

// console.log(chartRouter);
const PORT = process.env.PORT || 5000;

// Init Middleware
app.use(express.json({ extended: false }));
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }));
app.use(morgan('common'));
app.use(cors());

// Routes
app.use(userRouter);
app.use(authRouter);
app.use(postRouter);
app.use(projectRouter);
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
