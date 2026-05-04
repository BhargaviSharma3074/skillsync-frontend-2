import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError
} from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';

// Module-level flag so concurrent 401s share one refresh attempt.
let isRefreshing = false;
const refreshToken$ = new BehaviorSubject<string | null>(null);

const REFRESH_URL = '/auth/refresh';
// Auth endpoints — a 401 here means wrong credentials, not expired token.
// Never attempt a token refresh for these.
const NO_REFRESH_URLS = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh'];
// Requests that run silently in the background — network errors on these
// should not show a toast (refresh is internal, /users is the init profile fetch).
const SILENT_URLS = ['/auth/refresh', '/api/users'];

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const router = inject(Router);
  const auth   = inject(AuthService);
  const toast  = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Only attempt token refresh for 401s on authenticated requests.
      // Auth endpoints (login, register, google) return 401 for wrong credentials — not expired token.
      const isAuthEndpoint = NO_REFRESH_URLS.some(url => req.url.includes(url));
      if (err.status === 401 && !isAuthEndpoint) {
        return handle401(req, next, auth, router);
      }

      switch (err.status) {
        case 403:
          router.navigate(['/forbidden']);
          break;
        case 500:
        case 502:
        case 503:
          router.navigate(['/server-error']);
          break;
        case 0: {
          const isSilent = SILENT_URLS.some(url => req.url.includes(url));
          if (!isSilent) {
            toast.error('Network error. Please check your internet connection.');
          }
          break;
        }
      }

      return throwError(() => err);
    })
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshToken$.next(null);   // signal "refresh in progress" to waiting requests

    return auth.refresh().pipe(
      switchMap((newToken: string) => {
        isRefreshing = false;
        refreshToken$.next(newToken);
        return next(addToken(req, newToken));
      }),
      catchError(refreshErr => {
        isRefreshing = false;
        auth.logout();
        router.navigate(['/login']);
        return throwError(() => refreshErr);
      })
    );
  }

  // Another request is already refreshing — wait for the new token then retry.
  return refreshToken$.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap(token => next(addToken(req, token)))
  );
}
