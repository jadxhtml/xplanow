import React, { useEffect, useState } from 'react';
import { Timeline, Spin, message, Tag } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';
import api from '../utils/api';

const Activities = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchActivities = async () => {
        setLoading(true);
        try {
            const response = await api.get('/activities');
            setActivities(response.data);
        } catch (error) {
            message.error('Không thể tải lịch sử hoạt động!');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, []);

    const getActionColor = (action) => {
        switch (action) {
            case 'CREATE': return 'green';
            case 'UPDATE': return 'blue';
            case 'DELETE': return 'red';
            default: return 'gray';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm p-8 min-h-full">
            <div className="mb-8 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Lịch sử hoạt động (Activity Log)</h2>
                <p className="text-gray-500">Theo dõi mọi thay đổi và thao tác trên hệ thống</p>
            </div>

            {loading ? (
                <div className="flex justify-center p-10"><Spin size="large" /></div>
            ) : activities.length > 0 ? (
                <div className="max-w-3xl">
                    <Timeline
                        mode="left"
                        items={activities.map(act => ({
                            color: getActionColor(act.action),
                            dot: act.action === 'DELETE' ? <ClockCircleOutlined style={{ fontSize: '16px', color: 'red' }} /> : null,
                            children: (
                                <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Tag color={getActionColor(act.action)} className="font-bold">
                                            {act.action}
                                        </Tag>
                                        <span className="font-semibold text-gray-700">{act.entityType}</span>
                                        <span className="text-gray-400 text-sm ml-auto">
                                            {new Date(act.createdAt).toLocaleString('vi-VN')}
                                        </span>
                                    </div>
                                    <p className="text-gray-600 m-0">{act.details}</p>
                                </div>
                            )
                        }))}
                    />
                </div>
            ) : (
                <div className="text-center text-gray-400 py-10">
                    Chưa có hoạt động nào được ghi nhận.
                </div>
            )}
        </div>
    );
};

export default Activities;