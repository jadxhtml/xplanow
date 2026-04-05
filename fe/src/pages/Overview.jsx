import React, { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Spin, message, Typography } from 'antd';
import { FlagOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../utils/api';

const { Title } = Typography;

const Overview = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, completed: 0, ongoing: 0 });
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        const fetchAndCalculateData = async () => {
            try {
                const response = await api.get('/objectives/tree');
                const rawData = response.data;

                if (!rawData || !Array.isArray(rawData)) return;

                let totalObj = 0;
                let completedObj = 0;
                let chartPoints = [];

                rawData.forEach(obj => {
                    if (obj.itemType === 'objective') {
                        totalObj++;
                        let objProgress = 0;

                        if (obj.children && obj.children.length > 0) {
                            const krChildren = obj.children.filter(child => child.itemType === 'keyResult');

                            if (krChildren.length > 0) {
                                let totalKrProgress = 0;
                                krChildren.forEach(kr => {
                                    let krProgress = 0;
                                    if (kr.children && kr.children.length > 0) {
                                        const totalTasks = kr.children.length;
                                        const doneTasks = kr.children.filter(t => t.status === 'done').length;
                                        krProgress = Math.round((doneTasks / totalTasks) * 100);
                                    } else {
                                        const target = kr.targetValue || 1;
                                        const current = kr.currentValue || 0;
                                        krProgress = Math.round((current / target) * 100);
                                        if (krProgress > 100) krProgress = 100;
                                    }
                                    totalKrProgress += krProgress;
                                });
                                objProgress = Math.round(totalKrProgress / krChildren.length);
                            }
                        }

                        if (objProgress === 100) completedObj++;

                        chartPoints.push({
                            name: obj.title.length > 15 ? obj.title.substring(0, 15) + '...' : obj.title,
                            'Tiến độ (%)': objProgress
                        });
                    }
                });

                setStats({ total: totalObj, completed: completedObj, ongoing: totalObj - completedObj });
                setChartData(chartPoints);
            } catch (error) {
                message.error("Lỗi khi tải dữ liệu báo cáo");
            } finally {
                setLoading(false);
            }
        };

        fetchAndCalculateData();
    }, []);

    const colors = ['#1677ff', '#52c41a', '#faad14', '#eb2f96', '#722ed1', '#13c2c2'];

    if (loading) return <div className="flex justify-center mt-20"><Spin size="large" /></div>;

    return (
        <div className="space-y-6">
            <div>
                <Title level={2} className="!mb-1">Báo cáo Tổng quan</Title>
                <p className="text-gray-500">Theo dõi bức tranh toàn cảnh về hiệu suất của bạn</p>
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={8}>
                    <Card variant="borderless" className="shadow-sm hover:shadow-md transition">
                        <Statistic title="Tổng Mục Tiêu (Objectives)" value={stats.total} prefix={<FlagOutlined className="text-blue-500" />} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card variant="borderless" className="shadow-sm hover:shadow-md transition">
                        <Statistic title="Đã Hoàn Thành" value={stats.completed} prefix={<CheckCircleOutlined className="text-green-500" />} valueStyle={{ color: '#3f8600' }} />
                    </Card>
                </Col>
                <Col xs={24} sm={8}>
                    <Card variant="borderless" className="shadow-sm hover:shadow-md transition">
                        <Statistic title="Đang Thực Hiện" value={stats.ongoing} prefix={<SyncOutlined spin className="text-orange-400" />} />
                    </Card>
                </Col>
            </Row>

            <Card variant="borderless" className="shadow-sm mt-6">
                <Title level={4} className="!mb-6">Biểu đồ Tiến độ Mục tiêu</Title>
                <div className="h-80 w-full">
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={(val) => `${val}%`} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="Tiến độ (%)" radius={[4, 4, 0, 0]} maxBarSize={60}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry['Tiến độ (%)'] === 100 ? '#52c41a' : colors[index % colors.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex h-full items-center justify-center text-gray-400">
                            Chưa có dữ liệu mục tiêu để hiển thị biểu đồ.
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default Overview;