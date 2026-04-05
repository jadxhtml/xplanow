import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Avatar, List, Tag, message, Spin, Modal, Form, Input } from 'antd';
import { ArrowLeftOutlined, UserAddOutlined, CrownOutlined, UserOutlined } from '@ant-design/icons';
import axios from 'axios';

const GroupDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();

    const token = localStorage.getItem('accessToken');
    const api = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: { Authorization: `Bearer ${token}` }
    });

    const fetchGroupDetail = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/groups/${id}`);
            setGroup(res.data);
        } catch (error) {
            message.error('Lỗi khi tải thông tin nhóm');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroupDetail();
    }, [id]);

    const handleAddMember = async (values) => {
        try {
            await api.post(`/groups/${id}/members`, values);
            message.success('Đã thêm thành viên vào nhóm!');
            setIsModalOpen(false);
            form.resetFields();
            fetchGroupDetail();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi thêm thành viên');
        }
    };

    if (loading) return <div className="flex justify-center h-64 items-center"><Spin size="large" /></div>;
    if (!group) return <div>Không tìm thấy nhóm</div>;

    return (
        <div>
            <div className="flex items-center gap-4 mb-8 border-b pb-4 border-gray-100">
                <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/groups')} className="text-gray-500" />
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800 m-0">{group.name}</h1>
                    <p className="text-slate-500 m-0 mt-1">{group.description}</p>
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-medium text-slate-800">Thành viên ({group.members?.length || 0})</h2>
                    <Button
                        type="primary"
                        icon={<UserAddOutlined />}
                        className="bg-blue-600 rounded-lg"
                        onClick={() => setIsModalOpen(true)}
                    >
                        Thêm thành viên
                    </Button>
                </div>

                <List
                    itemLayout="horizontal"
                    dataSource={group.members}
                    renderItem={item => (
                        <List.Item className="border-b border-gray-50 hover:bg-slate-50 px-4 rounded-lg transition-all">
                            <List.Item.Meta
                                avatar={
                                    <Avatar className={item.role === 'admin' ? "bg-orange-500" : "bg-blue-500"}>
                                        {(item.user?.username || 'U').charAt(0).toUpperCase()}
                                    </Avatar>
                                }
                                title={<span className="font-medium text-slate-700">{item.user?.username}</span>}
                                description={<span className="text-slate-500 text-sm">{item.user?.email}</span>}
                            />
                            {item.role === 'admin'
                                ? <Tag color="orange" icon={<CrownOutlined />} className="rounded-md px-2 py-1 border-0 font-medium">Trưởng nhóm</Tag>
                                : <Tag color="blue" icon={<UserOutlined />} className="rounded-md px-2 py-1 border-0">Thành viên</Tag>
                            }
                        </List.Item>
                    )}
                />
            </div>

            <Modal
                title={<span className="font-medium text-lg">Thêm thành viên mới</span>}
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                footer={null}
            >
                <Form layout="vertical" form={form} onFinish={handleAddMember} className="mt-4">
                    <Form.Item
                        name="email"
                        label="Email người dùng"
                        rules={[
                            { required: true, message: 'Vui lòng nhập email!' },
                            { type: 'email', message: 'Email không hợp lệ!' }
                        ]}
                    >
                        <Input placeholder="Nhập email của người muốn mời..." size="large" className="rounded-lg" />
                    </Form.Item>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button onClick={() => setIsModalOpen(false)} className="rounded-lg">Hủy</Button>
                        <Button type="primary" htmlType="submit" className="bg-blue-600 rounded-lg">Thêm ngay</Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default GroupDetail;