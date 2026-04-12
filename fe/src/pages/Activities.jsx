import React, { useEffect, useState } from 'react';
import { Spin, message, notification, Avatar } from 'antd';
import api from '../utils/api';
import socket from '../utils/socket';
import dayjs from 'dayjs'; // Dùng chung thư viện ngày tháng với ChatBox cho đẹp

// 👉 BỘ CẤU HÌNH MÀU SẮC THEO TAILWIND (Thêm nhãn DONE riêng cho đẹp)
const ACTION_CONFIG = {
    CREATE: { label: 'Tạo mới', bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    UPDATE: { label: 'Cập nhật', bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
    DELETE: { label: 'Xóa bỏ', bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' },
    DONE: { label: 'Hoàn thành', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-600' },
    ASSIGN: { label: 'Phân công', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
    DEFAULT: { label: 'Hoạt động', bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
};

// 👉 HÀM LỌC THÔNG MINH: Tự động đoán hành động nếu Backend gửi sai
const getActionConfig = (act) => {
    // 1. Quét chính xác từ trường 'action' của Backend gửi về (VD: "COMPLETE_TASK", "CREATE_OBJECTIVE")
    if (act.action) {
        const actionStr = act.action.toUpperCase();
        if (actionStr.includes('COMPLETE') || actionStr.includes('DONE')) return ACTION_CONFIG.DONE;
        if (actionStr.includes('CREATE') || actionStr.includes('ADD')) return ACTION_CONFIG.CREATE;
        if (actionStr.includes('DELETE') || actionStr.includes('REMOVE')) return ACTION_CONFIG.DELETE;
        if (actionStr.includes('UPDATE') || actionStr.includes('EDIT')) return ACTION_CONFIG.UPDATE;
        if (actionStr.includes('ASSIGN')) return ACTION_CONFIG.ASSIGN;
    }

    // 2. Dự phòng (Fallback): Lỡ Backend quên gửi action, ta tự đọc hiểu cột 'details'
    const text = (act.details || '').toLowerCase();
    if (text.includes('hoàn thành') || text.includes('done')) return ACTION_CONFIG.DONE;
    if (text.includes('tạo') || text.includes('thêm')) return ACTION_CONFIG.CREATE;
    if (text.includes('xóa')) return ACTION_CONFIG.DELETE;
    if (text.includes('cập nhật') || text.includes('đổi') || text.includes('tiến độ')) return ACTION_CONFIG.UPDATE;
    if (text.includes('giao') || text.includes('phân công')) return ACTION_CONFIG.ASSIGN;

    // 3. Không khớp gì cả thì trả về màu xám mặc định
    return ACTION_CONFIG.DEFAULT;
};
const Activities = ({ groupId }) => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/activities?groupId=${groupId}`);
            setActivities(res.data);
        } catch {
            message.error('Không thể tải lịch sử hoạt động');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!groupId) return;
        fetchActivities();

        socket.on('new_activity', (newLog) => {
            const logGroupId = newLog.group?._id || newLog.group;
            if (String(logGroupId) !== String(groupId)) return;

            setActivities(prev => [newLog, ...prev]);

            const currentUser = JSON.parse(localStorage.getItem('user')) || {};
            const currentUserId = currentUser._id || currentUser.id;

            if (newLog.user?._id !== currentUserId) {
                notification.info({
                    message: <span className="font-medium text-slate-800">{newLog.user?.username || 'Thành viên'}</span>,
                    description: <span className="text-slate-500 text-sm">{newLog.details}</span>,
                    placement: 'bottomRight',
                });
            }
        });

        return () => socket.off('new_activity');
    }, [groupId]);

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 shrink-0">
                <div className="text-[15px] font-semibold text-slate-800 mb-0.5">Nhật ký hệ thống</div>
                <div className="text-xs text-slate-500">Lưu vết mọi thay đổi và thao tác của các thành viên trong dự án</div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2">
                {loading ? (
                    <div className="flex justify-center items-center h-32"><Spin /></div>
                ) : activities.length === 0 ? (
                    <div className="text-center py-16 text-sm text-slate-400">
                        Chưa có hoạt động nào được ghi nhận.
                    </div>
                ) : (
                    <div className="pt-4 pb-8">
                        {activities.map((act, index) => {
                            const cfg = getActionConfig(act); // Áp dụng hàm lọc thông minh
                            const isLast = index === activities.length - 1;
                            const authorName = act.user?.username || 'Thành viên ẩn danh';
                            const avatarUrl = act.user?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${authorName}`;

                            return (
                                <div key={act._id || index} className="flex px-6 group hover:bg-slate-50 transition-colors duration-200">
                                    {/* Timeline Line */}
                                    <div className="flex flex-col items-center w-8 shrink-0 pt-3">
                                        <div className={`w-2 h-2 rounded-full ring-4 ring-white ${cfg.dot} z-10`} />
                                        {!isLast && <div className="w-[1.5px] flex-1 min-h-[30px] bg-slate-100 my-1 group-hover:bg-slate-200 transition-colors" />}
                                    </div>

                                    {/* Content Card */}
                                    <div className="flex-1 py-2 pl-3">
                                        <div className="flex items-start justify-between gap-4 mb-1">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar src={avatarUrl} size={26} className="border border-slate-200" />
                                                <span className="text-[13px] font-medium text-slate-700">
                                                    {authorName}
                                                </span>
                                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>

                                            {/* Thời gian */}
                                            <span className="text-[11px] text-slate-400 shrink-0 pt-0.5">
                                                {dayjs(act.createdAt).format('HH:mm - DD/MM/YYYY')}
                                            </span>
                                        </div>

                                        {/* Chi tiết hoạt động */}
                                        <div className="text-[13px] text-slate-500 pl-[36px] leading-relaxed pb-3">
                                            {act.details}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Activities;