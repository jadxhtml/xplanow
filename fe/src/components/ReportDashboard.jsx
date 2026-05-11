import React, { useEffect, useState } from 'react';
import { Spin, DatePicker, Tooltip } from 'antd';
import { CalendarOutlined, InfoCircleOutlined, ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { Chart as ChartJS, ArcElement, Tooltip as ChartTooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import api from '../utils/api';
import dayjs from 'dayjs';

ChartJS.register(ArcElement, ChartTooltip, Legend);

const { RangePicker } = DatePicker;

// ── Constants ──────────────────────────────────────────────────────────────────
const MEMBER_COLORS = [
    { bg: '#ede9fe', color: '#4c1d95' },
    { bg: '#dcfce7', color: '#14532d' },
    { bg: '#fef3c7', color: '#78350f' },
    { bg: '#e0f2fe', color: '#075985' },
    { bg: '#fce7f3', color: '#831843' },
    { bg: '#ecfdf5', color: '#065f46' },
    { bg: '#fff7ed', color: '#9a3412' },
];

const getInitials = (name = '') =>
    name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

// ── Sub-components ─────────────────────────────────────────────────────────────
const StatusBadge = ({ pct }) => {
    const cfg = pct >= 80
        ? { bg: '#f0fdf4', color: '#166534', label: 'Rất tốt' }
        : pct >= 50
            ? { bg: '#eff6ff', color: '#1e40af', label: 'Đạt yêu cầu' }
            : { bg: '#fffbeb', color: '#92400e', label: 'Cần đốc thúc' };
    return (
        <span style={{ fontSize: 10, fontWeight: 500, padding: '2px 8px', borderRadius: 4, background: cfg.bg, color: cfg.color }}>
            {cfg.label}
        </span>
    );
};

const TrendBadge = ({ trend }) => {
    if (!trend) return null;
    const isUp = trend > 0;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 2,
            fontSize: 10.5, fontWeight: 500, padding: '2px 6px', borderRadius: 4, marginLeft: 8,
            background: isUp ? '#f0fdf4' : '#fef2f2',
            color: isUp ? '#16a34a' : '#dc2626',
        }}>
            {isUp ? <ArrowUpOutlined style={{ fontSize: 9 }} /> : <ArrowDownOutlined style={{ fontSize: 9 }} />}
            {Math.abs(trend)}%
        </span>
    );
};

