import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Navbar from './components/Navbar';
import Popup from './components/Popup';
import Home from './pages/Home';
import Manage from './pages/Manage';
import Admin from './pages/Admin';
import { useAppDispatch } from './context/AppContext';
import { authMe } from './api/api';

export default function App() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const token = localStorage.getItem('cf_token');
    if (token) {
      authMe(token)
        .then(user => dispatch({ type: 'SET_USER', payload: user }))
        .catch(() => localStorage.removeItem('cf_token'));
    }
  }, []);

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/"              element={<Home />} />
        <Route path="/manage/:token" element={<Manage />} />
        <Route path="/admin"         element={<Admin />} />
      </Routes>
      <Popup />
    </>
  );
}
