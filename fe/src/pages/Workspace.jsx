import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, message, Avatar, List, Popconfirm, Tag, Spin, Dropdown, Badge } from 'antd';
import { PlusOutlined, TeamOutlined, DeleteOutlined, ProjectOutlined, MessageOutlined, BarChartOutlined, UserAddOutlined, LogoutOutlined, MoreOutlined, AppstoreOutlined } from '@ant-design/icons';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import ReportDashboard from '../components/ReportDashboard';
import ChatBox from '../components/ChatBox';
import KanbanBoard from '../components/KanbanBoard';
import Activities from './Activities';
import socket from '../utils/socket';


const Workspace = () => {
    const [groups, setGroups] = useState([]);
    const [activeGroup, setActiveGroup] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
    const [form] = Form.useForm();
    const [memberForm] = Form.useForm();
    const [unreadCounts, setUnreadCounts] = useState({});
    const [activeTab, setActiveTab] = useState('1');

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const myId = currentUser._id || currentUser.id;
    const navigate = useNavigate();

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const res = await api.get('/groups/user');
            setGroups(res.data);
            if (res.data.length > 0 && !activeGroup) {
                fetchGroupDetails(res.data[0]._id);
            }
        } catch {
            message.error('Lỗi khi tải danh sách dự án');
        } finally {
            setLoading(false);
        }
    };

    const fetchGroupDetails = async (groupId) => {
        try {
            const res = await api.get(`/groups/${groupId}`);
            setActiveGroup(res.data);
        } catch {
            message.error('Lỗi khi tải thông tin nhóm');
        }
    };

    useEffect(() => { fetchGroups(); }, []);

    useEffect(() => {
        if (groups.length === 0) return;
        groups.forEach(group => socket.emit('join_room', group._id));
        const handleGlobalMessage = (newMessage) => {
            const msgGroupId = newMessage.group?._id || newMessage.groupId || newMessage.group;
            if (activeGroup && activeGroup._id === msgGroupId && activeTab === '2') return;
            setUnreadCounts(prev => ({ ...prev, [msgGroupId]: (prev[msgGroupId] || 0) + 1 }));
        };
        socket.on('receive_message', handleGlobalMessage);
        return () => socket.off('receive_message', handleGlobalMessage);
    }, [groups, activeGroup, activeTab]);

    const handleCreateProject = async (values) => {
        try {
            await api.post('/groups', { name: values.title, description: values.description });
            message.success('Đã tạo không gian làm việc mới');
            setIsCreateModalOpen(false);
            form.resetFields();
            fetchGroups();
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi tạo dự án');
        }
    };

    const handleAddMember = async (values) => {
        try {
            await api.post(`/groups/${activeGroup._id}/members`, { email: values.email });
            message.success('Đã thêm thành viên thành công');
            setIsAddMemberModalOpen(false);
            memberForm.resetFields();
            fetchGroupDetails(activeGroup._id);
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi thêm thành viên');
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            await api.delete(`/groups/${activeGroup._id}/members/${memberId}`);
            message.success('Đã xóa thành viên');
            fetchGroupDetails(activeGroup._id);
        } catch (error) {
            message.error(error.response?.data?.message || 'Lỗi khi xóa thành viên');
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const userMenu = {
        items: [{ key: 'logout', icon: <LogoutOutlined />, danger: true, label: 'Đăng xuất', onClick: handleLogout }]
    };

    const amIAdmin = activeGroup?.members?.some(m => m.user._id === myId && m.role === 'admin');

    const tabs = [
        { key: '1', icon: <ProjectOutlined />, label: 'Công việc', content: <Dashboard groupId={activeGroup?._id} members={activeGroup?.members} /> },

        { key: '1.5', icon: <AppstoreOutlined />, label: 'Bảng Kanban', content: <KanbanBoard groupId={activeGroup?._id} members={activeGroup?.members} /> },
        {
            key: '2',
            icon: <MessageOutlined />,
            label: 'Trò chuyện',
            badge: unreadCounts[activeGroup?._id] || 0,
            content: <ChatBox groupId={activeGroup?._id} />
        },
        { key: '3', icon: <TeamOutlined />, label: 'Thành viên', content: null },
        { key: '4', icon: <BarChartOutlined />, label: 'Hoạt động', content: <Activities groupId={activeGroup?._id} /> },
        {
            key: '5',
            label: <span><ProjectOutlined /> Báo cáo</span>, // Thêm icon tùy thích
            children: <ReportDashboard groupId={activeGroup?._id} />
        },
    ];

    const MemberPanel = () => (
        <div style={{ background: '#fff', borderRadius: 10, border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '0.5px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#111827' }}>
                    Thành viên ({activeGroup.members?.length || 0})
                </span>
                {amIAdmin && (
                    <button
                        onClick={() => setIsAddMemberModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                    >
                        <UserAddOutlined style={{ fontSize: 12 }} /> Thêm thành viên
                    </button>
                )}
            </div>
            {(activeGroup.members || []).map(item => {
                const isAdmin = item.role === 'admin';
                const isMe = item.user._id === myId;
                return (
                    <div key={item.user._id} style={{ display: 'flex', alignItems: 'center', padding: '11px 20px', borderBottom: '0.5px solid #f9fafb', gap: 12 }}>
                        <Avatar
                            src={item.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.user.username}`}
                            style={{ width: 34, height: 34, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#111827' }}>
                                {item.user.username} {isMe && <span style={{ color: '#6b7280', fontWeight: 400 }}>(Bạn)</span>}
                                <span style={{
                                    fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 500,
                                    background: isAdmin ? '#fef3c7' : '#e0f2fe',
                                    color: isAdmin ? '#92400e' : '#0369a1'
                                }}>
                                    {isAdmin ? 'Trưởng nhóm' : 'Thành viên'}
                                </span>
                            </div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{item.user.email}</div>
                        </div>
                        {amIAdmin && !isAdmin && (
                            <Popconfirm title="Xóa thành viên này khỏi nhóm?" onConfirm={() => handleRemoveMember(item.user._id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                                <button style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: 'transparent', border: '0.5px solid #e5e7eb', borderRadius: 5, color: '#6b7280', fontSize: 11, cursor: 'pointer' }}>
                                    <DeleteOutlined style={{ fontSize: 11 }} /> Xóa
                                </button>
                            </Popconfirm>
                        )}
                    </div>
                );
            })}
        </div>
    );

    return (
        <div style={{ display: 'flex', height: '100vh', background: '#f7f9fc', overflow: 'hidden' }}>

            {/* SIDEBAR */}
            <div style={{ width: 220, background: '#1a2236', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
                <div style={{ padding: '16px 14px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, background: '#3b82f6', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 500, color: '#fff' }}>T</div>
                    <span style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>PlanEr</span>
                </div>

                <div style={{ padding: '10px 12px' }}>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, width: '100%', padding: '7px 0', background: 'rgba(59,130,246,0.15)', border: '0.5px solid rgba(59,130,246,0.35)', borderRadius: 6, color: '#93c5fd', fontSize: 13, cursor: 'pointer' }}
                    >
                        <PlusOutlined style={{ fontSize: 11 }} /> Tạo dự án mới
                    </button>
                </div>

                <div style={{ fontSize: 10, fontWeight: 500, color: 'rgba(148,163,184,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '6px 14px 4px' }}>
                    Không gian làm việc
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
                    {loading ? <div style={{ textAlign: 'center', marginTop: 16 }}><Spin size="small" /></div> : (
                        groups.map(group => (
                            <div
                                key={group._id}
                                onClick={() => {
                                    fetchGroupDetails(group._id);
                                    if (activeTab === '2') setUnreadCounts(prev => ({ ...prev, [group._id]: 0 }));
                                }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '7px 10px', borderRadius: 6, cursor: 'pointer', marginBottom: 1,
                                    background: activeGroup?._id === group._id ? 'rgba(59,130,246,0.2)' : 'transparent',
                                    transition: 'background .12s'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden' }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: activeGroup?._id === group._id ? '#60a5fa' : 'rgba(148,163,184,0.5)', flexShrink: 0 }} />
                                    <span style={{ fontSize: 13, color: activeGroup?._id === group._id ? '#e2e8f0' : 'rgba(203,213,225,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {group.name.replace('Không gian: ', '').replace('Dự án: ', '')}
                                    </span>
                                </div>
                                {unreadCounts[group._id] > 0 && (
                                    <span style={{ background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 9, flexShrink: 0 }}>
                                        {unreadCounts[group._id]}
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                    {!loading && groups.length === 0 && (
                        <div style={{ fontSize: 12, color: 'rgba(148,163,184,0.6)', padding: '8px 10px' }}>Chưa có dự án nào.</div>
                    )}
                </div>

                <Dropdown menu={userMenu} placement="topLeft" trigger={['click']}>
                    <div style={{ padding: '10px 12px', borderTop: '0.5px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                        <Avatar src={currentUser.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${currentUser.username}`} style={{ width: 30, height: 30, flexShrink: 0 }} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{currentUser.username}</div>
                            <div style={{ fontSize: 11, color: '#34d399', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ width: 5, height: 5, background: '#34d399', borderRadius: '50%', display: 'inline-block' }} /> Trực tuyến
                            </div>
                        </div>
                    </div>
                </Dropdown>
            </div>

            {/* MAIN */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {activeGroup ? (
                    <>
                        {/* Header + Tabs */}
                        <div style={{ background: '#fff', borderBottom: '0.5px solid #e5e7eb', padding: '18px 24px 0', flexShrink: 0 }}>
                            <div style={{ fontSize: 18, fontWeight: 500, color: '#111827', marginBottom: 3 }}>{activeGroup.name}</div>
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>{activeGroup.description || 'Không gian làm việc chung của nhóm'}</div>
                            <div style={{ display: 'flex', gap: 0 }}>
                                {tabs.map(tab => (
                                    <div
                                        key={tab.key}
                                        onClick={() => {
                                            setActiveTab(tab.key);
                                            if (tab.key === '2' && activeGroup) setUnreadCounts(prev => ({ ...prev, [activeGroup._id]: 0 }));
                                        }}
                                        style={{
                                            padding: '8px 16px 10px', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                                            color: activeTab === tab.key ? '#3b82f6' : '#6b7280',
                                            borderBottom: activeTab === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
                                            fontWeight: activeTab === tab.key ? 500 : 400,
                                            transition: 'color .12s', whiteSpace: 'nowrap'
                                        }}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                        {tab.badge > 0 && (
                                            <span style={{ background: '#ef4444', color: '#fff', fontSize: 9, padding: '1px 5px', borderRadius: 8 }}>{tab.badge}</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                            {activeTab === '1' && <Dashboard groupId={activeGroup?._id} members={activeGroup?.members} />}
                            {activeTab === '1.5' && <KanbanBoard groupId={activeGroup._id} members={activeGroup.members} />}
                            {activeTab === '2' && <ChatBox groupId={activeGroup._id} />}
                            {activeTab === '3' && <MemberPanel />}
                            {activeTab === '4' && <Activities groupId={activeGroup._id} />}
                            {activeTab === '5' && <ReportDashboard groupId={activeGroup._id} />}
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>
                        <ProjectOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
                        <div style={{ fontSize: 15, fontWeight: 500, color: '#6b7280', marginBottom: 6 }}>Chọn một không gian làm việc</div>
                        <div style={{ fontSize: 13 }}>Hoặc tạo dự án mới từ thanh menu bên trái</div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <Modal title="Tạo không gian làm việc mới" open={isCreateModalOpen} onCancel={() => setIsCreateModalOpen(false)} onOk={() => form.submit()} okText="Khởi tạo" cancelText="Hủy">
                <Form form={form} layout="vertical" onFinish={handleCreateProject}>
                    <Form.Item name="title" label="Tên dự án / mục tiêu" rules={[{ required: true, message: 'Vui lòng nhập tên dự án' }]}>
                        <Input placeholder="Nhập tên dự án..." />
                    </Form.Item>
                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} placeholder="Mô tả ngắn gọn về không gian làm việc này" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title="Thêm thành viên" open={isAddMemberModalOpen} onCancel={() => setIsAddMemberModalOpen(false)} onOk={() => memberForm.submit()} okText="Thêm" cancelText="Hủy">
                <Form form={memberForm} layout="vertical" onFinish={handleAddMember}>
                    <Form.Item name="email" label="Email thành viên" rules={[{ required: true, type: 'email', message: 'Vui lòng nhập đúng định dạng email' }]}>
                        <Input placeholder="vd: nguyen.van.a@company.vn" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default Workspace;