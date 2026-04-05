import { useState, useEffect } from "react";
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';

const Objectives = () => {
    const [objectives, setObjectives] = useState([]);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        type: 'personal',
        endDate: ''
    });

    const navigate = useNavigate();

    //load danh sach
    useEffect(() => {
        fetchObjectives();
    }, []);

    const fetchObjectives = async () => {
        try {
            const response = await api.get('/objectives');
            setObjectives(response.data);
        } catch (error) {

        }
    };

    //xu ly nhap 
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        })
    };

    //tao muc tieu moi
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/objectives', formData);
            setObjectives([
                response.data,
                ...objectives
            ]);

            //reset form
            setFormData({
                title: '',
                description: '',
                type: 'personal',
                endDate: ''
            });
            alert("Đã tạo thành công");
        } catch (error) {

        }
    };

    //xoa muc tieu
    const handleDelete = async (id) => {
        if (!window.confirm('Bạn chắc muốn xóa mục tiêu này chứ? ')) return
        try {
            await api.delete(`/objectives/${id}`);
            setObjectives(objectives.filter(obj => obj._id !== id)); // loc obj theo id
        } catch (error) {

        }
    }

    return (
        <div style={{
            padding: '40px',
            maxWidth: '800px',
            margin: '0 auto',
            fontFamily: 'Arial, sans-serif'
        }}>

            {/* header */}
            <div style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Quản lý</h2>
                <Link to="/" style={{ textDecoration: 'none', color: '#0edbff', }}>
                    ← Back
                </Link>
            </div>

            {/* form tao moi */}
            <div style={{
                background: '#f5f5f5',
                padding: '20px',
                borderRadius: '8px',
                marginBottom: '30px'
            }}>
                <h3 style={{ marginTop: 0 }}>Thêm mục tiêu mới</h3>
                <form onSubmit={handleSubmit} style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                }}>
                    <input
                        type='text' name='title' placeholder="Tên mục tiêu..."
                        value={formData.title} onChange={handleChange} required
                        style={{
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid #ccc'
                        }}
                    />

                    <textarea
                        name="description" placeholder="Mô tả chi tiết..."
                        value={formData.description} onChange={handleChange}
                        style={{
                            padding: '10px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            minHeight: '60px'
                        }}
                    />

                    <div style={{
                        display: 'flex',
                        gap: '15px'
                    }}>
                        <select
                            name="type" value={formData.type} onChange={handleChange}
                            style={{
                                padding: '10px',
                                flex: 1,
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}
                        >
                            <option value="personal">Cá nhân</option>
                            <option value="company">Công ty</option>
                        </select>

                        <input
                            type="date" name="endDate"
                            value={formData.endDate} onChange={handleChange}
                            style={{
                                padding: '10px',
                                flex: 1,
                                borderRadius: '4px',
                                border: '1px solid #ccc'
                            }}
                        />
                    </div>
                    <button type="submit" style={{
                        padding: '12px',
                        background: '#1890ff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                    }}>
                        Tạo mục tiêu
                    </button>
                </form>
            </div>

            {/* Danh sach hien thi */}
            <div>
                {objectives.map((obj) => (
                    <div key={obj._id} style={{
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '15px',
                        background: 'white',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'start'
                        }}>
                            <div>
                                <span style={{
                                    background: obj.type === 'company' ? '#e6f7ff' : '#f6ffed',
                                    color: obj.type === 'company' ? '#1890ff' : '#52c41a',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '12px',
                                    fontWeight: 'bold'
                                }}>
                                    {obj.type === 'company' ? 'WORK' : 'PERSONAL'}
                                </span>
                                <h3 style={{
                                    margin: '10px 0 5px',
                                    color: '#333'
                                }}>{obj.title}</h3>
                                <p style={{
                                    margin: '0',
                                    color: '#666',
                                    fontSize: '14px'
                                }}>{obj.description}</p>
                                {obj.endDate && (
                                    <div style={{
                                        fontSize: '12px',
                                        color: '#888',
                                        marginTop: '5px'
                                    }}>
                                        Deadline: {new Date(obj.endDate).toLocaleDateString('vi-VN')}
                                    </div>
                                )}
                            </div>

                            <button onClick={() => handleDelete(obj._id)} style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '20px'
                            }}>
                                🗑️
                            </button>
                        </div>

                        <div style={{ marginTop: '15px' }}>
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '12px',
                                marginBottom: '5px'
                            }}>
                                <span>Tiến độ</span>
                                <span>{obj.progress}%</span>
                            </div>
                            <div style={{
                                width: '100%',
                                background: '#eee',
                                height: '8px',
                                borderRadius: '4px'
                            }}>
                                <div style={{
                                    width: `${obj.progress}%`,
                                    background: '#1890ff',
                                    height: '100%',
                                    borderRadius: '4px',
                                    transition: 'width 0.3s ease'
                                }}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

        </div>


    );
};

export default Objectives;