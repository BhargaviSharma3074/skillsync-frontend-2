import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { BehaviorSubject, catchError, Observable, tap, throwError } from "rxjs";
import { LoginRequest, User, AuthResponse, RegisterRequest } from "./auth.model";

@Injectable({providedIn: 'root'})
export class AuthService{
  private http = inject(HttpClient);
  private router = inject(Router);

  private baseUrl = "http://localhost:9090";
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  currentUser$ = this.currentUserSubject.asObservable();

  get currentUser() {return this.currentUserSubject.value};
  get isLoggedIn() {return !!this.currentUserSubject.value};

  login(payload: LoginRequest): Observable<AuthResponse>{
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, payload).pipe(
      tap(res => {
        this.currentUserSubject.next(res.user);
        localStorage.setItem('token', res.token);
        this.router.navigate(['/dashboard']);
      }),
      catchError(err => {
        const message = err.error?.message || "Login failed";
        return throwError(() => new Error(message));
      })
    );
  }

  register(payload: RegisterRequest): Observable<AuthResponse>{
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, payload).pipe(
      tap(res => {
        this.currentUserSubject.next(res.user);
        localStorage.setItem('token', res.token);
        this.router.navigate(['/dashboard']);
      })
    )
  }

  logout(): void{
    this.currentUserSubject.next(null);
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
