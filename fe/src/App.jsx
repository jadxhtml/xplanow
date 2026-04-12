import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import Activities from './pages/Activities';
import Overview from './pages/Overview';
import ChatBox from './components/ChatBox';
import Groups from './pages/Groups';
import GroupDetail from './pages/GroupDetail';
import Workspace from './pages/Workspace';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path='/register' element={<Register />} />
        <Route path="/" element={
          <>
            <Workspace />
          </>
        }>

          <Route index element={<Overview />} />
          <Route path="objectives" element={<Dashboard />} />
          <Route path="groups" element={<Groups />} />
          <Route path="groups/:id" element={<GroupDetail />} />
          <Route path="activities" element={<Activities />} />
          <Route path="chat" element={<div>Trang Chat Realtime</div>} />
          <Route path="profile" element={<div>Trang Cá nhân</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;