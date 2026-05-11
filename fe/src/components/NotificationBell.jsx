import React, { useState, useEffect } from 'react';
import { Badge, Popover, Button, List, Avatar, message, Spin } from 'antd';
import { BellFilled } from '@ant-design/icons'; // Đổi icon sang BellFilled cho đậm
import api from '../utils/api';
import socket from '../utils/socket';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/vi';

dayjs.extend(relativeTime);
dayjs.locale('vi');

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const [popoverOpen, setPopoverOpen] = useState(false);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const fetchNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
        } catch (error) {
            console.error("Lỗi tải thông báo:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotifications();

        // 👉 CHUYỂN LỆNH BÁO DANH (SETUP) VÀO ĐÂY!
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && (user._id || user.id)) {
            const currentUserId = user._id || user.id;
            socket.emit('setup', currentUserId);
            console.log("🔔 [Frontend] Đã gửi lệnh setup cho ID:", currentUserId);
        }

        // Lắng nghe có tin mới
        socket.on('new_notification', (newNoti) => {
            setNotifications(prev => [newNoti, ...prev]);
            message.info(
                <span className="text-sm">
                    <strong className="text-blue-600">{newNoti.senderId?.username}</strong> {newNoti.content}
                </span>
            );
        });

        return () => socket.off('new_notification');
    }, []);

    const handleOpenChange = async (open) => {
        setPopoverOpen(open);
        if (open && unreadCount > 0) {
            try {
                await api.put('/notifications/read-all');
                setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            } catch (error) {
                console.error(error);
            }
        }
    };

    const handleRespond = async (notificationId, action) => {
        try {
            const res = await api.post('/notifications/respond', { notificationId, action });
            message.success(res.data.message);
            setNotifications(prev => prev.map(n =>
                n._id === notificationId ? { ...n, actionStatus: action === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED' } : n
            ));
            if (action === 'ACCEPT') {
                window.location.reload();
            }
        } catch (error) {
            message.error("Lỗi xử lý lời mời!");
        }
    };

    const notificationContent = (
        <div className="w-[320px] max-h-[400px] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 px-1">
                <span className="font-semibold text-slate-800">Thông báo của bạn</span>
            </div>
            {/* ... List thông báo giữ nguyên như cũ ... */}
            {loading ? (
                <div className="flex justify-center p-4"><Spin /></div>
            ) : notifications.length === 0 ? (
                <div className="text-center p-6 text-slate-400 text-sm">Chưa có thông báo nào.</div>
            ) : (
                <List
                    itemLayout="horizontal"
                    dataSource={notifications}
                    renderItem={item => (
                        <List.Item
                            className={`px-2 py-3 border-b border-slate-50 ${!item.isRead ? 'bg-blue-50/30' : ''}`}
                            actions={item.type === 'GROUP_INVITE' && item.actionStatus === 'PENDING' ? [
                                <div className="flex flex-col gap-1 mt-1">
                                    <Button type="primary" size="small" onClick={() => handleRespond(item._id, 'ACCEPT')}>Tham gia</Button>
                                    <Button danger size="small" type="text" onClick={() => handleRespond(item._id, 'REJECT')}>Từ chối</Button>
                                </div>
                            ] : [
                                <span className="text-[11px] text-slate-400 italic">
                                    {item.actionStatus === 'ACCEPTED' ? 'Đã tham gia' : item.actionStatus === 'REJECTED' ? 'Đã từ chối' : ''}
                                </span>
                            ]}
                        >
                            <List.Item.Meta
                                avatar={<Avatar src={item.senderId?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${item.senderId?.username}`} />}
                                title={<div><strong>{item.senderId?.username}</strong> {item.content}</div>}
                                description={<span className="text-[10px] text-blue-500">{dayjs(item.createdAt).fromNow()}</span>}
                            />
                        </List.Item>
                    )}
                />
            )}
        </div>
    );

    return (
        <Popover
            content={notificationContent}
            trigger="click"
            placement="bottomRight"
            open={popoverOpen}
            onOpenChange={handleOpenChange}
        >
            <Badge count={unreadCount} size="small" offset={[-2, 4]}>
                {/* 👉 ĐỔI MÀU NÚT CHUÔNG CHO NỔI BẬT LÊN */}
                <Button
                    shape="circle"
                    size="large"
                    icon={<BellFilled className="text-blue-600 text-[20px]" />}
                    className="bg-blue-50 border-blue-200 shadow-sm"
                />
            </Badge>
        </Popover>
    );
};

export default NotificationBell;