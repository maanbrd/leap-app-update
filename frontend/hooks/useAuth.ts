import { useState, useEffect } from 'react';

export interface User {
  id: string;
  name: string;
  role: 'user' | 'manager';
  createdAt: Date;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pobierz dane użytkownika z localStorage
    const storedUser = localStorage.getItem('leap_user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser({
          ...userData,
          createdAt: new Date(userData.createdAt)
        });
      } catch (error) {
        console.error('Error parsing user data:', error);
        createNewUser();
      }
    } else {
      createNewUser();
    }
    setLoading(false);
  }, []);

  const createNewUser = () => {
    const newUser: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: 'Użytkownik',
      role: 'user',
      createdAt: new Date()
    };
    
    localStorage.setItem('leap_user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      localStorage.setItem('leap_user', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  };

  return { user, loading, updateUser };
}