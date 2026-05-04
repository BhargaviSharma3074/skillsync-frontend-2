// import { HttpClient } from '@angular/common/http';
// import { inject, Injectable } from '@angular/core';
// import { Router } from '@angular/router';
// import {
//   BehaviorSubject,
//   catchError,
//   Observable,
//   switchMap,
//   tap,
//   throwError,
// } from 'rxjs';
// import {
//   AuthResponse,
//   LoginRequest,
//   RegisterRequest,
//   UserDTO,
// } from './auth.model';

// @Injectable({ providedIn: 'root' })
// export class AuthService {
//   private http = inject(HttpClient);
//   private router = inject(Router);

//   private baseUrl = 'https://skillsync.mooo.com/api';

//   private currentUserSubject = new BehaviorSubject<UserDTO | null>(null);
//   currentUser$ = this.currentUserSubject.asObservable();

//   /** Emits the latest valid token so the refresh interceptor can wait on it. */
//   private tokenSubject = new BehaviorSubject<string | null>(
//     localStorage.getItem('token'),
//   );
//   token$ = this.tokenSubject.asObservable();

//   get currentUser() {
//     return this.currentUserSubject.value;
//   }
//   get isLoggedIn() {
//     return !!this.currentUserSubject.value;
//   }
//   get token() {
//     return this.tokenSubject.value;
//   }

//   /** POST /auth/login → store token → GET /users → store user profile */
//   login(payload: LoginRequest): Observable<UserDTO> {
//     return this.http
//       .post<AuthResponse>(`${this.baseUrl}/auth/login`, payload)
//       .pipe(
//         tap((res) => this.storeToken(res.token)),
//         switchMap(() => this.fetchProfile()),
//         catchError((err) => {
//           const message = err.error?.message || err.message || 'Login failed';
//           return throwError(() => new Error(message));
//         }),
//       );
//   }

//   /** POST /auth/register → store token → GET /users → store user profile */
//   register(payload: RegisterRequest): Observable<UserDTO> {
//     return this.http
//       .post<AuthResponse>(`${this.baseUrl}/auth/register`, payload)
//       .pipe(
//         tap((res) => this.storeToken(res.token)),
//         switchMap(() => this.fetchProfile()),
//         catchError((err) => {
//           const message =
//             err.error?.message || err.message || 'Registration failed';
//           return throwError(() => new Error(message));
//         }),
//       );
//   }

//   /** GET /users — gateway injects X-User-Id from the stored JWT */
//   fetchProfile(): Observable<UserDTO> {
//     return this.http
//       .get<UserDTO>(`${this.baseUrl}/users`)
//       .pipe(tap((user) => this.currentUserSubject.next(user)));
//   }

//   updateProfile(
//     payload: Partial<Pick<UserDTO, 'username' | 'name' | 'email'>>,
//   ): Observable<UserDTO> {
//     return this.http
//       .put<UserDTO>(`${this.baseUrl}/users`, payload)
//       .pipe(tap((user) => this.currentUserSubject.next(user)));
//   }

//   updateProfilePicture(pictureUrl: string): Observable<UserDTO> {
//     return this.http
//       .put<UserDTO>(`${this.baseUrl}/users/me/picture`, { pictureUrl })
//       .pipe(tap((user) => this.currentUserSubject.next(user)));
//   }

//   /** POST /auth/google — send Google ID token, receive JWT */
//   googleLogin(idToken: string): Observable<UserDTO> {
//     return this.http
//       .post<AuthResponse>(`${this.baseUrl}/auth/google`, { idToken })
//       .pipe(
//         tap((res) => this.storeToken(res.token)),
//         switchMap(() => this.fetchProfile()),
//         catchError((err) => {
//           const message =
//             err.error?.message || err.message || 'Google login failed';
//           return throwError(() => new Error(message));
//         }),
//       );
//   }

//   forgotPassword(email: string): Observable<void> {
//     return this.http.post<void>(`${this.baseUrl}/auth/forgot-password`, {
//       email,
//     });
//   }

