export interface User{
  id: number;
  name: string;
  email: string;
  role: "LEARNER" | "MENTOR" | "ADMIN"
  avatarUrl?: string;
}

export interface LoginRequest{
  email: string;
  password: string;
}

export interface RegisterRequest{
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse{
  token: string;
  user: User;
}

