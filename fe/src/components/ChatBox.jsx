import React, { useEffect, useState, useRef } from 'react';
import { Input, Button, Spin, message, Avatar, Tooltip } from 'antd';
import { SendOutlined, PaperClipOutlined, FilePdfOutlined, PictureOutlined } from '@ant-design/icons';
import socket from '../utils/socket';
import api from '../utils/api';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const ChatBox = ({ groupId }) => {
    const fileInputRef = useRef(null);
    const [messageList, setMessageList] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [typingUser, setTypingUser] = useState("");

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

        if (groupId) {
            socket.emit('join_room', groupId);
        }
    }, [groupId]);

    useEffect(() => {
        const handleReceiveMsg = (data) => {
            if (data.group === groupId || data.groupId === groupId) {
                setMessageList((list) => [...list, data]);
                setTimeout(() => scrollToBottom("smooth"), 100);
            }
        };

        socket.on('receive_message', handleReceiveMsg);
        socket.on('display_typing', (userName) => setTypingUser(userName));
        socket.on('hide_typing', () => setTypingUser(""));

        return () => {
            socket.off('receive_message', handleReceiveMsg);
            socket.off('display_typing');
            socket.off('hide_typing');
        };
    }, [groupId]);

    const sendMessage = async () => {
        if (currentMessage.trim() !== "" && groupId) {
            const messageData = {
                groupId: groupId,
                senderId: myId,
                message: currentMessage
            };

            await socket.emit('send_message', messageData);
            setCurrentMessage("");
            socket.emit('stop_typing', groupId);
            setTimeout(() => scrollToBottom("smooth"), 100);
        }
    };

    const handleTyping = (e) => {
        setCurrentMessage(e.target.value);
        if (groupId) {
            socket.emit('typing', { roomId: groupId, userName: user.username });
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                socket.emit('stop_typing', groupId);
            }, 2000);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const hideLoading = message.loading('Đang tải đính kèm...', 0);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api.post('/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const fileType = file.type.startsWith('image/') ? 'image' : 'file';

            socket.emit('send_message', {
                groupId: groupId,
                senderId: myId,
                message: fileType === 'image' ? "Đã gửi một hình ảnh" : `Đã gửi tệp: ${file.name}`,
                type: fileType,
                fileUrl: res.data.url,
                fileName: res.data.name
            });
            setTimeout(() => scrollToBottom("smooth"), 500);
        } catch (error) {
            message.error("Lỗi khi tải file lên!");
        } finally {
            hideLoading();
            e.target.value = null;
        }
    };

    // Hàm định dạng Dấu mốc ngày tháng
    const formatDateDivider = (dateString) => {
        const d = dayjs(dateString);
        if (d.isToday()) return "Hôm nay";
        if (d.isYesterday()) return "Hôm qua";
        return d.format('DD Tháng MM, YYYY');
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-lg border border-slate-200 overflow-hidden">

            {/* Header Chat */}
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                <div>
                    <div className="font-medium text-slate-800 text-sm">Chat nhóm</div>

                </div>
            </div>

            {/* Vùng hiển thị tin nhắn */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-5 bg-white">
                {loading ? (
                    <div className="flex justify-center mt-10"><Spin /></div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {messageList.map((item, index) => {
                            const isMe = item.senderId?._id === myId || item.senderId === myId;
                            const authorName = item.senderId?.username || "Thành viên";
                            const avatarUrl = item.senderId?.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${authorName}`;

                            const prevItem = messageList[index - 1];
                            const currentMsgTime = dayjs(item.createdAt);
                            const prevMsgTime = prevItem ? dayjs(prevItem.createdAt) : null;

                            const isNewDay = !prevMsgTime || !currentMsgTime.isSame(prevMsgTime, 'day');
                            const isSameSender = prevItem && (prevItem.senderId?._id || prevItem.senderId) === (item.senderId?._id || item.senderId);
                            const isTimeClose = prevMsgTime && currentMsgTime.diff(prevMsgTime, 'minute') < 5;
                            const hideAvatarAndName = isSameSender && isTimeClose && !isNewDay;

                            return (
                                <React.Fragment key={item._id || index}>

                                    {/* Dải phân cách ngày */}
                                    {isNewDay && (
                                        <div className="flex justify-center my-6">
                                            <span className="bg-slate-100 text-slate-500 text-[11px] px-3 py-1 rounded-full font-medium">
                                                {formatDateDivider(item.createdAt)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Khung tin nhắn */}
                                    <div className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'} ${hideAvatarAndName ? 'mt-0.5' : 'mt-4'}`}>

                                        {/* Avatar người khác */}
                                        {!isMe && (
                                            <div className="w-8 shrink-0 mr-2 flex flex-col items-center justify-end pb-1">
                                                {!hideAvatarAndName && (
                                                    <Avatar src={avatarUrl} size={28} className="shadow-sm" />
                                                )}
                                            </div>
                                        )}

                                        <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                                            {/* Tên và giờ */}
                                            {!hideAvatarAndName && (
                                                <div className="flex items-baseline gap-2 mb-1 px-1">
                                                    {!isMe && <span className="text-xs font-medium text-slate-700">{authorName}</span>}
                                                    <span className="text-[10px] text-slate-400">{currentMsgTime.format('HH:mm')}</span>
                                                </div>
                                            )}

                                            {/* Bong bóng Chat */}
                                            <div className={`px-3.5 py-2 text-[13.5px] leading-relaxed shadow-sm
                                                ${isMe
                                                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm'
                                                    : 'bg-slate-100 text-slate-800 rounded-2xl rounded-tl-sm border border-slate-200/60'
                                                }`}
                                            >
                                                {item.type === 'text' && <span className="break-words">{item.message}</span>}

                                                {item.type === 'image' && (
                                                    <div className="flex flex-col gap-1.5 mt-1">
                                                        <img src={item.fileUrl} alt="Đính kèm" className="max-w-[220px] max-h-[250px] object-cover rounded-md border border-black/5" />
                                                    </div>
                                                )}

                                                {item.type === 'file' && (
                                                    <a href={item.fileUrl} target="_blank" rel="noopener noreferrer"
                                                        className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors mt-1
                                                        ${isMe ? 'bg-blue-700/50 border-blue-500 hover:bg-blue-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                                        <div className={`p-1.5 rounded ${isMe ? 'bg-blue-500 text-white' : 'bg-red-50 text-red-500'}`}>
                                                            <FilePdfOutlined className="text-lg" />
                                                        </div>
                                                        <div className="flex flex-col overflow-hidden">
                                                            <span className={`text-xs font-medium truncate ${isMe ? 'text-white' : 'text-slate-700'}`}>{item.fileName}</span>
                                                            <span className={`text-[10px] ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>Nhấp để tải về</span>
                                                        </div>
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </React.Fragment>
                            );
                        })}
                    </div>
                )}

                {/* Chỉ báo đang gõ */}
                {typingUser && (
                    <div className="flex items-center gap-2 mt-4 text-xs text-slate-400 ml-10">
                        <div className="flex gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
                            <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                        </div>
                        {typingUser} đang soạn tin...
                    </div>
                )}
                <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Vùng nhập liệu */}
            <div className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0 items-end">
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />

                <Tooltip title="Đính kèm file">
                    <Button type="text" shape="circle" size="large" icon={<PaperClipOutlined className="text-slate-400" />} onClick={() => fileInputRef.current.click()} />
                </Tooltip>

                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-end px-1 focus-within:border-blue-400 focus-within:ring-1 focus-within:ring-blue-400/20 transition-all">
                    <Input.TextArea
                        placeholder="Nhập tin nhắn..."
                        value={currentMessage}
                        onChange={handleTyping}
                        onPressEnter={(e) => {
                            if (!e.shiftKey) { // Cho phép Shift+Enter để xuống dòng
                                e.preventDefault();
                                sendMessage();
                            }
                        }}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        bordered={false}
                        className="py-2.5 text-[13.5px]"
                        style={{ resize: 'none', boxShadow: 'none' }}
                    />
                </div>

                <Button
                    type="primary"
                    shape="circle"
                    size="large"
                    icon={<SendOutlined className="text-sm pl-1" />}
                    onClick={sendMessage}
                    className="bg-blue-600 hover:bg-blue-700 shadow-sm shrink-0 mb-0.5"
                    disabled={!currentMessage.trim()}
                />
            </div>
        </div>
    );
};

export default ChatBox;