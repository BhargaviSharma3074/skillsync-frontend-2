import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

const PUBLIC_URLS = ['/auth/login', '/auth/register', '/auth/refresh'];

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;
  const isPublic = PUBLIC_URLS.some((url) => req.url.includes(url));

  if (token && !isPublic) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(req);
};