//   resetPassword(token: string, newPassword: string): Observable<void> {
//     return this.http.post<void>(`${this.baseUrl}/auth/reset-password`, {
//       token,
//       newPassword,
//     });
//   }
//   /** POST /auth/refresh — sends current token, receives a new one. */
//   refresh(): Observable<string> {
//     const currentToken = this.tokenSubject.value;
//     return this.http
//       .post<AuthResponse>(`${this.baseUrl}/auth/refresh`, null, {
//         headers: { Authorization: `Bearer ${currentToken}` },
//       })
//       .pipe(
//         tap((res) => this.storeToken(res.token)),
//         switchMap((res) => [res.token]),
//       );
//   }

//   logout(): void {
//     this.currentUserSubject.next(null);
//     localStorage.removeItem('token');
//     this.router.navigate(['/login']);
//   }

//   private storeToken(token: string): void {
//     localStorage.setItem('token', token);
//     this.tokenSubject.next(token);
//   }
// }

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  Observable,
  switchMap,
  tap,
  throwError,
} from 'rxjs';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  UserDTO,
} from './auth.model';
import { environment } from 'src/environments/environment';

export type RefreshState = 'idle' | 'refreshing';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private baseUrl = environment.apiUrl;

  private currentUserSubject = new BehaviorSubject<UserDTO | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  /** Emits the latest valid token so the refresh interceptor can wait on it. */
  private tokenSubject = new BehaviorSubject<string | null>(
    localStorage.getItem('token'),
  );
  token$ = this.tokenSubject.asObservable();

  get currentUser() {
    return this.currentUserSubject.value;
  }
  get isLoggedIn() {
    return !!this.currentUserSubject.value;
  }
  get token() {
    return this.tokenSubject.value;
  }

  /** POST /auth/login → store token → GET /users → store user profile */
  login(payload: LoginRequest): Observable<UserDTO> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, payload)
      .pipe(
        tap((res) => this.storeToken(res.token)),
        switchMap(() => this.fetchProfile()),
        catchError((err) => {
          const message = err.error?.message || err.message || 'Login failed';
          return throwError(() => new Error(message));
        }),
      );
  }

  /** POST /auth/register → store token → GET /users → store user profile */
  register(payload: RegisterRequest): Observable<UserDTO> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, payload)
      .pipe(
        tap((res) => this.storeToken(res.token)),
        switchMap(() => this.fetchProfile()),
        catchError((err) => {
          const message =
            err.error?.message || err.message || 'Registration failed';
          return throwError(() => new Error(message));
        }),
      );
  }

  /** GET /users — gateway injects X-User-Id from the stored JWT */
  fetchProfile(): Observable<UserDTO> {
    return this.http
      .get<UserDTO>(`${this.baseUrl}/users`)
      .pipe(tap((user) => this.currentUserSubject.next(user)));
  }

  updateProfile(
    payload: Partial<Pick<UserDTO, 'username' | 'name' | 'email'>>,
  ): Observable<UserDTO> {
    return this.http
      .put<UserDTO>(`${this.baseUrl}/users`, payload)
      .pipe(tap((user) => this.currentUserSubject.next(user)));
  }

  updateProfilePicture(pictureUrl: string): Observable<UserDTO> {
    return this.http
      .put<UserDTO>(`${this.baseUrl}/users/me/picture`, { pictureUrl })
      .pipe(tap((user) => this.currentUserSubject.next(user)));
  }

  /** POST /auth/google — send Google ID token, receive JWT */
  googleLogin(idToken: string): Observable<UserDTO> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/google`, { idToken })
      .pipe(
        tap((res) => this.storeToken(res.token)),
        switchMap(() => this.fetchProfile()),
        catchError((err) => {
          const message =
            err.error?.message || err.message || 'Google login failed';
          return throwError(() => new Error(message));
        }),
      );
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/forgot-password`, {
      email,
    });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/reset-password`, {
      token,
      newPassword,
    });
  }

  /** POST /auth/refresh — sends current token, receives a new one. */
  refresh(): Observable<string> {
    const currentToken = this.tokenSubject.value;
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/refresh`, null, {
        headers: { Authorization: `Bearer ${currentToken}` },
      })
      .pipe(
        tap((res) => this.storeToken(res.token)),
        switchMap((res) => [res.token]),
      );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    this.tokenSubject.next(null);
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  private storeToken(token: string): void {
    localStorage.setItem('token', token);
    this.tokenSubject.next(token);
  }
}
