import { AsyncPipe, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { NotificationWebSocketService } from 'src/app/core/services/notification-websocket.service';
import { SidebarComponent } from 'src/app/core/layout/sidebar/sidebar.component';

const PAGE_LABELS: Record<string, { label: string; icon: string }> = {
  overview:         { label: 'Dashboard',        icon: 'dashboard' },
  'find-mentors':   { label: 'Find Mentors',      icon: 'manage_search' },
  sessions:         { label: 'My Sessions',       icon: 'event_note' },
  groups:           { label: 'Learning Groups',   icon: 'groups' },
  reviews:          { label: 'Reviews',           icon: 'rate_review' },
  profile:          { label: 'My Profile',        icon: 'person' },
  notifications:    { label: 'Notifications',     icon: 'notifications' },
  settings:         { label: 'Settings',          icon: 'settings' },
  'admin-users':    { label: 'User Management',   icon: 'manage_accounts' },
  'admin-approvals':{ label: 'Mentor Approvals',  icon: 'admin_panel_settings' },
  'admin-analytics':{ label: 'Analytics',         icon: 'analytics' },
  'admin-groups':   { label: 'Group Management',  icon: 'groups' },
  'skill-catalog':  { label: 'Skill Catalog',     icon: 'library_books' },
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AsyncPipe,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    SidebarComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  authService          = inject(AuthService);
  private notifService = inject(NotificationService);
  private wsService    = inject(NotificationWebSocketService);

  activePage = 'overview';
  unreadCount = signal(0);
  mobileSidebarOpen = signal(false);

  userInitials = computed(() => {
    const u = this.authService.currentUser;
    const name = u?.name || u?.username || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  pageInfo = computed(() => PAGE_LABELS[this.activePage] ?? { label: 'SkillSync', icon: 'dashboard' });

  ngOnInit() {
    if (!this.authService.currentUser && this.authService.token) {
      this.authService.fetchProfile().subscribe();
    }
    const userId = this.authService.currentUser?.id;
    if (userId) {
      // Load initial unread count from REST
      this.notifService.getForUser(userId).subscribe({
        next: (data: any) => {
          const list = Array.isArray(data) ? data : (data?.content ?? []);
          this.unreadCount.set(list.filter((n: any) => !n.isRead).length);
        },
        error: () => {},
      });

      // Open WebSocket for real-time notifications
      this.wsService.connect();
      this.wsService.notifications$.subscribe(() => {
        if (this.activePage !== 'notifications') {
          this.unreadCount.update(c => c + 1);
        }
      });
    }
  }

  ngOnDestroy() {
    this.wsService.disconnect();
  }

  navigateTo(page: string) {
    this.activePage = page;
    if (page === 'notifications') this.unreadCount.set(0);
    this.mobileSidebarOpen.set(false);
  }

  get isLearner() { return this.authService.currentUser?.role?.toUpperCase().includes('LEARNER'); }
  get isMentor()  { return this.authService.currentUser?.role?.toUpperCase().includes('MENTOR'); }
  get isAdmin()   { return this.authService.currentUser?.role?.toUpperCase().includes('ADMIN'); }
}
