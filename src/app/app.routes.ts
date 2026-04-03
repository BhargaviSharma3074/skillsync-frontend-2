import { Routes } from '@angular/router';
import { authGuard, noAuthGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/welcome-page/welcome-page.component').then(m => m.WelcomeComponent)
  },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'book-session/:mentorId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/sessions/book-session/book-session.component').then(m => m.BookSessionComponent),
  },

  {
    path: '**',
    redirectTo: '',
    pathMatch: 'full'
  }
];
