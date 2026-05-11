import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Spin, Tooltip, message, Input, Dropdown } from 'antd'; // 👉 Thêm Dropdown
import { ClockCircleOutlined, UserOutlined, SearchOutlined, FilterOutlined, DownOutlined } from '@ant-design/icons'; // 👉 Thêm DownOutlined
import api from '../utils/api';
import dayjs from 'dayjs';
import socket from '../utils/socket';

const COLUMNS = {
    todo: { title: 'Cần làm', color: 'border-slate-300 bg-slate-100', text: 'text-slate-600' },
    doing: { title: 'Đang thực hiện', color: 'border-blue-300 bg-blue-50', text: 'text-blue-600' },
    review: { title: 'Chờ duyệt', color: 'border-amber-300 bg-amber-50', text: 'text-amber-600' },
    done: { title: 'Hoàn thành', color: 'border-emerald-300 bg-emerald-50', text: 'text-emerald-600' }
};

// 👉 Cấu hình Label hiển thị cho từng chế độ lọc
const FILTER_LABELS = {
    all: 'Tất cả công việc',
    mine: 'Việc của tôi',
    due_soon: 'Sắp đến hạn',
    overdue: 'Trễ hạn'
};

const KanbanBoard = ({ groupId, members }) => {
    const [rawTasks, setRawTasks] = useState([]);
    const [columns, setColumns] = useState({ todo: [], doing: [], review: [], done: [] });
    const [loading, setLoading] = useState(false);

    const [filter, setFilter] = useState(() => localStorage.getItem(`kanban_filter_${groupId}`) || 'all');
    const [searchQuery, setSearchQuery] = useState(() => localStorage.getItem(`kanban_search_${groupId}`) || '');
    const [selectedMember, setSelectedMember] = useState(() => localStorage.getItem(`kanban_member_${groupId}`) || null);

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const myId = currentUser._id || currentUser.id;

    useEffect(() => {
        if (groupId) {
            localStorage.setItem(`kanban_filter_${groupId}`, filter);
            localStorage.setItem(`kanban_search_${groupId}`, searchQuery);
            if (selectedMember) {
                localStorage.setItem(`kanban_member_${groupId}`, selectedMember);
            } else {
                localStorage.removeItem(`kanban_member_${groupId}`);
            }
        }
    }, [filter, searchQuery, selectedMember, groupId]);

    const extractTasks = (items, currentObj = null, currentKr = null, parentTask = null) => {
        let tasks = [];
        items.forEach(item => {
            if (item.itemType === 'objective') {
                tasks = tasks.concat(extractTasks(item.children || [], item, null, null));
            } else if (item.itemType === 'keyResult') {
                tasks = tasks.concat(extractTasks(item.children || [], currentObj, item, null));
            } else if (item.itemType === 'task') {
                if (item.children && item.children.length > 0) {
                    tasks = tasks.concat(extractTasks(item.children, currentObj, currentKr, item));
                } else {
                    tasks.push({
                        ...item,
                        parentObjective: currentObj,
                        parentKr: currentKr,
                        directParentTask: parentTask
                    });
                }
            }
        });
        return tasks;
    };

    const fetchBoardData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/objectives/tree?groupId=${groupId}`);
            const allTasks = extractTasks(res.data);
            setRawTasks(allTasks);
        } catch (error) {
            message.error('Lỗi tải dữ liệu bảng Kanban');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!groupId) return;
        fetchBoardData();
        socket.on('new_activity', fetchBoardData);
        return () => socket.off('new_activity', fetchBoardData);
    }, [groupId]);

    useEffect(() => {
        let filtered = rawTasks;

        if (filter === 'mine') {
            filtered = filtered.filter(t => {
                const targetId = t.assignee?._id || t.assignee;
                return targetId === myId;
            });
        } else if (filter === 'due_soon') {
            filtered = filtered.filter(t =>
                t.deadline &&
                dayjs(t.deadline).diff(dayjs(), 'day') <= 3 && dayjs(t.deadline).diff(dayjs(), 'day') >= 0 &&
                t.status !== 'done'
            );
        } else if (filter === 'overdue') {
            filtered = filtered.filter(t =>
                t.deadline &&
                dayjs().startOf('day').isAfter(dayjs(t.deadline).startOf('day')) &&
                t.status !== 'done'
            );
        }

        if (selectedMember) {
            filtered = filtered.filter(t => {
                const targetId = t.assignee?._id || t.assignee;
                return targetId === selectedMember;
            });
        }

        if (searchQuery.trim()) {
            filtered = filtered.filter(t =>
                t.title.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        setColumns({
            todo: filtered.filter(t => t.status === 'todo' || t.status === 'inbox'),
            doing: filtered.filter(t => t.status === 'doing'),
            review: filtered.filter(t => t.status === 'review'),
            done: filtered.filter(t => t.status === 'done')
        });
    }, [rawTasks, filter, myId, selectedMember, searchQuery]);

    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const destCol = destination.droppableId;

        const updatedRawTasks = rawTasks.map(task =>
            task._id === draggableId ? { ...task, status: destCol } : task
        );
        setRawTasks(updatedRawTasks);

        try {
            await api.put(`/tasks/${draggableId}`, { status: destCol, groupId });
        } catch (error) {
            message.error('Lỗi khi lưu trạng thái. Đang tải lại bảng...');
            fetchBoardData();
        }
    };

    // 👉 Khai báo Menu items cho Dropdown
    const filterMenuItems = [
        { key: 'all', label: 'Tất cả công việc' },
        { key: 'mine', label: <div className="flex items-center gap-2"><UserOutlined /> Việc của tôi</div> },
        { type: 'divider' },
        { key: 'due_soon', label: <div className="flex items-center gap-2 text-amber-600"><ClockCircleOutlined /> Sắp đến hạn</div> },
        { key: 'overdue', label: <div className="flex items-center gap-2 text-red-500"><ClockCircleOutlined /> Trễ hạn</div> }
    ];

    if (loading && rawTasks.length === 0) {
        return <div className="flex justify-center mt-20"><Spin size="large" /></div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-180px)]">

            {/* UI COMPACT: Toolbar thanh mảnh */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2 mb-3 shrink-0 bg-white rounded-lg border border-slate-200 shadow-sm">

                {/* Khu vực Trái: Các nút lọc & Avatar */}
                <div className="flex flex-wrap items-center gap-3">

                    {/* 👉 ĐÃ THAY THẾ RADIO BẰNG DROPDOWN */}
                    <Dropdown
                        menu={{
                            items: filterMenuItems,
                            onClick: (e) => setFilter(e.key),
                            selectedKeys: [filter]
                        }}
                        trigger={['click']}
                        placement="bottomLeft"
                    >
                        <button className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 transition-colors shadow-sm">
                            <FilterOutlined className={filter !== 'all' ? 'text-blue-500' : 'text-slate-400'} />
                            <span>{FILTER_LABELS[filter]}</span>
                            <DownOutlined className="text-[10px] text-slate-400 ml-1" />
                        </button>
                    </Dropdown>

                    {/* Vách ngăn mờ */}
                    <div className="hidden sm:block w-px h-5 bg-slate-200"></div>

                    {/* Danh sách Avatar (Thu nhỏ) */}
                    <div className="flex items-center gap-1">
                        <Tooltip title="Tất cả thành viên">
                            <div
                                onClick={() => setSelectedMember(null)}
                                className={`w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all border 
                                ${!selectedMember ? 'border-blue-500 bg-blue-50' : 'border-dashed border-slate-300 bg-slate-50 hover:border-slate-400'}`}
                            >
                                <span className="text-[9px] font-bold text-slate-500">ALL</span>
                            </div>
                        </Tooltip>

                        {members?.map(m => {
                            const isSelected = selectedMember === m.user._id;
                            return (
                                <Tooltip key={m.user._id} title={m.user.username}>
                                    <div
                                        onClick={() => setSelectedMember(isSelected ? null : m.user._id)}
                                        className={`w-7 h-7 rounded-full overflow-hidden cursor-pointer transition-all border-2
                                        ${isSelected ? 'border-blue-500 shadow-sm scale-110' : 'border-transparent opacity-70 hover:opacity-100'}`}
                                    >
                                        <img
                                            src={m.user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${m.user.username}`}
                                            alt={m.user.username}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                </Tooltip>
                            );
                        })}
                    </div>
                </div>

                {/* Khu vực Phải: Thanh tìm kiếm */}
                <Input
                    size="small"
                    placeholder="Tìm công việc..."
                    prefix={<SearchOutlined className="text-slate-400" />}
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-48 md:w-56 rounded px-2 py-1"
                    allowClear
                />
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                    {Object.entries(COLUMNS).map(([colId, config]) => (
                        <div key={colId} className="flex flex-col min-w-[280px] w-[280px] shrink-0">

                            <div className={`px-4 py-3 rounded-t-xl border-t border-x ${config.color} flex justify-between items-center`}>
                                <h3 className={`font-semibold text-[13px] uppercase tracking-wide ${config.text}`}>
                                    {config.title}
                                </h3>
                                <span className="bg-white/60 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">
                                    {columns[colId].length}
                                </span>
                            </div>

                            <Droppable droppableId={colId}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex-1 p-2 border-b border-x rounded-b-xl transition-colors duration-200 
                                        ${snapshot.isDraggingOver ? 'bg-slate-200/50 border-slate-300' : 'bg-slate-50 border-slate-200'}`}
                                    >
                                        {columns[colId].map((task, index) => {
                                            const targetId = task.assignee?._id || task.assignee;
                                            const assigneeObj = members?.find(m => m.user._id === targetId || m.user.id === targetId)?.user;

                                            return (
                                                <Draggable key={task._id} draggableId={task._id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`bg-white p-3 mb-2 rounded-lg border shadow-sm group hover:border-blue-400 transition-all
                                                            ${snapshot.isDragging ? 'shadow-lg border-blue-500 rotate-2 scale-105 z-50' : 'border-slate-200'}`}
                                                        >
                                                            {task.directParentTask ? (
                                                                <div className="text-[10px] mb-1.5 line-clamp-1 leading-relaxed">
                                                                    <span className="font-semibold text-purple-600/80 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">
                                                                        ⬑ Thuộc: {task.directParentTask.title}
                                                                    </span>
                                                                </div>
                                                            ) : (task.parentObjective || task.parentKr) ? (
                                                                <div className="text-[10px] mb-1.5 line-clamp-1 leading-relaxed">
                                                                    {task.parentObjective && (
                                                                        <span className="font-semibold text-blue-600/70 bg-blue-50 px-1.5 py-0.5 rounded">
                                                                            {task.parentObjective.title}
                                                                        </span>
                                                                    )}
                                                                    {task.parentKr && (
                                                                        <>
                                                                            <span className="mx-1 text-slate-300">›</span>
                                                                            <span className="text-slate-400">{task.parentKr.title}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            ) : null}

                                                            <div className="text-[13px] font-medium text-slate-800 mb-2 leading-snug">
                                                                {task.title}
                                                            </div>

                                                            <div className="flex items-center justify-between mt-3">
                                                                {task.deadline ? (
                                                                    <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded
                                                                        ${dayjs().isAfter(task.deadline, 'day') && task.status !== 'done' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                        <ClockCircleOutlined />
                                                                        {dayjs(task.deadline).format('DD/MM')}
                                                                    </div>
                                                                ) : <span />}

                                                                <Tooltip title={assigneeObj?.username || 'Chưa phân công'}>
                                                                    <div className={`w-6 h-6 rounded-full border flex items-center justify-center overflow-hidden
                                                                        ${assigneeObj ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50'}`}>
                                                                        {assigneeObj ? (
                                                                            <img src={assigneeObj.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${assigneeObj.username}`} alt="" className="w-full h-full object-cover" />
                                                                        ) : (
                                                                            <UserOutlined className="text-[10px] text-slate-400" />
                                                                        )}
                                                                    </div>
                                                                </Tooltip>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            );
                                        })}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </div>
                    ))}
                </div>
            </DragDropContext>
        </div>
    );
};

export default KanbanBoard;