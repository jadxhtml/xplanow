const cloudinary = require('cloudinary').v2;
const multer = require("multer");
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'TaskApp',
        allowedFormats: ['jpg, jpeg, gif, png, pdf, docx, txt'],
        transformation: [{ width: 800, heigh: 800, crop: 'limit' }]
    }
});

const uploadCloud = multer({ storage });
module.exports = uploadCloud;