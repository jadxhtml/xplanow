const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const authRoutes = require('./modules/auth/auth.route');
const taskRoutes = require('./modules/tasks/task.route');
const objectiveRoutes = require('./modules/objectives/objective.route');
const keyResultRoutes = require('./modules/keyResults/keyResult.route');
const activityRoutes = require('./modules/activities/activity.route');
const groupRoutes = require('./modules/groups/group.route');
const conversationRoutes = require('./modules/conversations/conversation.route');
const userRoutes = require('./modules/users/user.route');


const app = express();

//middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/objectives', objectiveRoutes);
app.use('/api/key-results', keyResultRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);


module.exports = app;