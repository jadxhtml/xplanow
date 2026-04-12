const authService = require('./auth.service');
const jwt = require('jsonwebtoken');

exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const result = await authService.registerUser(username, email, password);
        res.status(201).json({ message: "Đăng kí thành công", ...result });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await authService.loginUser(email, password);
        res.status(200).json({ message: "Đăng nhập thành công", ...result });

    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ message: "Không có Refresh Token" });

        // Gọi thẳng hàm từ service của bạn
        const tokens = await authService.refreshAccessToken(refreshToken);

        // Nó trả về cả accessToken và refreshToken mới
        res.status(200).json(tokens);
    } catch (error) {
        console.error("Lỗi Refresh Token:", error.message);
        res.status(403).json({ message: "Refresh Token không hợp lệ hoặc đã hết hạn" });
    }
};

exports.googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;
        const result = await authService.googleLogin(idToken);
        res.status(200).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};