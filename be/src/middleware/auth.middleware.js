// be/src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');

exports.protect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return res.status(401).json({ message: 'Vui lòng đăng nhập để truy cập' });
        }

        //giai ma token
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        //tim user dua tren id trong token
        const currentUser = await User.findById(decoded.id).select('-password');

        if (!currentUser) {
            return res.status(401).json({ message: "Người dùng không còn tồn tại" })
        }

        //gan thong tin user vao req de cac controller sau co the su dung
        req.user = currentUser;
        next();
    } catch (error) {

        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'TokenExpired' });
        }
        return res.status(401).json({ message: 'Token không hợp lệ' });
    }
};

//middleware phan quyen
exports.authorization = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `Quyền '${req.user.role}' không được truy cập`
            })
        }
        next();
    };
};
