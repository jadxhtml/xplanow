import React, { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from "../services/api"; // Giữ nguyên path này của bạn

const Register = () => {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onFinish = async (values) => {
        setLoading(true);
        try {
            await api.post('/auth/register', {
                username: values.username,
                email: values.email,
                password: values.password,
            });

            message.success('Đăng ký thành công! Đăng nhập ngay thôi 🎉');
            navigate('/login');
        } catch (error) {
            message.error(error.response?.data?.message || 'Đăng ký thất bại!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg rounded-xl">
                {/* Header giống hệt trang Login */}
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-blue-600">TaskApp Pro</h1>
                    <p className="text-gray-500">Tạo tài khoản để quản lý Mục tiêu & Công việc</p>
                </div>

                <Form
                    name="register_form"
                    layout="vertical"
                    onFinish={onFinish}
                    size="large"
                >
                    {/* Tên hiển thị */}
                    <Form.Item
                        name="username"
                        rules={[{ required: true, message: 'Vui lòng nhập tên hiển thị!' }]}
                    >
                        <Input
                            prefix={<UserOutlined className="text-gray-400" />}
                            placeholder="Tên của bạn (Username)"
                        />
                    </Form.Item>

                    {/* Email */}
                    <Form.Item
                        name="email"
                        rules={[
                            { required: true, message: 'Vui lòng nhập Email!' },
                            { type: 'email', message: 'Email không đúng định dạng!' }
                        ]}
                    >
                        <Input
                            prefix={<MailOutlined className="text-gray-400" />}
                            placeholder="Email đăng ký"
                        />
                    </Form.Item>

                    {/* Mật khẩu */}
                    <Form.Item
                        name="password"
                        rules={[
                            { required: true, message: 'Vui lòng nhập Mật khẩu!' },
                        ]}
                    >
                        <Input.Password
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="Mật khẩu"
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            className="w-full"
                            loading={loading}
                        >
                            Đăng Ký
                        </Button>
                    </Form.Item>

                    {/* Footer chuyển hướng */}
                    <div className="text-center mt-4">
                        <span className="text-gray-500">Đã có tài khoản? </span>
                        <Link to="/login" className="text-blue-600 hover:text-blue-500 font-medium">
                            Đăng nhập ngay
                        </Link>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default Register;