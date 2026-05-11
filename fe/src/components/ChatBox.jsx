import React, { useEffect, useState, useRef } from 'react';
import { Input, Button, Spin, message, Avatar, Tooltip, Image, Popover } from 'antd';
import {
    SendOutlined, PaperClipOutlined, FilePdfOutlined, PictureOutlined,
    SmileOutlined, EnterOutlined, CloseOutlined
} from '@ant-design/icons';
import socket from '../utils/socket';
import api from '../utils/api';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

// Danh sách Emoji cơ bản
const REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

const ChatBox = ({ groupId }) => {
    const fileInputRef = useRef(null);
    const [messageList, setMessageList] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [typingUser, setTypingUser] = useState("");

    // STATE: Dùng cho tính năng Trả lời (Reply)
    const [replyingTo, setReplyingTo] = useState(null);
    const [hoveredMsgId, setHoveredMsgId] = useState(null);

    const typingTimeout = useRef(null);
    const messagesEndRef = useRef(null);
    const chatContainerRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user')) || {};
    const myId = user._id || user.id;

    const scrollToBottom = (behavior = "auto") => {
        messagesEndRef.current?.scrollIntoView({ behavior });
    };

    useEffect(() => {
        const fetchMessages = async () => {
            if (!groupId) return;
            setLoading(true);
            try {
                const res = await api.get(`/messages/${groupId}`);
                setMessageList(res.data);
                setTimeout(() => scrollToBottom("auto"), 50);
            } catch (error) {
                console.error("Lỗi tải tin nhắn:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
        if (groupId) socket.emit('join_room', groupId);
    }, [groupId]);

    useEffect(() => {
        const handleReceiveMsg = (data) => {
            if (data.group === groupId || data.groupId === groupId) {
                setMessageList((list) => [...list, data]);
                setTimeout(() => scrollToBottom("smooth"), 100);
            }
        };

        const handleReceiveReaction = (data) => {
            if (data.groupId === groupId) {
                setMessageList(prev => prev.map(msg =>
                    msg._id === data.messageId ? { ...msg, reactions: data.reactions } : msg
                ));
            }
        };

        socket.on('receive_message', handleReceiveMsg);
        socket.on('receive_reaction', handleReceiveReaction);
        socket.on('display_typing', (userName) => setTypingUser(userName));
        socket.on('hide_typing', () => setTypingUser(""));

        return () => {
            socket.off('receive_message', handleReceiveMsg);
            socket.off('receive_reaction', handleReceiveReaction);
            socket.off('display_typing');
            socket.off('hide_typing');
        };
    }, [groupId]);

    const sendMessage = async () => {
        if (currentMessage.trim() !== "" && groupId) {
            const messageData = {
                groupId: groupId,
                senderId: myId,
                message: currentMessage,
                type: 'text',
                replyToId: replyingTo?._id || null
            };

            await socket.emit('send_message', messageData);

            setCurrentMessage("");
            setReplyingTo(null);
            socket.emit('stop_typing', groupId);
            setTimeout(() => scrollToBottom("smooth"), 100);
        }
    };

    const handleTyping = (e) => {
        setCurrentMessage(e.target.value);
        if (groupId) {
            socket.emit('typing', { roomId: groupId, userName: user.username });
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => socket.emit('stop_typing', groupId), 2000);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const hideLoading = message.loading('Đang tải đính kèm...', 0);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/messages/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const fileType = file.type.startsWith('image/') ? 'image' : 'file';

            socket.emit('send_message', {
                groupId: groupId,
                senderId: myId,
                message: fileType === 'image' ? "Đã gửi một hình ảnh" : `Đã gửi tệp: ${file.name}`,
                type: fileType,
                fileUrl: res.data.url,
                fileName: res.data.name || file.name,
                replyToId: replyingTo?._id || null
            });

            setReplyingTo(null);
            setTimeout(() => scrollToBottom("smooth"), 500);
        } catch (error) {
            message.error("Lỗi khi tải file lên!");
        } finally {
            hideLoading();
            e.target.value = null;
        }
    };

    const formatDateDivider = (dateString) => {
        const d = dayjs(dateString);
        if (d.isToday()) return "Hôm nay";
        if (d.isYesterday()) return "Hôm qua";
        return d.format('DD Tháng MM, YYYY');
    };

    const handleReplyClick = (msg) => {
        setReplyingTo(msg);
        document.getElementById('chatbox-input').focus();
    };

    const handleReact = async (msgId, emoji) => {
        try {
            const res = await api.post(`/messages/${msgId}/react`, { emoji });

            socket.emit('send_reaction', {
                groupId: groupId,
                messageId: msgId,
                reactions: res.data.reactions
            });

            setMessageList(prev => prev.map(msg =>
                msg._id === msgId ? { ...msg, reactions: res.data.reactions } : msg
            ));
        } catch (error) {
            message.error("Lỗi khi thả cảm xúc!");
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0 shadow-sm z-10">
                <div className="font-medium text-slate-800 text-sm">Chat nhóm</div>
            </div>

            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 bg-[#F8F9FA]">
                {loading ? (
                    <div className="flex justify-center mt-10"><Spin /></div>
                ) : (
                    <div className="flex flex-col gap-1.5">
                        {messageList.map((item, index) => {
                            const isMe = item.senderId?._id === myId || item.senderId === myId;
                            const authorName = item.senderId?.username || "Thành viên";
                            const avatarUrl = item.senderId?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${authorName}`;

                            const prevItem = messageList[index - 1];
                            const currentMsgTime = dayjs(item.createdAt || Date.now());
                            const prevMsgTime = prevItem ? dayjs(prevItem.createdAt || Date.now()) : null;

                            const isNewDay = !prevMsgTime || !currentMsgTime.isSame(prevMsgTime, 'day');
                            const isSameSender = prevItem && (prevItem.senderId?._id || prevItem.senderId) === (item.senderId?._id || item.senderId);
                            const isTimeClose = prevMsgTime && currentMsgTime.diff(prevMsgTime, 'minute') < 5;
                            const hideAvatarAndName = isSameSender && isTimeClose && !isNewDay;

                            const repliedMsg = item.replyToId ? messageList.find(m => m._id === (item.replyToId._id || item.replyToId)) : null;

                            // Kiểm tra xem tin nhắn này có reaction nào không để chừa khoảng trống (margin bottom)
                            const hasReactions = item.reactions && item.reactions.length > 0;

                            return (
                                <React.Fragment key={item._id || index}>
                                    {isNewDay && (
                                        <div className="flex justify-center my-6">
                                            <span className="bg-white text-slate-400 border border-slate-200 text-[11px] px-3 py-1 rounded-full font-medium shadow-sm">
                                                {formatDateDivider(item.createdAt || Date.now())}
                                            </span>
                                        </div>
                                    )}

                                    <div
                                        // 👉 THÊM 'mb-4' NẾU CÓ REACTION ĐỂ KHÔNG BỊ ĐÈ
                                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${hideAvatarAndName ? 'mt-0.5' : 'mt-4'} ${hasReactions ? 'mb-4' : ''} group`}
                                        onMouseEnter={() => setHoveredMsgId(item._id)}
                                        onMouseLeave={() => setHoveredMsgId(null)}
                                    >
                                        {!isMe && (
                                            <div className="w-8 shrink-0 mr-2 flex flex-col items-center justify-end pb-1">
                                                {!hideAvatarAndName && (
                                                    <Avatar src={avatarUrl} size={28} className="shadow-sm border border-slate-200" />
                                                )}
                                            </div>
                                        )}

                                        <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'} relative`}>
                                            {!hideAvatarAndName && (
                                                <div className="flex items-baseline gap-2 mb-1 px-1">
                                                    {!isMe && <span className="text-xs font-medium text-slate-700">{authorName}</span>}
                                                    <span className="text-[10px] text-slate-400">{currentMsgTime.format('HH:mm')}</span>
                                                </div>
                                            )}

                                            {repliedMsg && (
                                                <div className={`mb-1 px-3 py-2 text-xs rounded-lg opacity-80 cursor-pointer hover:opacity-100 transition
                                                    ${isMe ? 'bg-blue-100 text-blue-800 mr-2' : 'bg-slate-200 text-slate-600 ml-2'}`}
                                                    style={{ borderLeft: `3px solid ${isMe ? '#1677ff' : '#94a3b8'}` }}
                                                >
                                                    <div className="font-semibold mb-0.5">{repliedMsg.senderId?.username || 'Thành viên'}</div>
                                                    <div className="truncate max-w-[200px]">
                                                        {repliedMsg.type === 'image' ? '[Hình ảnh]' : repliedMsg.type === 'file' ? '[Tệp đính kèm]' : repliedMsg.message}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2">
                                                {isMe && hoveredMsgId === item._id && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Tooltip title="Trả lời"><Button type="text" size="small" shape="circle" icon={<EnterOutlined />} onClick={() => handleReplyClick(item)} /></Tooltip>
                                                    </div>
                                                )}

                                                <div className={`px-3.5 py-2.5 text-[14px] leading-relaxed shadow-sm relative
                                                    ${isMe ? 'bg-[#0084FF] text-white rounded-2xl rounded-tr-sm' : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-200'}`}
                                                >
                                                    {item.message && <span className="break-words">{item.message}</span>}

                                                    {item.type === 'image' && item.fileUrl && (
                                                        <div className="flex flex-col gap-1.5 mt-2">
                                                            <Image src={item.fileUrl} alt="Ảnh đính kèm" width={220} className="object-cover rounded-md" preview={{ mask: <div className="text-white text-xs"><PictureOutlined /> Xem</div> }} />
                                                        </div>
                                                    )}

                                                    {item.type === 'file' && item.fileUrl && (
                                                        <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-2 rounded-lg border mt-2 ${isMe ? 'bg-blue-700/50 border-blue-500 text-white' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>
                                                            <FilePdfOutlined className="text-lg" />
                                                            <span className="text-xs font-medium truncate max-w-[150px]">{item.fileName || 'Tệp đính kèm'}</span>
                                                        </a>
                                                    )}

                                                    {/* 👉 GIAO DIỆN HIỂN THỊ REACTION NẰM Ở ĐÂY */}
                                                    {hasReactions && (
                                                        <div className={`flex gap-1 absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} z-10`}>
                                                            {Object.entries(
                                                                item.reactions.reduce((acc, curr) => {
                                                                    acc[curr.emoji] = (acc[curr.emoji] || 0) + 1;
                                                                    return acc;
                                                                }, {})
                                                            ).map(([emoji, count]) => (
                                                                <div
                                                                    key={emoji}
                                                                    className="flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-full px-1.5 py-0.5 text-[11px] cursor-pointer hover:bg-slate-50"
                                                                    onClick={() => handleReact(item._id, emoji)}
                                                                >
                                                                    <span>{emoji}</span>
                                                                    {count > 1 && <span className="font-medium text-slate-500 pl-0.5">{count}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                {!isMe && hoveredMsgId === item._id && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Tooltip title="Trả lời"><Button type="text" size="small" shape="circle" icon={<EnterOutlined className="text-slate-400" />} onClick={() => handleReplyClick(item)} /></Tooltip>
                                                        <Popover
                                                            content={<div className="flex gap-2 text-xl cursor-pointer">{REACTIONS.map(emoji => <span key={emoji} className="hover:scale-125 transition-transform" onClick={() => handleReact(item._id, emoji)}>{emoji}</span>)}</div>}
                                                            trigger="hover" placement="top"
                                                        >
                                                            <Button type="text" size="small" shape="circle" icon={<SmileOutlined className="text-slate-400" />} />
                                                        </Popover>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
            </div>

            {replyingTo && (
                <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-start justify-between text-sm">
                    <div className="flex flex-col border-l-2 border-blue-500 pl-3">
                        <span className="font-medium text-blue-600 text-xs">Đang trả lời {replyingTo.senderId?.username || 'Thành viên'}</span>
                        <span className="text-slate-500 truncate max-w-[300px]">
                            {replyingTo.type === 'image' ? '[Hình ảnh]' : replyingTo.type === 'file' ? '[Tệp đính kèm]' : replyingTo.message}
                        </span>
                    </div>
                    <Button type="text" size="small" shape="circle" icon={<CloseOutlined />} onClick={() => setReplyingTo(null)} className="text-slate-400" />
                </div>
            )}

            <div className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0 items-end">
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
                <Tooltip title="Đính kèm file hoặc ảnh"><Button type="text" shape="circle" size="large" icon={<PaperClipOutlined className="text-slate-400" />} onClick={() => fileInputRef.current.click()} /></Tooltip>

                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-end px-1 focus-within:border-blue-400 focus-within:ring-1 transition-all">
                    <Input.TextArea
                        id="chatbox-input"
                        placeholder="Nhập tin nhắn..."
                        value={currentMessage}
                        onChange={handleTyping}
                        onPressEnter={(e) => { if (!e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        bordered={false}
                        className="py-2.5 text-[14px]"
                        style={{ resize: 'none', boxShadow: 'none' }}
                    />
                </div>

                <Button type="primary" shape="circle" size="large" icon={<SendOutlined className="text-sm pl-1" />} onClick={sendMessage} disabled={!currentMessage.trim()} className="bg-[#0084FF] hover:bg-blue-600 shadow-md mb-0.5" />
            </div>
        </div>
    );
};

export default ChatBox;