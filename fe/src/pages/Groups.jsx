import React, { useState, useEffect } from 'react';
import { Button, Card, Modal, Form, Input, message, Spin, Empty } from 'antd';
import { PlusOutlined, TeamOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Groups = () => {
    const navigate = useNavigate();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    const token = localStorage.getItem('accessToken');

    const api = axios.create({
        baseURL: 'http://localhost:5000/api',
        headers: { Authorization: `Bearer ${token}` }
    });

    const fetchGroups = async () => {
        try {
            setLoading(true);
            const response = await api.get('/groups');
            setGroups(response.data);
        } catch (error) {
            message.error('Lỗi khi tải danh sách nhóm!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleCreateGroup = async (values) => {
        try {
            await api.post('/groups', values);
            message.success('Tạo không gian làm việc thành công!');
            setIsModalVisible(false);
            form.resetFields();
            fetchGroups();
        } catch (error) {
            message.error('Có lỗi xảy ra khi tạo nhóm!');
        }
    };

    return (
        <div className="p-2">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-800">Không gian làm việc</h1>
                    <p className="text-slate-500 mt-1">Quản lý các nhóm dự án và thành viên của bạn</p>
                </div>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    size="large"
                    className="bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm"
                    onClick={() => setIsModalVisible(true)}
                >
                    Tạo nhóm mới
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64"><Spin size="large" /></div>
            ) : groups.length === 0 ? (
                <Empty description="Bạn chưa tham gia không gian làm việc nào" className="mt-20" />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groups.map(group => (
                        <Card
                            key={group._id}
                            hoverable
                            className="rounded-xl border-gray-200 shadow-sm hover:shadow-md transition-all"
                            bodyStyle={{ padding: '24px' }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xl font-bold">
                                    {group.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-1 rounded-md text-sm">
                                    <TeamOutlined /> {group.members?.length || 1}
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800 mb-2 truncate">{group.name}</h3>
                            <p className="text-slate-500 text-sm mb-6 line-clamp-2 min-h-[40px]">
                                {group.description || "Chưa có mô tả cho nhóm này."}
                            </p>

                            <Button
                                type="default"
                                className="w-full rounded-lg border-gray-300 text-slate-600 hover:text-blue-600 hover:border-blue-600 flex justify-between items-center"
                                onClick={() => navigate(`/groups/${group._id}`)}
                            >
                                Vào không gian <ArrowRightOutlined />
                            </Button>
                        </Card>
                    ))}
                </div>
            )}

            {/* Modal Form Tạo Nhóm */}
            <Modal
                title={<div className="text-lg font-semibold text-slate-800">Tạo không gian mới</div>}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                destroyOnClose
            >
                <Form layout="vertical" form={form} onFinish={handleCreateGroup} className="mt-4">
                    <Form.Item
                        name="name"
                        label="Tên không gian làm việc"
                        rules={[{ required: true, message: 'Vui lòng nhập tên nhóm!' }]}
                    >
                        <Input placeholder="Ví dụ: Dự án Alpha..." size="large" className="rounded-lg" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả ngắn">
                        <Input.TextArea placeholder="Mục tiêu của không gian này là gì?" rows={3} className="rounded-lg" />
                    </Form.Item>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button onClick={() => setIsModalVisible(false)} className="rounded-lg">Hủy</Button>
                        <Button type="primary" htmlType="submit" className="bg-blue-600 rounded-lg">
                            Tạo mới
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default Groups;