const StatCard = ({ label, value, sub, valueColor, trend, tooltip }) => (
    <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 8, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 10.5, color: '#94a3b8' }}>{label}</span>
            {tooltip && (
                <Tooltip title={tooltip}>
                    <InfoCircleOutlined style={{ fontSize: 11, color: '#d1d5db', cursor: 'help' }} />
                </Tooltip>
            )}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 6 }}>
            <span style={{ fontSize: 24, fontWeight: 500, color: valueColor || '#0f172a', lineHeight: 1 }}>{value}</span>
            <TrendBadge trend={trend} />
        </div>
        {sub && (
            <div style={{ fontSize: 11, color: '#94a3b8', paddingTop: 6, borderTop: '0.5px solid #f1f5f9' }}>{sub}</div>
        )}
    </div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const ReportDashboard = ({ groupId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState([
        dayjs().startOf('month'),
        dayjs().endOf('month'),
    ]);

    useEffect(() => {
        if (!groupId) return;
        const fetchReport = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/reports/${groupId}/report`, {
                    params: {
                        startDate: dateRange?.[0]?.toISOString(),
                        endDate: dateRange?.[1]?.toISOString(),
                    },
                });
                setData(res.data);
            } catch (e) {
                console.error('Lỗi lấy dữ liệu thống kê:', e);
            } finally {
                setLoading(false);
            }
        };
        fetchReport();
    }, [groupId, dateRange]);

    if (loading && !data) return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
            <Spin size="small" />
        </div>
    );

    if (!data) return (
        <div style={{ textAlign: 'center', padding: '48px 0', fontSize: 13, color: '#94a3b8' }}>
            Chưa có dữ liệu thống kê cho nhóm này.
        </div>
    );

    const { overview, memberChartData = [] } = data;
    const total = overview.totalTasks || 1;
    const donePct = Math.round((overview.completedTasks / total) * 100);
    const inPct = Math.round((overview.inProgressTasks / total) * 100);

    // Chart.js doughnut
    const pieData = {
        labels: ['Hoàn thành', 'Đang xử lý', 'Trễ hạn'],
        datasets: [{
            data: [overview.completedTasks, overview.inProgressTasks, overview.overdueTasks],
            backgroundColor: ['#10b981', '#6366f1', '#ef4444'],
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };

    const pieOptions = {
        cutout: '72%',
        plugins: {
            legend: { display: false },
            tooltip: {
                padding: 10,
                callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed} công việc` },
            },
        },
    };

    const legendItems = [
        { color: '#10b981', label: 'Hoàn thành', pct: `${donePct}%` },
        { color: '#6366f1', label: 'Đang xử lý', pct: `${inPct}%` },
        { color: '#ef4444', label: 'Trễ hạn', pct: `${100 - donePct - inPct}%` },
    ];

    return (
        <div style={{ background: '#f8fafc', padding: 20, borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>

            {/* Overlay khi refetch */}
            {loading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.6)', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                    <Spin size="small" />
                </div>
            )}

            {/* Header */}
            <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 8, padding: '13px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#0f172a', marginBottom: 2 }}>Báo cáo hiệu suất</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>Phân tích tiến độ và chất lượng công việc của nhóm</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>Thời gian:</span>
                    <RangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        format="DD/MM/YYYY"
                        allowClear={false}
                        suffixIcon={<CalendarOutlined style={{ color: '#6366f1', fontSize: 12 }} />}
                        style={{ borderRadius: 6, fontSize: 12 }}
                        size="small"
                    />
                </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <StatCard
                    label="Khối lượng công việc"
                    value={overview.totalTasks}
                    sub="Tổng tác vụ trong kỳ"
                    tooltip="Đo lường mức độ bận rộn của toàn nhóm"
                />
                <StatCard
                    label="Tốc độ hoàn thành"
                    value={overview.completedTasks}
                    valueColor="#10b981"
                    sub={`${donePct}% so với tổng khối lượng`}
                    trend={5}
                    tooltip="Số task đã chuyển sang trạng thái Done"
                />
                <StatCard
                    label="Đang tồn đọng"
                    value={overview.inProgressTasks}
                    valueColor="#6366f1"
                    sub={`${inPct}% đang được xử lý`}
                />
                <StatCard
                    label="Rủi ro trễ hạn"
                    value={overview.overdueTasks}
                    valueColor="#ef4444"
                    sub="Cần ưu tiên giải quyết"
                    trend={-2}
                    tooltip="Task đã qua deadline nhưng chưa Done"
                />
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 14 }}>

                {/* Donut */}
                <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f1f5f9', fontSize: 12.5, fontWeight: 500, color: '#0f172a' }}>
                        Phân bổ trạng thái
                    </div>
                    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                        <div style={{ position: 'relative', width: 130, height: 130 }}>
                            <Doughnut data={pieData} options={pieOptions} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                                <span style={{ fontSize: 20, fontWeight: 500, color: '#0f172a', lineHeight: 1 }}>{donePct}%</span>
                                <span style={{ fontSize: 9, color: '#94a3b8', letterSpacing: '0.05em', marginTop: 3 }}>TIẾN ĐỘ</span>
                            </div>
                        </div>
                        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 7 }}>
                            {legendItems.map(item => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11.5 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', color: '#475569' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, marginRight: 7, flexShrink: 0 }} />
                                        {item.label}
                                    </span>
                                    <span style={{ fontWeight: 500, color: '#0f172a' }}>{item.pct}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Member table */}
                <div style={{ background: '#fff', border: '0.5px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f1f5f9', fontSize: 12.5, fontWeight: 500, color: '#0f172a' }}>
                        Năng suất từng thành viên
                    </div>
                    {memberChartData.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', fontSize: 12, color: '#94a3b8' }}>
                            Chưa có dữ liệu phân công trong khoảng thời gian này.
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                                <colgroup>
                                    <col style={{ width: '32%' }} />
                                    <col style={{ width: '10%' }} />
                                    <col style={{ width: '12%' }} />
                                    <col style={{ width: '28%' }} />
                                    <col style={{ width: '18%' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        {['Thành viên', 'KLCV', 'Hoàn thành', 'Burn-down', 'Đánh giá'].map(h => (
                                            <th key={h} style={{ padding: '8px 14px', fontSize: 10, fontWeight: 500, color: '#94a3b8', textAlign: h === 'Thành viên' || h === 'Burn-down' ? 'left' : 'center', borderBottom: '0.5px solid #f1f5f9', background: '#fafafa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {memberChartData.map((m, i) => {
                                        const pct = Math.round((m.doneTasks / (m.totalTasks || 1)) * 100);
                                        const cfg = MEMBER_COLORS[i % MEMBER_COLORS.length];
                                        const barColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#6366f1' : '#f59e0b';
                                        return (
                                            <tr key={m.name} style={{ borderBottom: '0.5px solid #f8fafc' }}>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                                        <span style={{ width: 30, height: 30, borderRadius: '50%', background: cfg.bg, color: cfg.color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10.5, fontWeight: 500, flexShrink: 0 }}>
                                                            {getInitials(m.name)}
                                                        </span>
                                                        <span style={{ fontSize: 12.5, fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12.5, color: '#475569' }}>{m.totalTasks}</td>
                                                <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12.5, fontWeight: 500, color: '#10b981' }}>{m.doneTasks}</td>
                                                <td style={{ padding: '10px 14px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                        <div style={{ flex: 1, height: 3, background: '#f1f5f9', borderRadius: 2, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 2, transition: 'width .4s ease' }} />
                                                        </div>
                                                        <span style={{ fontSize: 10.5, color: '#94a3b8', minWidth: 26 }}>{pct}%</span>
                                                    </div>
                                                </td>
                                                <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                                                    <StatusBadge pct={pct} />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportDashboard;