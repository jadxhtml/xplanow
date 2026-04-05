import React, { useState } from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, ConfigProvider } from 'antd';
import {
    HomeOutlined,
    UnorderedListOutlined,
    UserOutlined,
    HistoryOutlined,
    MessageOutlined,
    LogoutOutlined,
    BarChartOutlined,
    TeamOutlined,
    MenuFoldOutlined,
    MenuUnfoldOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';

const { Header, Sider, Content } = Layout;

const MainLayout = () => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const user = JSON.parse(localStorage.getItem('user'));

    const token = localStorage.getItem('accessToken');
    if (!token) {
        return <Navigate to="/login" replace />;
    }

    const menuItems = [
        { key: '/', icon: <BarChartOutlined />, label: 'Tổng quan' },
        { key: '/objectives', icon: <UnorderedListOutlined />, label: 'Mục tiêu & Công việc' },
        { key: '/groups', icon: <TeamOutlined />, label: 'Không gian làm việc' },
        { key: '/activities', icon: <HistoryOutlined />, label: 'Lịch sử hoạt động' },
    ];

    const handleLogout = () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const userMenu = {
        items: [
            { key: 'profile', icon: <UserOutlined />, label: 'Hồ sơ cá nhân', onClick: () => navigate('/profile') },
            { type: 'divider' },
            { key: 'logout', icon: <LogoutOutlined />, danger: true, label: 'Đăng xuất', onClick: handleLogout },
        ]
    };

    return (
        <ConfigProvider theme={{ token: { colorPrimary: '#2563eb', borderRadius: 8, fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' } }}>
            <Layout className="min-h-screen bg-slate-50">
                <Sider
                    collapsible
                    collapsed={collapsed}
                    trigger={null}
                    theme="light"
                    width={240}
                    className="fixed h-screen left-0 top-0 bottom-0 z-50 border-r border-gray-200 shadow-sm"
                >
                    <div className="h-16 flex items-center justify-center border-b border-gray-100">
                        <div className={`font-medium text-blue-600 tracking-widest transition-all duration-300 ${collapsed ? 'text-xl' : 'text-lg uppercase'}`}>
                            {collapsed ? '⚡' : 'xPLANER'}
                        </div>
                    </div>
                    <div className="p-3">
                        <Menu
                            theme="light"
                            mode="inline"
                            selectedKeys={[location.pathname]}
                            items={menuItems}
                            onClick={({ key }) => navigate(key)}
                            className="border-none font-normal text-[14px] text-gray-500"
                        />
                    </div>
                </Sider>

                <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'all 0.2s' }}>
                    <Header className="bg-white/80 backdrop-blur-md px-4 flex justify-between items-center shadow-sm sticky top-0 z-40 h-16 border-b border-gray-200">
                        <div className="flex items-center gap-4">
                            <div
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 cursor-pointer text-gray-500 transition"
                                onClick={() => setCollapsed(!collapsed)}
                            >
                                {collapsed ? <MenuUnfoldOutlined className="text-lg" /> : <MenuFoldOutlined className="text-lg" />}
                            </div>
                            <div className="text-lg font-medium text-slate-700 tracking-wide">
                                {menuItems.find(item => item.key === location.pathname)?.label || 'Trang cá nhân'}
                            </div>
                        </div>

                        <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
                            <Space className="cursor-pointer hover:bg-slate-100 pl-2 pr-4 py-1.5 rounded-full border border-gray-200 transition-all">
                                <Avatar className="bg-blue-500 border border-white shadow-sm font-normal">
                                    {(user?.username || user?.name || 'U').charAt(0).toUpperCase()}
                                </Avatar>
                                <span className="font-normal text-[14px] text-slate-600 hidden sm:block tracking-wide">
                                    {user?.username}
                                </span>
                            </Space>
                        </Dropdown>
                    </Header>

                    <Content className="p-6">
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 min-h-[calc(100vh-120px)] p-6">
                            <Outlet />
                        </div>
                    </Content>
                </Layout>
            </Layout>
        </ConfigProvider>
    );
};

export default MainLayout;