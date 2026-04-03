import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, catchError, Observable, switchMap, tap, throwError } from "rxjs";
import { AuthResponse, LoginRequest, RegisterRequest, UserDTO } from "./auth.model";

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private baseUrl = "http://34.14.151.244/api";

  private currentUserSubject = new BehaviorSubject<UserDTO | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  get currentUser() { return this.currentUserSubject.value; }
  get isLoggedIn()  { return !!this.currentUserSubject.value; }
  get token()       { return localStorage.getItem('token'); }

  /** POST /auth/login → store token → GET /users → store user profile */
  login(payload: LoginRequest): Observable<UserDTO> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, payload).pipe(
      tap(res => localStorage.setItem('token', res.token)),
      switchMap(() => this.fetchProfile()),
      catchError(err => {
        const message = err.error?.message || err.message || "Login failed";
        return throwError(() => new Error(message));
      })
    );
  }

  /** POST /auth/register → store token → GET /users → store user profile */
  register(payload: RegisterRequest): Observable<UserDTO> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, payload).pipe(
      tap(res => localStorage.setItem('token', res.token)),
      switchMap(() => this.fetchProfile()),
      catchError(err => {
        const message = err.error?.message || err.message || "Registration failed";
        return throwError(() => new Error(message));
      })
    );
  }

  /** GET /users — gateway injects X-User-Id from the stored JWT */
  fetchProfile(): Observable<UserDTO> {
    return this.http.get<UserDTO>(`${this.baseUrl}/users`).pipe(
      tap(user => this.currentUserSubject.next(user))
    );
  }

  updateProfile(payload: Partial<Pick<UserDTO, 'username' | 'name' | 'email'>>): Observable<UserDTO> {
    return this.http.put<UserDTO>(`${this.baseUrl}/users`, payload).pipe(
      tap(user => this.currentUserSubject.next(user))
    );
  }

  logout(): void {
    this.currentUserSubject.next(null);
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
