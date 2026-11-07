import React, { createContext, useContext, useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

export interface UserInfo {
  id: number;
  phone: string;
  fullName: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  customerWalletBalance: number;
  driverWalletBalance: number;
}

export interface DriverProfileInfo {
  id: number;
  cccdNumber: string;
  vehiclePlate: string;
  cashOnHand: number;
  online: boolean;
  verificationStatus: 'PENDING_INTERVIEW' | 'APPROVED' | 'REJECTED' | 'BLACKLISTED';
  interviewNotes?: string;
  ratingAvg: number;
  totalRatings: number;
  strikeCount: number;
  currentLat?: number;
  currentLng?: number;
}

interface AuthContextType {
  user: UserInfo | null;
  driverProfile: DriverProfileInfo | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<UserInfo>;
  registerCustomer: (phone: string, fullName: string, password: string) => Promise<UserInfo>;
  registerDriver: (payload: Record<string, unknown>) => Promise<UserInfo>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [driverProfile, setDriverProfile] = useState<DriverProfileInfo | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('sgn_token'));
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('sgn_token');
    if (!savedToken) {
      setUser(null);
      setDriverProfile(null);
      setLoading(false);
      return;
    }
    try {
      const res = await axiosClient.get('/auth/me');
      setUser(res.data.user);
      setDriverProfile(res.data.driverProfile || null);
    } catch {
      localStorage.removeItem('sgn_token');
      setToken(null);
      setUser(null);
      setDriverProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (phone: string, password: string): Promise<UserInfo> => {
    const res = await axiosClient.post('/auth/login', { phone, password });
    const jwt = res.data.token;
    localStorage.setItem('sgn_token', jwt);
    setToken(jwt);
    setUser(res.data.user);
    setDriverProfile(res.data.driverProfile || null);
    return res.data.user;
  };

  const registerCustomer = async (phone: string, fullName: string, password: string): Promise<UserInfo> => {
    const res = await axiosClient.post('/auth/register', { phone, fullName, password });
    const jwt = res.data.token;
    localStorage.setItem('sgn_token', jwt);
    setToken(jwt);
    setUser(res.data.user);
    setDriverProfile(null);
    return res.data.user;
  };

  const registerDriver = async (payload: Record<string, unknown>): Promise<UserInfo> => {
    const res = await axiosClient.post('/auth/register-driver', payload);
    const jwt = res.data.token;
    localStorage.setItem('sgn_token', jwt);
    setToken(jwt);
    setUser(res.data.user);
    setDriverProfile(res.data.driverProfile || null);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('sgn_token');
    setToken(null);
    setUser(null);
    setDriverProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        driverProfile,
        token,
        loading,
        login,
        registerCustomer,
        registerDriver,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
