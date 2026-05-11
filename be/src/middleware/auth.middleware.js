// be/src/middlewares/auth.middleware.js
const jwt = require('jsonwebtoken');
const User = require('../modules/users/user.model');
const Group = require('../modules/groups/group.model');

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

//middleware kiem tra truong nhom
exports.isGroupAdmin = async (req, res, next) => {
    try {
        // 1. Lấy ID nhóm
        const groupId = req.params.groupId || req.query.groupId || req.body?.group;
        if (!groupId) {
            return res.status(400).json({ message: "Thiếu thông tin ID Nhóm" });
        }

        // 2. Tìm nhóm
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Không tìm thấy nhóm làm việc" });
        }

        // 3. Kiểm tra User hiện tại
        if (!req.user) {
            return res.status(401).json({ message: "Lỗi xác thực: Không tìm thấy người dùng" });
        }
        const currentUserId = req.user.id || req.user._id;

        // 👉 4. TÌM TRƯỞNG NHÓM (DỰA VÀO MẢNG MEMBERS)
        // Duyệt qua mảng members, tìm người có role là 'admin'
        const adminMember = group.members.find(member => member.role === 'admin');

        // Nếu nhóm bị lỗi dữ liệu, không có ai là admin
        if (!adminMember || !adminMember.user) {
            return res.status(500).json({
                message: "Lỗi CSDL: Nhóm này không có Trưởng nhóm (admin) hợp lệ!"
            });
        }

        // 5. So sánh ID của Admin vừa tìm được với ID của người đang request
        if (adminMember.user.toString() !== currentUserId.toString()) {
            return res.status(403).json({
                message: "Truy cập bị từ chối! Chỉ Trưởng nhóm mới được giao việc hoặc tạo Mục tiêu."
            });
        }

        // Vượt qua hết thì cho đi tiếp
        next();
    } catch (error) {
        console.error("🔴 Lỗi kiểm tra quyền Admin:", error);
        res.status(500).json({ message: "Lỗi máy chủ nội bộ khi kiểm tra quyền" });
    }
};
