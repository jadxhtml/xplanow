import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, message, Modal, Form, Input, Popconfirm, Progress, Switch, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';

const Dashboard = () => {
    //state
    const [treeData, setTreeData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [subModalConfig, setSubModalConfig] = useState({ open: false, type: '', parentId: null, parentTitle: '' });
    const [subForm] = Form.useForm();
    const [editModalConfig, setEditModalConfig] = useState({ open: false, record: null });
    const [editForm] = Form.useForm();

    const [expandedRowKeys, setExpandedRowKeys] = useState([]); //double click task


    const fetchTreeData = async () => {
        setLoading(true);
        try {
            const response = await api.get('/objectives/tree');


            const formatData = (data) => {

                if (!data || !Array.isArray(data)) {
                    console.error("Dữ liệu trả về không phải là mảng:", data);
                    return [];
                }

                return data.map(item => {
                    const formattedItem = { ...item, key: item._id };

                    if (item.children && item.children.length > 0) {
                        formattedItem.children = formatData(item.children);
                    }

                    if (formattedItem.itemType === 'task') {
                        formattedItem.progress = formattedItem.status === 'done' ? 100 : 0;
                    }
                    else if (formattedItem.itemType === 'keyResult') {
                        if (formattedItem.children && formattedItem.children.length > 0) {
                            const totalTasks = formattedItem.children.length;
                            const completedTasks = formattedItem.children.filter(child => child.status === 'done').length;

                            formattedItem.targetValue = totalTasks;
                            formattedItem.currentValue = completedTasks;
                            formattedItem.progress = Math.round((completedTasks / totalTasks) * 100);
                        }

                        else {
                            const target = formattedItem.targetValue || 1;
                            const current = formattedItem.currentValue || 0;
                            let krProgress = Math.round((current / target) * 100);
                            formattedItem.progress = krProgress > 100 ? 100 : krProgress;
                        }
                    }
                    else if (formattedItem.itemType === 'objective') {
                        if (formattedItem.children && formattedItem.children.length > 0) {
                            const krChildren = formattedItem.children.filter(child => child.itemType === 'keyResult');

                            if (krChildren.length > 0) {
                                const sumProgress = krChildren.reduce((acc, child) => acc + (child.progress || 0), 0);
                                formattedItem.progress = Math.round(sumProgress / krChildren.length);
                            } else {
                                formattedItem.progress = 0;
                            }
                        } else {
                            formattedItem.progress = 0;
                        }
                    }

                    return formattedItem;
                });
            };

            setTreeData(formatData(response.data));

        } catch (error) {
            console.error("Lỗi fetch tree:", error);
            message.error('Lỗi khi tải dữ liệu Cây mục tiêu!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTreeData();
    }, []);

    const columns = [
        {
            title: 'Tên Mục tiêu / Công việc',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <span className={record.itemType === 'objective' ? 'font-bold text-lg' : ''}>
                    {text}
                </span>
            ),
        },
        {
            title: 'Phân loại',
            dataIndex: 'itemType',
            key: 'itemType',
            width: '15%',
            render: (type) => {
                let color = type === 'objective' ? 'blue' : type === 'keyResult' ? 'green' : 'orange';
                let label = type === 'objective' ? 'Mục Tiêu' : type === 'keyResult' ? 'Kết quả (KR)' : 'Công việc';
                return <Tag color={color}>{label}</Tag>;
            }
        },
        {
            title: 'Tiến độ / Trạng thái',
            key: 'progress',
            width: '25%',
            render: (_, record) => {
                if (record.itemType === 'task') {
                    return (
                        <Space>
                            <Switch
                                checked={record.status === 'done'}
                                onChange={(checked) => handleToggleTask(record, checked)}
                                checkedChildren="Xong"
                                unCheckedChildren="Chờ"
                            />
                            <span className={record.status === 'done' ? 'text-green-500 font-medium' : 'text-gray-400'}>
                                {record.status === 'done' ? 'Hoàn thành' : 'Đang xử lý'}
                            </span>
                        </Space>
                    );
                }

                return (
                    <Progress
                        percent={record.progress}
                        size="small"
                        status={record.progress === 100 ? 'success' : 'active'}
                        strokeColor={record.itemType === 'objective' ? '#1677ff' : '#52c41a'}
                    />
                );
            }
        },
        {
            title: 'Hành động',
            key: 'action',
            width: '20%',
            render: (_, record) => (
                <Space size="middle">
                    <Button
                        type="text"
                        icon={<PlusOutlined />}
                        className="text-blue-500 hover:bg-blue-50"
                        onClick={() => handleOpenSubModal(record)}
                        disabled={record.itemType === 'task'}
                        title="Thêm phần tử con"
                    />
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        className="text-green-500 hover:bg-green-50"
                        onClick={() => handleOpenEdit(record)}
                        title="Chỉnh sửa"
                    />
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa?"
                        description="Hành động này sẽ xóa vĩnh viễn dữ liệu này!"
                        onConfirm={() => handleDelete(record)}
                        okText="Xóa luôn"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
                        placement="topRight"
                    >
                        <Button type="text" icon={<DeleteOutlined />} danger title="Xóa phần tử này" />
                    </Popconfirm>
                </Space>
            ),
        },
        {
            title: 'Hạn chót',
            dataIndex: 'deadline',
            key: 'deadline',
            width: '15%',
            render: (text, record) => {
                if (!text) return <span className="text-gray-300">-</span>;

                const deadlineDate = dayjs(text).startOf('day');
                const today = dayjs().startOf('day');

                if (record.itemType === 'task' && record.status === 'done') {
                    return <span className="text-gray-400 line-through">{deadlineDate.format('DD/MM/YYYY')}</span>;
                }

                // Tính toán
                const isOverdue = today.isAfter(deadlineDate); // Het han
                const daysDiff = deadlineDate.diff(today, 'day'); // con bao nhieu ngay
                const isNear = daysDiff >= 0 && daysDiff <= 2; // canh bao den han
                let color = 'blue';
                let alertText = '';
                if (isOverdue) {
                    color = 'red';
                    alertText = ' (Trễ hạn)';
                } else if (isNear) {
                    color = 'orange';
                    alertText = ' (Sắp đến)';
                }

                return (
                    <Tag color={color} className="font-medium">
                        {deadlineDate.format('DD/MM/YYYY')}{alertText}
                    </Tag>
                );
            }
        },
    ];


    const showModal = () => {
        form.resetFields();
        setIsModalOpen(true);
    };

    const handleCreateSubmit = async (values) => {
        try {
            if (values.deadline) values.deadline = values.deadline.toISOString();
            await api.post('/objectives', values);
            message.success('Đã tạo Mục tiêu thành công!');
            setIsModalOpen(false);
            fetchTreeData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi tạo mục tiêu!');
        }
    };

    const handleOpenSubModal = (record) => {
        subForm.resetFields();
        let type = '';
        if (record.itemType === 'objective') type = 'keyResult';
        else if (record.itemType === 'keyResult') type = 'task';

        setSubModalConfig({ open: true, type, parentId: record._id, parentTitle: record.title });
    };

    const handleSubSubmit = async (values) => {
        try {
            if (values.deadline) values.deadline = values.deadline.toISOString();
            if (subModalConfig.type === 'keyResult') {
                await api.post('/key-results', { ...values, objective: subModalConfig.parentId });
            } else if (subModalConfig.type === 'task') {
                await api.post('/tasks', { ...values, keyResult: subModalConfig.parentId });
            }
            message.success('Đã thêm thành công!');
            setSubModalConfig({ ...subModalConfig, open: false });
            fetchTreeData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra!');
        }
    };

    const handleOpenEdit = (record) => {
        setEditModalConfig({ open: true, record });
        editForm.setFieldsValue({
            title: record.title,
            description: record.description,
            targetValue: record.targetValue,
            currentValue: record.currentValue || 0,
            unit: record.unit,
            deadline: record.deadline ? dayjs(record.deadline) : null,
        });
    };

    const handleEditSubmit = async (values) => {
        try {
            if (values.deadline) values.deadline = values.deadline.toISOString();
            const { record } = editModalConfig;
            let endpoint = '';
            if (record.itemType === 'objective') endpoint = `/objectives/${record._id}`;
            else if (record.itemType === 'keyResult') endpoint = `/key-results/${record._id}`;
            else if (record.itemType === 'task') endpoint = `/tasks/${record._id}`;

            await api.put(endpoint, values);
            message.success('Đã cập nhật thành công!');
            setEditModalConfig({ open: false, record: null });
            fetchTreeData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi cập nhật!');
        }
    };

    const handleToggleTask = async (record, checked) => {
        try {
            const newStatus = checked ? 'done' : 'todo';
            await api.put(`/tasks/${record._id}`, { status: newStatus });
            message.success(checked ? 'Đã hoàn thành Task!' : 'Đã đưa Task về trạng thái chờ.');
            fetchTreeData();
        } catch (error) {
            message.error('Lỗi khi cập nhật trạng thái Task!');
        }
    };

    const handleDelete = async (record) => {
        try {
            let endpoint = '';
            if (record.itemType === 'objective') endpoint = `/objectives/${record._id}`;
            else if (record.itemType === 'keyResult') endpoint = `/key-results/${record._id}`;
            else if (record.itemType === 'task') endpoint = `/tasks/${record._id}`;

            await api.delete(endpoint);
            message.success('Đã xóa thành công khỏi hệ thống!');
            fetchTreeData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi xóa!');
        }
    };
    return (
        <div className="bg-white rounded-xl shadow-sm p-6 h-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-gray-800">Mục Tiêu & Công Việc</h2>
                    <p className="text-gray-500 text-sm">Quản lý và theo dõi tiến độ công việc của bạn</p>
                </div>
                <Button type="primary" icon={<PlusOutlined />} size="large" onClick={showModal}>
                    Tạo Mục tiêu mới
                </Button>
            </div>

            <Table
                columns={columns}
                dataSource={treeData}
                loading={loading}
                pagination={false}
                rowClassName={(record) => record.itemType === 'objective' ? 'bg-blue-50/50 cursor-pointer hover:bg-blue-100/50' : 'cursor-pointer'}
                className="border border-gray-100 rounded-lg overflow-hidden"
                expandable={{
                    expandedRowKeys,
                    onExpandedRowsChange: setExpandedRowKeys,
                }}
                onRow={(record) => ({
                    onDoubleClick: () => {
                        if (!record.children || record.children.length === 0) return;
                        const isExpanded = expandedRowKeys.includes(record.key);
                        if (isExpanded) {
                            setExpandedRowKeys(expandedRowKeys.filter(key => key !== record.key));
                        } else {
                            setExpandedRowKeys([...expandedRowKeys, record.key]);
                        }
                    }
                })}
            />
            <Modal
                title="Tạo Mục Tiêu Mới (Objective)"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                okText="Tạo mới"
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" onFinish={handleCreateSubmit}>
                    <Form.Item name="title" label="Tên Mục Tiêu" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
                        <Input placeholder="Ví dụ: Hoàn thành Đồ án Tốt nghiệp điểm A" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả chi tiết">
                        <Input.TextArea rows={3} placeholder="Mô tả ngắn gọn về mục tiêu này..." />
                    </Form.Item>
                    <Form.Item name="deadline" label="Hạn chót (Tùy chọn)">
                        <DatePicker format="DD/MM/YYYY" className="w-full" placeholder="Chọn ngày hết hạn..." />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={subModalConfig.type === 'keyResult' ? `Thêm Kết Quả (KR) cho: ${subModalConfig.parentTitle}` : `Thêm Công Việc cho: ${subModalConfig.parentTitle}`}
                open={subModalConfig.open}
                onCancel={() => setSubModalConfig({ ...subModalConfig, open: false })}
                onOk={() => subForm.submit()}
                okText="Lưu lại"
                cancelText="Hủy"
            >
                <Form form={subForm} layout="vertical" onFinish={handleSubSubmit}>
                    <Form.Item name="title" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên!' }]}>
                        <Input placeholder="Nhập nội dung..." />
                    </Form.Item>
                    <Form.Item name="deadline" label="Hạn chót (Tùy chọn)">
                        <DatePicker format="DD/MM/YYYY" className="w-full" placeholder="Chọn ngày..." />
                    </Form.Item>
                    {subModalConfig.type === 'keyResult' && (
                        <Space className="w-full">
                            <Form.Item name="targetValue" label="Chỉ tiêu (Ví dụ: 10)" rules={[{ required: true }]} className="mb-0">
                                <Input type="number" placeholder="Ví dụ: 10" />
                            </Form.Item>
                            <Form.Item name="unit" label="Đơn vị tính" className="mb-0">
                                <Input placeholder="Ví dụ: Bài tập, API, Trang..." />
                            </Form.Item>
                        </Space>
                    )}
                </Form>
            </Modal>

            <Modal
                title={`Chỉnh sửa ${editModalConfig.record?.itemType}`}
                open={editModalConfig.open}
                onCancel={() => setEditModalConfig({ open: false, record: null })}
                onOk={() => editForm.submit()}
                okText="Cập nhật"
                cancelText="Hủy"
            >
                <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
                    <Form.Item name="title" label="Tên mới" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>

                    <Form.Item name="deadline" label="Hạn chót">
                        <DatePicker format="DD/MM/YYYY" className="w-full" placeholder="Cập nhật lại ngày..." />
                    </Form.Item>

                    {editModalConfig.record?.itemType === 'objective' && (
                        <Form.Item name="description" label="Mô tả">
                            <Input.TextArea rows={3} />
                        </Form.Item>
                    )}

                    {editModalConfig.record?.itemType === 'keyResult' && (
                        <Space className="w-full" size="middle">
                            <Form.Item name="currentValue" label="Đạt được">
                                <Input type="number" />
                            </Form.Item>
                            <Form.Item name="targetValue" label="Chỉ tiêu (Target)">
                                <Input type="number" />
                            </Form.Item>
                            <Form.Item name="unit" label="Đơn vị tính">
                                <Input disabled />
                            </Form.Item>
                        </Space>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default Dashboard;