import React, { useEffect, useState, useRef } from 'react';
import { Card, Input, Button, List, Typography, Badge, Avatar, Spin, message } from 'antd';
import { SendOutlined, MessageOutlined, CloseOutlined, ArrowLeftOutlined, UserOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
import io from 'socket.io-client';
import api from '../utils/api';

const { Text } = Typography;
const socket = io('http://localhost:5000');

const ChatBox = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState('list');

    // Data states
    const [conversations, setConversations] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const [activeChat, setActiveChat] = useState(null);
    const [messageList, setMessageList] = useState([]);
    const [currentMessage, setCurrentMessage] = useState("");
    const [unreadCount, setUnreadCount] = useState(0);

    const [typingUser, setTypingUser] = useState("");
    let typingTimeout = useRef(null);
    const messagesEndRef = useRef(null);

    const user = JSON.parse(localStorage.getItem('user')) || {};
    const myId = user._id || user.id;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };


    const fetchConversations = async () => {
        try {
            const res = await api.get('/conversations');
            setConversations(res.data);

            res.data.forEach(conv => {
                socket.emit('join_room', conv._id);
            });

        } catch (error) {
            console.error("Lỗi tải danh sách phòng chat");
        }
    };

    useEffect(() => {
        fetchConversations();
    }, []);

    //xoa cham do khi mo chat
    useEffect(() => {
        if (isOpen) setUnreadCount(0);
    }, [isOpen]);

    // tim kiem
    const handleSearch = async (e) => {
        const keyword = e.target.value;
        if (!keyword.trim()) {
            setIsSearching(false);
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        try {
            const res = await api.get(`/users/search?search=${keyword}`);
            setSearchResults(res.data);
        } catch (error) {
            console.error("Lỗi tìm kiếm user");
        }
    };

    const startChat = async (targetUser) => {
        try {
            const res = await api.post('/conversations', { targetUserId: targetUser._id });
            const conversation = res.data;

            setActiveChat(conversation);
            setView('chat');
            fetchMessages(conversation._id);

            socket.emit('join_room', conversation._id);
        } catch (error) {
            message.error("Không thể tạo phòng chat!");
        }
    };

    const fetchMessages = async (conversationId) => {
        try {
            const res = await api.get(`/messages/${conversationId}`);
            setMessageList(res.data);
            setTimeout(scrollToBottom, 100);
        } catch (error) {
            console.error("Lỗi tải tin nhắn");
        }
    };

    useEffect(() => {
        const handleReceiveMsg = (data) => {
            if (activeChat && data.conversationId === activeChat._id) {
                setMessageList((list) => [...list, data]);
                setTimeout(scrollToBottom, 100);
            }

            if (!isOpen || (isOpen && (!activeChat || data.conversationId !== activeChat._id))) {
                setUnreadCount((prev) => prev + 1);
            }

            fetchConversations();
        };

        socket.on('receive_message', handleReceiveMsg);
        socket.on('display_typing', (userName) => setTypingUser(userName));
        socket.on('hide_typing', () => setTypingUser(""));

        return () => {
            socket.off('receive_message', handleReceiveMsg);
            socket.off('display_typing');
            socket.off('hide_typing');
        };
    }, [isOpen, activeChat]);

    const sendMessage = async () => {
        if (currentMessage.trim() !== "" && activeChat) {
            const messageData = {
                conversationId: activeChat._id,
                senderId: myId,
                message: currentMessage
            };

            await socket.emit('send_message', messageData);
            setCurrentMessage("");
            socket.emit('stop_typing', activeChat._id);
        }
    };

    const handleTyping = (e) => {
        setCurrentMessage(e.target.value);
        if (activeChat) {
            socket.emit('typing', { conversationId: activeChat._id, userName: user.username });
            if (typingTimeout.current) clearTimeout(typingTimeout.current);
            typingTimeout.current = setTimeout(() => {
                socket.emit('stop_typing', activeChat._id);
            }, 2000);
        }
    };

    const getChatName = (conversation) => {
        if (!conversation) return "";

        //lay ten nhom
        if (conversation.type === 'group') {
            return conversation.name || "Nhóm làm việc";
        }

        //lay ten nguoi doi dien neu la chat 1-1
        const otherUser = conversation.participants.find(p => p._id !== myId);
        return otherUser ? otherUser.username : "Người dùng";
    };

    if (!isOpen) {
        return (
            <Badge count={unreadCount} className="fixed bottom-6 right-6 z-50">
                <Button
                    type="primary" shape="circle" icon={<MessageOutlined />} size="large"
                    className="shadow-lg h-14 w-14 flex items-center justify-center"
                    onClick={() => setIsOpen(true)}
                />
            </Badge>
        );
    }

    return (
        <Card
            title={
                <div className="flex justify-between items-center">
                    {view === 'chat' ? (
                        <div className="flex items-center gap-2 cursor-pointer hover:text-blue-500 transition" onClick={() => setView('list')}>
                            <ArrowLeftOutlined /> <span className="font-semibold truncate w-40">{getChatName(activeChat)}</span>
                        </div>
                    ) : (
                        <span>Chat Box</span>
                    )}
                    <Button type="text" icon={<CloseOutlined />} onClick={() => setIsOpen(false)} />
                </div>
            }
            className="fixed bottom-6 right-6 w-80 shadow-2xl z-50 flex flex-col rounded-xl overflow-hidden border-0 ring-1 ring-gray-100"
            styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '420px' } }}
        >
            {view === 'list' && (
                <div className="flex flex-col h-full bg-white">
                    <div className="p-3 border-b">
                        <Input
                            prefix={<SearchOutlined className="text-gray-400" />}
                            placeholder="Tìm kiếm người dùng..."
                            onChange={handleSearch}
                            allowClear
                        />
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {isSearching ? (
                            <List
                                dataSource={searchResults}
                                renderItem={(item) => (
                                    <List.Item className="cursor-pointer hover:bg-gray-50 px-4 transition" onClick={() => startChat(item)}>
                                        <List.Item.Meta
                                            avatar={<Avatar style={{ backgroundColor: '#1677ff' }} icon={<UserOutlined />} />}
                                            title={item.username}
                                            description={<span className="text-xs text-gray-400">{item.email}</span>}
                                        />
                                    </List.Item>
                                )}
                                locale={{ emptyText: 'Không tìm thấy ai' }}
                            />
                        ) : (
                            <List
                                dataSource={conversations}
                                renderItem={(item) => (
                                    <List.Item className="cursor-pointer hover:bg-gray-50 px-4 transition" onClick={() => {
                                        setActiveChat(item);
                                        setView('chat');
                                        socket.emit('join_room', item._id);
                                        fetchMessages(item._id);
                                    }}>
                                        <List.Item.Meta
                                            avatar={
                                                <Avatar
                                                    style={{ backgroundColor: item.type === 'group' ? '#f56a00' : '#87d068' }}
                                                    icon={item.type === 'group' ? <TeamOutlined /> : <UserOutlined />}
                                                />
                                            }
                                            title={getChatName(item)}
                                            description={
                                                <span className="text-xs text-gray-400 truncate block max-w-[200px]">
                                                    {item.lastMessage ? item.lastMessage.message : "Chưa có tin nhắn"}
                                                </span>
                                            }
                                        //hien thi ten khi gui tin nhan
                                        // description={
                                        //     <span className="text-xs text-gray-400 truncate block max-w-[200px]">
                                        //         {item.lastMessage
                                        //             ? `${item.lastMessage.senderId?.username || 'Ai đó'}: ${item.lastMessage.message}`
                                        //             : "Chưa có tin nhắn"
                                        //         }
                                        //     </span>
                                        // }
                                        />
                                    </List.Item>
                                )}
                                locale={{ emptyText: 'Chưa có cuộc hội thoại nào' }}
                            />
                        )}
                    </div>
                </div>
            )}

            {view === 'chat' && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                        <List
                            dataSource={messageList}
                            renderItem={(item) => {
                                //xac dinh tin nhan cua minh
                                const isMe = item.senderId?._id === myId || item.senderId === myId;
                                const authorName = item.senderId?.username || "Khách";

                                return (
                                    <div className={`mb-3 flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                        <Text className="text-[10px] text-gray-400 mb-1">{authorName}</Text>
                                        <div className={`px-3 py-2 rounded-xl max-w-[85%] text-sm ${isMe ? 'bg-blue-500 text-white rounded-br-sm shadow-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm'}`}>
                                            {item.message}
                                        </div>
                                    </div>
                                );
                            }}
                        />
                        {typingUser && <div className="text-xs text-gray-400 italic animate-pulse mt-2 ml-2">{typingUser} đang gõ...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-3 bg-white border-t flex gap-2">
                        <Input
                            placeholder="Nhập tin nhắn..."
                            value={currentMessage}
                            onChange={handleTyping}
                            onPressEnter={sendMessage}
                        />
                        <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} />
                    </div>
                </>
            )}
        </Card>
    );
};

export default ChatBox;