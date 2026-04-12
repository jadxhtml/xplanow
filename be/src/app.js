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
const messageRoutes = require('./modules/messages/message.route');
const reportRoutes = require('./modules/reports/report.route');
const path = require('path');



const app = express();

//middleware
app.use(express.json());
app.use(cors());
app.use(morgan('dev'));


app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/objectives', objectiveRoutes);
app.use('/api/key-results', keyResultRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/reports', reportRoutes);


module.exports = app;