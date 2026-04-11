import { Routes } from '@angular/router';
import { authGuard, adminGuard, noAuthGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
  {
    path: 'login',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'register',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/register/register.component').then(
        (m) => m.RegisterComponent,
      ),
  },
  {
    path: 'forgot-password',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'reset-password',
    canActivate: [noAuthGuard],
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(
        (m) => m.DashboardComponent,
      ),
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./features/dashboard/overview/overview.component').then(
            (m) => m.OverviewComponent,
          ),
      },
      {
        path: 'find-mentors',
        loadComponent: () =>
          import('./features/mentors/find-mentors/find-mentors.component').then(
            (m) => m.FindMentorsComponent,
          ),
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./features/sessions/my-sessions.component').then(
            (m) => m.MySessionsComponent,
          ),
      },
      {
        path: 'groups',
        loadComponent: () =>
          import('./features/groups/groups.component').then(
            (m) => m.GroupsComponent,
          ),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./features/reviews/reviews.component').then(
            (m) => m.ReviewsComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile.component').then(
            (m) => m.ProfileComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications.component').then(
            (m) => m.NotificationsComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.component').then(
            (m) => m.SettingsComponent,
          ),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          { path: '', redirectTo: 'overview', pathMatch: 'full' },
          {
            path: 'overview',
            loadComponent: () =>
              import('./features/admin/admin-overview/admin-overview.component').then(
                (m) => m.AdminOverviewComponent,
              ),
          },
          {
            path: 'users',
            loadComponent: () =>
              import('./features/admin/user-management/user-management.component').then(
                (m) => m.UserManagementComponent,
              ),
          },
          {
            path: 'approvals',
            loadComponent: () =>
              import('./features/admin/mentor-approvals/mentor-approvals.component').then(
                (m) => m.MentorApprovalsComponent,
              ),
          },
          {
            path: 'groups',
            loadComponent: () =>
              import('./features/admin/admin-group-management/admin-group-management.component').then(
                (m) => m.AdminGroupManagementComponent,
              ),
          },
          {
            path: 'skill-catalog',
            loadComponent: () =>
              import('./features/admin/skill-catalog/skill-catalog.component').then(
                (m) => m.SkillCatalogComponent,
              ),
          },
          {
            path: 'analytics',
            loadComponent: () =>
              import('./features/admin/platform-analytics/platform-analytics.component').then(
                (m) => m.PlatformAnalyticsComponent,
              ),
          },
        ],
      },
    ],
  },
  {
    path: 'book-session/:mentorId',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/sessions/book-session/book-session.component').then(
        (m) => m.BookSessionComponent,
      ),
  },
  { path: '**', redirectTo: '/login', pathMatch: 'full' },
];
