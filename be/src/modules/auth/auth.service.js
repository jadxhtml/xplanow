const User = require('../users/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

//ham` tao token
const generateTokens = (userId) => {
    const accessToken = jwt.sign({ id: userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: process.env.JWT_ACCESS_EXPIRE });
    const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRE });
    return {
        accessToken, refreshToken
    };
};

//logic dang ki
exports.registerUser = async (username, email, password) => {
    const userExits = await User.findOne({ email });
    if (userExits) throw new Error("Email đã được sử dụng");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ username, email, password: hashedPassword });

    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }, ...tokens
    };
};

//logic dang nhap
exports.loginUser = async (email, password) => {
    const user = await User.findOne({ email });
    if (!user) throw new Error('Email không tồn tại');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Mật khẩu không chính xác');

    const tokens = generateTokens(user._id);

    user.refreshToken = tokens.refreshToken;
    await user.save();

    return {
        user: {
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
        }, ...tokens
    };
}

//logic xin cap lai Access Token bang refresh token
exports.refreshAccessToken = async (token) => {
    if (!token) throw new Error('Không có Refresh Token');

    //giai ma token
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);

    //tim user va kiem tra token trong DB
    const user = await User.findById(decoded.id);
    if (!user || user.refreshToken !== token) throw new Error('Refresh Token không hợp lệ hoặc bị thu hồi');

    //cap phat cap. token moi
    const tokens = generateTokens(user._id);
    user.refreshToken = tokens.refreshToken;
    await user.save()

    return tokens;
};

exports.googleLogin = async (idToken) => {
    try {
        //verify idToken voi GG
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const { email, name } = payload;

        //kiem tra user
        let user = await User.findOne({ email });


        if (!user) {
            user = await User.create({
                username: name,
                email: email,
                password: 'google_login_no_password',
                role: 'user'
            });
        }
        const accessToken = generateToken(user._id);

        return {
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            },
            accessToken
        };
    } catch (error) {
        throw new Error('Xác thực Google thất bại: ' + error.message);
    }
};