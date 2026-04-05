const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`Connection String: ${conn.connection.host}`);

    } catch (error) {
        console.log(`Loi: ${error.message}`);
        process.exit(1);
    }
}

module.exports = connectDB;
