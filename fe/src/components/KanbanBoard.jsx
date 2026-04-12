import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Spin, Avatar, Tooltip, message, Radio } from 'antd';
import { ClockCircleOutlined, UserOutlined, FilterOutlined, FireOutlined } from '@ant-design/icons';
import api from '../utils/api';
import dayjs from 'dayjs';
import socket from '../utils/socket';

const COLUMNS = {
    todo: { title: 'Cần làm', color: 'border-slate-300 bg-slate-100', text: 'text-slate-600' },
    doing: { title: 'Đang thực hiện', color: 'border-blue-300 bg-blue-50', text: 'text-blue-600' },
    review: { title: 'Chờ duyệt', color: 'border-amber-300 bg-amber-50', text: 'text-amber-600' },
    done: { title: 'Hoàn thành', color: 'border-emerald-300 bg-emerald-50', text: 'text-emerald-600' }
};

const KanbanBoard = ({ groupId, members }) => {
    const [rawTasks, setRawTasks] = useState([]); // Kho chứa toàn bộ task gốc
    const [columns, setColumns] = useState({ todo: [], doing: [], review: [], done: [] });
    const [loading, setLoading] = useState(false);
    const [filter, setFilter] = useState('all'); // State cho bộ lọc

    const currentUser = JSON.parse(localStorage.getItem('user')) || {};
    const myId = currentUser._id || currentUser.id;

    const extractTasks = (items, currentObj = null, currentKr = null) => {
        let tasks = [];
        items.forEach(item => {
            if (item.itemType === 'objective') {
                tasks = tasks.concat(extractTasks(item.children || [], item, null));
            } else if (item.itemType === 'keyResult') {
                tasks = tasks.concat(extractTasks(item.children || [], currentObj, item));
            } else if (item.itemType === 'task') {
                tasks.push({ ...item, parentObjective: currentObj, parentKr: currentKr });
            }
        });
        return tasks;
    };

    const fetchBoardData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/objectives/tree?groupId=${groupId}`);
            const allTasks = extractTasks(res.data);
            setRawTasks(allTasks); // Lưu vào kho gốc
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
            filtered = rawTasks.filter(t => {
                const targetId = t.assignee?._id || t.assignee || t.user?._id || t.user;
                return targetId === myId;
            });
        } else if (filter === 'due_soon') {
            filtered = rawTasks.filter(t =>
                t.deadline &&
                dayjs(t.deadline).diff(dayjs(), 'day') <= 3 && // Sắp đến hạn trong 3 ngày
                t.status !== 'done'
            );
        } else if (filter === 'overdue') {
            filtered = rawTasks.filter(t =>
                t.deadline &&
                dayjs().startOf('day').isAfter(dayjs(t.deadline).startOf('day')) && // Trễ hạn
                t.status !== 'done'
            );
        }

        setColumns({
            todo: filtered.filter(t => t.status === 'todo' || t.status === 'inbox'),
            doing: filtered.filter(t => t.status === 'doing'),
            review: filtered.filter(t => t.status === 'review'),
            done: filtered.filter(t => t.status === 'done')
        });
    }, [rawTasks, filter, myId]);

    // Xử lý sự kiện kéo thả
    const onDragEnd = async (result) => {
        const { source, destination, draggableId } = result;
        if (!destination) return;
        if (source.droppableId === destination.droppableId && source.index === destination.index) return;

        const destCol = destination.droppableId;

        // CẬP NHẬT KHO GỐC (Optimistic UI cực mượt)
        const updatedRawTasks = rawTasks.map(task =>
            task._id === draggableId ? { ...task, status: destCol } : task
        );
        setRawTasks(updatedRawTasks); // Effect số 2 sẽ tự động bắt được và chia lại cột

        // Gọi API lưu Database
        try {
            await api.put(`/tasks/${draggableId}`, { status: destCol, groupId });
        } catch (error) {
            message.error('Lỗi khi lưu trạng thái. Đang tải lại bảng...');
            fetchBoardData(); // Rollback nếu lỗi
        }
    };

    if (loading && rawTasks.length === 0) {
        return <div className="flex justify-center mt-20"><Spin size="large" /></div>;
    }

    return (
        <div className="flex flex-col h-[calc(100vh-180px)]">

            <div className="flex items-center justify-between px-1 mb-4 shrink-0">
                <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                    <FilterOutlined /> Lọc công việc:
                </div>
                <Radio.Group
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    optionType="button"
                    buttonStyle="solid"
                    className="shadow-sm"
                >
                    <Radio.Button value="all">Tất cả Nhóm</Radio.Button>
                    <Radio.Button value="mine"><UserOutlined className="mr-1" /> Việc của tôi</Radio.Button>
                    <Radio.Button value="due_soon"><ClockCircleOutlined className="mr-1 text-amber-500" /> Sắp đến hạn</Radio.Button>
                    <Radio.Button value="overdue"> Trễ hạn</Radio.Button>
                </Radio.Group>
            </div>

            {/* BẢNG KANBAN */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
                    {Object.entries(COLUMNS).map(([colId, config]) => (
                        <div key={colId} className="flex flex-col min-w-[280px] w-[280px] shrink-0">
                            {/* Tiêu đề cột */}
                            <div className={`px-4 py-3 rounded-t-xl border-t border-x ${config.color} flex justify-between items-center`}>
                                <h3 className={`font-semibold text-[13px] uppercase tracking-wide ${config.text}`}>
                                    {config.title}
                                </h3>
                                <span className="bg-white/60 text-slate-500 text-xs px-2 py-0.5 rounded-full font-medium">
                                    {columns[colId].length}
                                </span>
                            </div>

                            {/* Khu vực thả thẻ */}
                            <Droppable droppableId={colId}>
                                {(provided, snapshot) => (
                                    <div
                                        ref={provided.innerRef}
                                        {...provided.droppableProps}
                                        className={`flex-1 p-2 border-b border-x rounded-b-xl transition-colors duration-200 
                                        ${snapshot.isDraggingOver ? 'bg-slate-200/50 border-slate-300' : 'bg-slate-50 border-slate-200'}`}
                                    >
                                        {columns[colId].map((task, index) => {
                                            // Tìm Avatar người phụ trách
                                            const targetId = task.assignee?._id || task.assignee || task.user?._id || task.user;
                                            const assigneeObj = members?.find(m => m.user._id === targetId || m.user.id === targetId)?.user;

                                            return (
                                                <Draggable key={task._id} draggableId={task._id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            className={`bg-white p-3 mb-2 rounded-lg border shadow-sm group hover:border-blue-400 transition-all
                                                            ${snapshot.isDragging ? 'shadow-lg border-blue-500 rotate-2 scale-105' : 'border-slate-200'}`}
                                                        >
                                                            {/* 👉 BREADCRUMB: Nguồn gốc của Task */}
                                                            {(task.parentObjective || task.parentKr) && (
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
                                                            )}

                                                            {/* Tên Task */}
                                                            <div className="text-[13px] font-medium text-slate-800 mb-2 leading-snug">
                                                                {task.title}
                                                            </div>

                                                            <div className="flex items-center justify-between mt-3">
                                                                {/* Ngày hạn chót */}
                                                                {task.deadline ? (
                                                                    <div className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded
                                                                        ${dayjs().isAfter(task.deadline, 'day') && task.status !== 'done' ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                                                                        <ClockCircleOutlined />
                                                                        {dayjs(task.deadline).format('DD/MM')}
                                                                    </div>
                                                                ) : <span />}

                                                                {/* Avatar */}
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