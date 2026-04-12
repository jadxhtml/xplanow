import React, { useEffect, useState } from 'react';
import { message, Modal, Form, Input, Popconfirm, DatePicker, Checkbox, Tooltip, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';
import socket from '../utils/socket';

const ITEM_TYPE_CONFIG = {
    objective: { label: 'Mục tiêu', bg: '#dbeafe', color: '#1e40af' },
    keyResult: { label: 'Kết quả (KR)', bg: '#ede9fe', color: '#4c1d95' },
    task: { label: 'Công việc', bg: '#ffedd5', color: '#9a3412' },
};

const Dashboard = ({ groupId, members }) => {
    const [treeData, setTreeData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedKeys, setExpandedKeys] = useState([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [subConfig, setSubConfig] = useState({ open: false, type: '', parentId: null, parentTitle: '' });
    const [editConfig, setEditConfig] = useState({ open: false, record: null });
    const [createForm] = Form.useForm();
    const [subForm] = Form.useForm();
    const [editForm] = Form.useForm();

    const calcProgress = (item) => {
        if (item.itemType === 'task') return item.status === 'done' ? 100 : 0;
        if (item.itemType === 'keyResult') {
            if (item.children?.length > 0) {
                const done = item.children.filter(c => c.status === 'done').length;
                return Math.round((done / item.children.length) * 100);
            }
            const target = item.targetValue || 1;
            return Math.min(100, Math.round(((item.currentValue || 0) / target) * 100));
        }
        if (item.itemType === 'objective') {
            const krs = (item.children || []).filter(c => c.itemType === 'keyResult');
            if (krs.length === 0) return 0;
            return Math.round(krs.reduce((s, c) => s + (c.progress || 0), 0) / krs.length);
        }
        return 0;
    };

    const formatData = (data) => {
        if (!Array.isArray(data)) return [];
        return data.map(item => {
            const out = { ...item, key: item._id };
            if (out.children?.length > 0) out.children = formatData(out.children);
            out.progress = calcProgress(out);
            return out;
        });
    };

    const fetchTreeData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/objectives/tree?groupId=${groupId}`);
            setTreeData(formatData(res.data));
        } catch {
            message.error('Lỗi khi tải dữ liệu OKR');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!groupId) return;
        fetchTreeData();
        socket.on('new_activity', fetchTreeData);
        return () => socket.off('new_activity', fetchTreeData);
    }, [groupId]);

    const toggleExpand = (key) =>
        setExpandedKeys(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

    const handleCreateSubmit = async (values) => {
        try {
            if (values.deadline) values.deadline = values.deadline.toISOString();
            // Nếu là objective, mảng phụ trách là assignees
            const payload = { ...values, group: groupId };
            if (values.assignee) payload.assignees = [values.assignee];

            await api.post('/objectives', payload);
            message.success('Đã tạo mục tiêu thành công');
            setIsCreateOpen(false);
            createForm.resetFields();
            fetchTreeData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi tạo mục tiêu');
        }
    };

    const handleOpenSubModal = (record) => {
        subForm.resetFields();
        const type = record.itemType === 'objective' ? 'keyResult' : 'task';
        setSubConfig({ open: true, type, parentId: record._id, parentTitle: record.title });
    };

    const handleSubSubmit = async (values) => {
        try {
            if (values.deadline) values.deadline = values.deadline.toISOString();
            const endpoint = subConfig.type === 'keyResult' ? '/key-results' : '/tasks';
            const payload = subConfig.type === 'keyResult'
                ? { ...values, objective: subConfig.parentId, groupId: groupId }
                : { ...values, keyResult: subConfig.parentId, groupId: groupId };
            await api.post(endpoint, payload);
            message.success('Đã thêm thành công');
            setSubConfig(p => ({ ...p, open: false }));
            fetchTreeData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleOpenEdit = (record) => {
        setEditConfig({ open: true, record });

        // 👉 Đọc đúng trường assignee (cho Task/KR) hoặc assignees (cho Objective)
        const currentAssignee = record.assignee?._id || record.assignee || record.assignees?.[0]?._id || record.assignees?.[0];

        editForm.setFieldsValue({
            title: record.title,
            description: record.description,
            targetValue: record.targetValue,
            currentValue: record.currentValue || 0,
            unit: record.unit,
            deadline: record.deadline ? dayjs(record.deadline) : null,
            assignee: currentAssignee // Đẩy vào form sửa
        });
    };

    const handleEditSubmit = async (values) => {
        try {
            if (values.deadline) values.deadline = values.deadline.toISOString();
            const { record } = editConfig;
            const ep = record.itemType === 'objective' ? `/objectives/${record._id}`
                : record.itemType === 'keyResult' ? `/key-results/${record._id}`
                    : `/tasks/${record._id}`;

            // Xử lý riêng cho objective vì nó dùng mảng assignees
            const payload = { ...values, groupId: groupId };
            if (record.itemType === 'objective' && values.assignee) {
                payload.assignees = [values.assignee];
            }

            await api.put(ep, payload);
            message.success('Đã cập nhật thành công');
            setEditConfig({ open: false, record: null });
            fetchTreeData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi cập nhật');
        }
    };

    const handleToggleTask = async (record, checked) => {
        try {
            await api.put(`/tasks/${record._id}`, { status: checked ? 'done' : 'todo', groupId });
            fetchTreeData();
        } catch {
            message.error('Lỗi khi cập nhật trạng thái');
        }
    };

    const handleDelete = async (record) => {
        try {
            const ep = record.itemType === 'objective' ? `/objectives/${record._id}`
                : record.itemType === 'keyResult' ? `/key-results/${record._id}`
                    : `/tasks/${record._id}`;
            await api.delete(`${ep}?groupId=${groupId}`);
            message.success('Đã xóa thành công');
            fetchTreeData();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi xóa');
        }
    };

    const DeadlineCell = ({ text, record }) => {
        if (!text) return <span style={{ color: '#d1d5db' }}>—</span>;
        const deadline = dayjs(text).startOf('day');
        const today = dayjs().startOf('day');
        if (record.itemType === 'task' && record.status === 'done')
            return <span style={{ color: '#9ca3af', textDecoration: 'line-through', fontSize: 11 }}>{deadline.format('DD/MM/YYYY')}</span>;
        const diff = deadline.diff(today, 'day');
        const isOverdue = today.isAfter(deadline);
        const isNear = diff >= 0 && diff <= 2;
        const cfg = isOverdue ? { bg: '#fee2e2', color: '#991b1b', suffix: ' (Trễ)' }
            : isNear ? { bg: '#ffedd5', color: '#9a3412', suffix: ' (Sắp đến)' }
                : { bg: '#dbeafe', color: '#1e40af', suffix: '' };
        return (
            <span style={{ display: 'inline-block', fontSize: 11, padding: '2px 8px', borderRadius: 4, background: cfg.bg, color: cfg.color }}>
                {deadline.format('DD/MM/YYYY')}{cfg.suffix}
            </span>
        );
    };

    const ProgressCell = ({ record }) => {
        if (record.itemType === 'task') {
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Checkbox checked={record.status === 'done'} onChange={e => handleToggleTask(record, e.target.checked)} />
                    <span style={{ fontSize: 12, color: record.status === 'done' ? '#10b981' : '#6b7280' }}>
                        {record.status === 'done' ? 'Đã hoàn thành' : 'Đang thực hiện'}
                    </span>
                </div>
            );
        }
        const fillColor = record.itemType === 'objective' ? '#3b82f6' : '#8b5cf6';
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 4, background: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${record.progress}%`, height: '100%', background: fillColor, borderRadius: 2 }} />
                </div>
                <span style={{ fontSize: 11, color: '#6b7280', minWidth: 28, textAlign: 'right' }}>{record.progress}%</span>
            </div>
        );
    };

    const ActionCell = ({ record }) => (
        <div style={{ display: 'flex', gap: 2 }}>
            {record.itemType !== 'task' && (
                <Tooltip title="Thêm việc con">
                    <button onClick={() => handleOpenSubModal(record)} style={btnStyle}>
                        <PlusOutlined style={{ fontSize: 12 }} />
                    </button>
                </Tooltip>
            )}
            <Tooltip title="Chỉnh sửa">
                <button onClick={() => handleOpenEdit(record)} style={btnStyle}>
                    <EditOutlined style={{ fontSize: 12 }} />
                </button>
            </Tooltip>
            <Popconfirm title="Xóa vĩnh viễn?" onConfirm={() => handleDelete(record)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                <Tooltip title="Xóa">
                    <button style={{ ...btnStyle, color: '#f87171' }}>
                        <DeleteOutlined style={{ fontSize: 12 }} />
                    </button>
                </Tooltip>
            </Popconfirm>
        </div>
    );

    const btnStyle = {
        width: 26, height: 26, borderRadius: 5, border: 'none',
        background: 'transparent', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', color: '#9ca3af',
    };

    const flattenTree = (items, depth = 0) => {
        const rows = [];
        for (const item of items) {
            const hasChildren = item.children?.length > 0;
            const isExpanded = expandedKeys.includes(item.key);
            rows.push({ ...item, depth, hasChildren, isExpanded });
            if (hasChildren && isExpanded) {
                rows.push(...flattenTree(item.children, depth + 1));
            }
        }
        return rows;
    };

    const flatRows = flattenTree(treeData);

    const rowBg = { objective: '#f0f5ff', keyResult: '#faf9ff', task: '#fff' };
    const titleWeight = { objective: 500, keyResult: 400, task: 400 };

    return (
        <div style={{ background: '#fff', border: '0.5px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#111827', marginBottom: 2 }}>Không gian làm việc chung</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>Quản lý mục tiêu (OKR) và tiến độ công việc theo thời gian thực</div>
                </div>
                <button
                    onClick={() => { createForm.resetFields(); setIsCreateOpen(true); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 13px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                >
                    <PlusOutlined style={{ fontSize: 11 }} /> Tạo mục tiêu
                </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                    <colgroup>
                        <col style={{ width: '36%' }} />
                        <col style={{ width: '12%' }} />
                        <col style={{ width: '10%' }} />
                        <col style={{ width: '20%' }} />
                        <col style={{ width: '13%' }} />
                        <col style={{ width: '9%' }} />
                    </colgroup>
                    <thead>
                        <tr>
                            {['Tên mục tiêu / công việc', 'Phân loại', 'Phụ trách', 'Tiến độ / Trạng thái', 'Hạn chót', 'Thao tác'].map(h => (
                                <th key={h} style={{ padding: '8px 14px', fontSize: 11, fontWeight: 500, color: '#6b7280', textAlign: 'left', borderBottom: '0.5px solid #e5e7eb', background: '#f9fafb' }}>
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, fontSize: 13, color: '#9ca3af' }}>Đang tải...</td></tr>
                        ) : flatRows.length === 0 ? (
                            <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, fontSize: 13, color: '#9ca3af' }}>Chưa có mục tiêu nào. Hãy tạo mục tiêu đầu tiên.</td></tr>
                        ) : flatRows.map(row => {
                            const typeCfg = ITEM_TYPE_CONFIG[row.itemType] || {};

                            // 👉 TÌM ĐÚNG NGƯỜI PHỤ TRÁCH (ASSIGNEE)
                            let assignedPerson = null;
                            const targetId = row.assignee || (row.assignees?.length > 0 ? row.assignees[0] : null);

                            if (targetId && typeof targetId === 'object' && targetId.username) {
                                assignedPerson = targetId;
                            } else if (targetId) {
                                const match = members?.find(m => m.user._id === targetId || m.user.id === targetId);
                                if (match) assignedPerson = match.user;
                            }

                            const assigneeName = assignedPerson?.username || 'Chưa phân công';
                            const avatarUrl = assignedPerson?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${assigneeName === 'Chưa phân công' ? '?' : assigneeName}`;

                            return (
                                <tr
                                    key={row.key}
                                    style={{ background: rowBg[row.itemType] || '#fff', cursor: row.hasChildren ? 'pointer' : 'default' }}
                                    onDoubleClick={() => { if (row.hasChildren) toggleExpand(row.key); }}
                                >
                                    <td style={{ padding: `9px 14px 9px ${14 + row.depth * 20}px`, borderBottom: '0.5px solid #f3f4f6', verticalAlign: 'middle' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                            {row.hasChildren ? (
                                                <span
                                                    onClick={() => toggleExpand(row.key)}
                                                    style={{ width: 14, fontSize: 10, color: '#9ca3af', cursor: 'pointer', flexShrink: 0, userSelect: 'none' }}
                                                >
                                                    {row.isExpanded ? '▾' : '▸'}
                                                </span>
                                            ) : (
                                                <span style={{ width: 14, flexShrink: 0 }} />
                                            )}
                                            <span style={{
                                                fontSize: row.itemType === 'task' ? 12 : 13,
                                                fontWeight: titleWeight[row.itemType],
                                                color: row.status === 'done' ? '#9ca3af' : row.itemType === 'objective' ? '#111827' : row.itemType === 'keyResult' ? '#374151' : '#6b7280',
                                                textDecoration: row.status === 'done' ? 'line-through' : 'none',
                                            }}>
                                                {row.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '9px 14px', borderBottom: '0.5px solid #f3f4f6', verticalAlign: 'middle' }}>
                                        <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: typeCfg.bg, color: typeCfg.color }}>
                                            {typeCfg.label}
                                        </span>
                                    </td>
                                    <td style={{ padding: '9px 14px', borderBottom: '0.5px solid #f3f4f6', verticalAlign: 'middle' }}>
                                        {/* Avatar của người được giao (Assignee) */}
                                        <Tooltip title={assigneeName}>
                                            <div style={{
                                                width: 26, height: 26, borderRadius: '50%', border: '1px dashed #d9d9d9',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: assignedPerson ? 'transparent' : '#fafafa', cursor: 'pointer'
                                            }}>
                                                {assignedPerson ? (
                                                    <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                                ) : (
                                                    <UserOutlined style={{ fontSize: 12, color: '#bfbfbf' }} />
                                                )}
                                            </div>
                                        </Tooltip>
                                    </td>
                                    <td style={{ padding: '9px 14px', borderBottom: '0.5px solid #f3f4f6', verticalAlign: 'middle' }}>
                                        <ProgressCell record={row} />
                                    </td>
                                    <td style={{ padding: '9px 14px', borderBottom: '0.5px solid #f3f4f6', verticalAlign: 'middle' }}>
                                        <DeadlineCell text={row.deadline} record={row} />
                                    </td>
                                    <td style={{ padding: '9px 14px', borderBottom: '0.5px solid #f3f4f6', verticalAlign: 'middle' }}>
                                        <ActionCell record={row} />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* CÁC MODAL */}
            <Modal title="Tạo mục tiêu mới" open={isCreateOpen} onCancel={() => setIsCreateOpen(false)} onOk={() => createForm.submit()} okText="Tạo mới" cancelText="Hủy">
                <Form form={createForm} layout="vertical" onFinish={handleCreateSubmit}>
                    <Form.Item name="title" label="Tên mục tiêu" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                        <Input placeholder="Ví dụ: Hoàn thành đồ án điểm A" />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={3} placeholder="Mô tả ngắn gọn về mục tiêu này..." />
                    </Form.Item>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <Form.Item name="deadline" label="Hạn chót (tùy chọn)" style={{ flex: 1 }}>
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày..." />
                        </Form.Item>
                        <Form.Item name="assignee" label="Người phụ trách" style={{ flex: 1 }}>
                            <Select placeholder="Giao cho ai?" allowClear>
                                {members?.map(m => (
                                    <Select.Option key={m.user._id} value={m.user._id}>{m.user.username}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={subConfig.type === 'keyResult' ? `Thêm kết quả cho: ${subConfig.parentTitle}` : `Thêm công việc cho: ${subConfig.parentTitle}`}
                open={subConfig.open}
                onCancel={() => setSubConfig(p => ({ ...p, open: false }))}
                onOk={() => subForm.submit()}
                okText="Lưu lại" cancelText="Hủy"
            >
                <Form form={subForm} layout="vertical" onFinish={handleSubSubmit}>
                    <Form.Item name="title" label="Tên" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
                        <Input placeholder="Nhập nội dung..." />
                    </Form.Item>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <Form.Item name="deadline" label="Hạn chót" style={{ flex: 1 }}>
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Chọn ngày..." />
                        </Form.Item>
                        <Form.Item name="assignee" label="Người phụ trách" style={{ flex: 1 }}>
                            <Select placeholder="Giao cho ai?" allowClear>
                                {members?.map(m => (
                                    <Select.Option key={m.user._id} value={m.user._id}>{m.user.username}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </div>
                    {subConfig.type === 'keyResult' && (
                        <div style={{ display: 'flex', gap: 12 }}>
                            <Form.Item name="targetValue" label="Chỉ tiêu" rules={[{ required: true }]} style={{ flex: 1 }}>
                                <Input type="number" placeholder="Ví dụ: 10" />
                            </Form.Item>
                            <Form.Item name="unit" label="Đơn vị" style={{ flex: 1 }}>
                                <Input placeholder="Ví dụ: bài, API, trang..." />
                            </Form.Item>
                        </div>
                    )}
                </Form>
            </Modal>

            <Modal
                title={`Chỉnh sửa ${ITEM_TYPE_CONFIG[editConfig.record?.itemType]?.label || ''}`}
                open={editConfig.open}
                onCancel={() => setEditConfig({ open: false, record: null })}
                onOk={() => editForm.submit()}
                okText="Cập nhật" cancelText="Hủy"
            >
                <Form form={editForm} layout="vertical" onFinish={handleEditSubmit}>
                    <Form.Item name="title" label="Tên mới" rules={[{ required: true }]}>
                        <Input />
                    </Form.Item>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <Form.Item name="deadline" label="Hạn chót" style={{ flex: 1 }}>
                            <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} placeholder="Cập nhật lại ngày..." />
                        </Form.Item>
                        <Form.Item name="assignee" label="Người phụ trách" style={{ flex: 1 }}>
                            <Select placeholder="Đổi người phụ trách" allowClear>
                                {members?.map(m => (
                                    <Select.Option key={m.user._id} value={m.user._id}>{m.user.username}</Select.Option>
                                ))}
                            </Select>
                        </Form.Item>
                    </div>

                    {editConfig.record?.itemType === 'objective' && (
                        <Form.Item name="description" label="Mô tả">
                            <Input.TextArea rows={3} />
                        </Form.Item>
                    )}
                    {editConfig.record?.itemType === 'keyResult' && (
                        <div style={{ display: 'flex', gap: 12 }}>
                            <Form.Item name="currentValue" label="Đạt được" style={{ flex: 1 }}>
                                <Input type="number" />
                            </Form.Item>
                            <Form.Item name="targetValue" label="Chỉ tiêu" style={{ flex: 1 }}>
                                <Input type="number" />
                            </Form.Item>
                            <Form.Item name="unit" label="Đơn vị" style={{ flex: 1 }}>
                                <Input disabled />
                            </Form.Item>
                        </div>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default Dashboard;