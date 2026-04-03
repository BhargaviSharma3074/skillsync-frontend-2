import { HttpInterceptorFn } from "@angular/common/http";

const PUBLIC_URLS = ['/auth/login', '/auth/register'];

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('token');
  const isPublic = PUBLIC_URLS.some(url => req.url.includes(url));

  if (token && !isPublic) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req);
};
