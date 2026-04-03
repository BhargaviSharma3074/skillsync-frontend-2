import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';
import { NotificationResponse, NotificationService } from 'src/app/core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
})
export class NotificationsComponent implements OnInit {
  private authService          = inject(AuthService);
  private notificationService  = inject(NotificationService);

  get user() { return this.authService.currentUser!; }

  notifications = signal<NotificationResponse[]>([]);
  loading       = signal(true);

  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  ngOnInit() {
    this.notificationService.getForUser(this.user.id).subscribe({
      next: (data: any) => {
        const list: NotificationResponse[] = Array.isArray(data) ? data : (data?.content ?? []);
        this.notifications.set(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  markRead(id: number) {
    this.notificationService.markRead(id).subscribe({
      next: () => this.notifications.update(list =>
        list.map(n => n.id === id ? { ...n, isRead: true } : n)
      ),
    });
  }

  markAllRead() {
    const unread = this.notifications().filter(n => !n.isRead);
    unread.forEach(n => this.markRead(n.id));
  }

  formatDate(d: string) {
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      SESSION_BOOKED:   'calendar_today',
      SESSION_ACCEPTED: 'check_circle',
      SESSION_REJECTED: 'cancel',
      SESSION_CANCELLED:'event_busy',
      REVIEW_RECEIVED:  'star',
    };
    return map[type] ?? 'notifications';
  }
}
