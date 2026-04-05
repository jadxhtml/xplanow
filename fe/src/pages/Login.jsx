import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';
import FormItem from 'antd/es/form/FormItem';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            const response = await api.post('/auth/login', {
                email: values.email,
                password: values.password,
            });

            localStorage.setItem('accessToken', response.data.accessToken);

            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }

            localStorage.setItem('user', JSON.stringify(response.data.user));

            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.accessToken}`;

            message.success('Đăng nhập thành công! Chào mừng trở lại 🎉');

            navigate('/');

        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng nhập thất bại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center">
            <Card className="w-full max-w-md shadow-lg rounded-xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-blue-600">TaskApp Pro</h1>
                    <p className="text-gray-500">Đăng nhập để quản lý Mục tiêu & Công việc</p>
                </div>

                <Form
                    name="login_form"
                    layout="vertical"
                    onFinish={onFinish}
                    size="large"
                >
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập Email!' },
                            { type: 'email', message: 'Email không đúng định dạng!' }
                        ]}
                    >
                        <Input prefix={<UserOutlined />} autoComplete="username" placeholder="Email của bạn" />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Vui lòng nhập Mật khẩu!' }]}
                    >
                        <Input.Password prefix={<LockOutlined />} autoComplete="current-password" placeholder="Mật khẩu" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit" className="w-full" loading={loading}>
                            Đăng Nhập
                        </Button>
                    </Form.Item>
                    <div className="text-center mt-4">
                        <span className="text-gray-500">Chưa có tài khoản? </span>
                        <Link to="/register" className="text-blue-600 hover:text-blue-500 font-medium transition-colors">
                            Đăng ký ngay
                        </Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default Login;