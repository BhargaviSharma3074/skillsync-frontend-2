export interface UserDTO {
  id: number;
  username: string;
  name: string;
  email: string;
  role: 'LEARNER' | 'MENTOR' | 'ADMIN';
  createdAt: string;
}

// Keep User as alias for compatibility across the app
export type User = UserDTO;

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

// Backend only returns the JWT token on login/register
export interface AuthResponse {
  token: string;
}
