import { useNavigate } from 'react-router-dom';
import AdminPanel from '../pages/AdminPanel';

export default function AdminWrapper() {
  const navigate = useNavigate();
  
  return (
    <AdminPanel 
      onBack={() => navigate('/')} 
    />
  );
}
