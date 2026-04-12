import React, { useEffect, useState } from 'react';
import { Spin, Empty } from 'antd';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import api from '../utils/api';

ChartJS.register(ArcElement, Tooltip, Legend);

const COLORS = ['#378ADD', '#1D9E75', '#D4537E', '#BA7517', '#7F77DD', '#E24B4A', '#639922'];
const BG_COLORS = ['#E6F1FB', '#E1F5EE', '#FBEAF0', '#FAEEDA', '#EEEDFE', '#FCEBEB', '#EAF3DE'];

const getInitials = (name = '') =>
    name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

const StatusBadge = ({ pct }) => {
    if (pct >= 80) return <span className="px-2 py-0.5 text-xs rounded bg-green-100 text-green-800">Tốt</span>;
    if (pct >= 50) return <span className="px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-800">Khá</span>;
    return <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-800">Cần cải thiện</span>;
};

const StatCard = ({ label, value, sub, valueClass }) => (
    <div className="bg-slate-100 rounded-lg p-4">
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className={`text-2xl font-medium ${valueClass}`}>{value}</div>
        {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
);

const ReportDashboard = ({ groupId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!groupId) return;
        setLoading(true);
        api.get(`/reports/${groupId}/report`)
            .then(res => setData(res.data))
            .catch(err => console.error('Lỗi lấy dữ liệu thống kê:', err))
            .finally(() => setLoading(false));
    }, [groupId]);

    if (loading) return (
        <div className="flex justify-center items-center h-[50vh]">
            <Spin size="large" />
        </div>
    );

    if (!data) return (
        <div className="mt-10">
            <Empty description="Chưa có dữ liệu thống kê cho nhóm này" />
        </div>
    );

    const { overview, memberChartData = [] } = data;
    const total = overview.totalTasks || 1;
    const inPct = Math.round((overview.inProgressTasks / total) * 100);
    const donePct = Math.round((overview.completedTasks / total) * 100);

    const pieData = {
        labels: ['Hoàn thành', 'Đang làm', 'Trễ hạn'],
        datasets: [{
            data: [overview.completedTasks, overview.inProgressTasks, overview.overdueTasks],
            backgroundColor: ['#639922', '#1D9E75', '#E24B4A'],
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };

    const pieOptions = {
        cutout: '65%',
        plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} task` } },
        },
    };

    const legendItems = [
        { color: '#639922', label: `Hoàn thành ${donePct}%` },
        { color: '#1D9E75', label: `Đang làm ${inPct}%` },
        { color: '#E24B4A', label: `Trễ hạn` },
    ];

    return (
        <div className="p-4 bg-slate-50 min-h-full rounded-lg space-y-4">

            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <StatCard label="Tổng công việc" value={overview.totalTasks} sub="tháng này" valueClass="text-blue-600" />
                <StatCard label="Đang thực hiện" value={overview.inProgressTasks} sub={`${inPct}% tổng task`} valueClass="text-teal-600" />
                <StatCard label="Đã hoàn thành" value={overview.completedTasks} sub={`${donePct}% tổng task`} valueClass="text-green-700" />
                <StatCard label="Trễ hạn" value={overview.overdueTasks} sub="cần xử lý" valueClass="text-red-500" />
            </div>

            {/* Bottom row */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4">

                {/* Pie chart */}
                <div className="bg-white border border-slate-200 rounded-xl p-5">
                    <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-4">Trạng thái task</p>
                    <div className="h-48">
                        <Doughnut data={pieData} options={pieOptions} />
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-3">
                        {legendItems.map(item => (
                            <span key={item.label} className="flex items-center gap-1.5 text-xs text-gray-500">
                                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: item.color }} />
                                {item.label}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Member table */}
                <div className="bg-white border border-slate-200 rounded-xl p-5 overflow-auto">
                    <p className="text-xs uppercase tracking-wide text-gray-400 font-medium mb-4">Năng suất thành viên</p>
                    {memberChartData.length === 0 ? (
                        <Empty description="Chưa có công việc nào được phân công" />
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-gray-400 border-b border-slate-100">
                                    <th className="text-left pb-2 font-normal">Thành viên</th>
                                    <th className="text-center pb-2 font-normal">Giao</th>
                                    <th className="text-center pb-2 font-normal">Xong</th>
                                    <th className="text-center pb-2 font-normal">Tiến độ</th>
                                    <th className="text-center pb-2 font-normal">Đánh giá</th>
                                </tr>
                            </thead>
                            <tbody>
                                {memberChartData.map((m, i) => {
                                    const pct = Math.round((m.doneTasks / (m.totalTasks || 1)) * 100);
                                    const color = COLORS[i % COLORS.length];
                                    const bg = BG_COLORS[i % BG_COLORS.length];
                                    return (
                                        <tr key={m.name} className="border-b border-slate-50 last:border-none">
                                            <td className="py-2.5 flex items-center gap-2">
                                                <span
                                                    className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium shrink-0"
                                                    style={{ background: bg, color }}
                                                >
                                                    {getInitials(m.name)}
                                                </span>
                                                <span className="truncate max-w-[120px]">{m.name}</span>
                                            </td>
                                            <td className="text-center text-gray-700">{m.totalTasks}</td>
                                            <td className="text-center text-gray-700">{m.doneTasks}</td>
                                            <td className="text-center">
                                                <div className="inline-flex items-center gap-2">
                                                    <div className="w-14 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{ width: `${pct}%`, background: color }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-gray-400 w-7">{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="text-center"><StatusBadge pct={pct} /></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportDashboard;