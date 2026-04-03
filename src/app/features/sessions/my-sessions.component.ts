import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';
import { SessionResponse, SessionService, SessionStatus } from 'src/app/core/services/session.service';

type FilterTab = 'all' | 'upcoming' | 'completed' | 'cancelled';

@Component({
  selector: 'app-my-sessions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './my-sessions.component.html',
  styleUrls: ['./my-sessions.component.scss'],
})
export class MySessionsComponent implements OnInit {
  private authService    = inject(AuthService);
  private sessionService = inject(SessionService);

  get user() { return this.authService.currentUser!; }
  get isLearner() { return this.user.role?.toUpperCase().includes('LEARNER'); }
  get isMentor()  { return this.user.role?.toUpperCase().includes('MENTOR'); }

  sessions = signal<SessionResponse[]>([]);
  loading  = signal(true);
  activeTab = signal<FilterTab>('all');

  filtered = computed(() => {
    const tab = this.activeTab();
    const all = this.sessions();
    if (tab === 'upcoming')   return all.filter(s => s.status === 'REQUESTED' || s.status === 'ACCEPTED');
    if (tab === 'completed')  return all.filter(s => s.status === 'COMPLETED');
    if (tab === 'cancelled')  return all.filter(s => s.status === 'CANCELLED' || s.status === 'REJECTED');
    return all;
  });

  tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'All'       },
    { key: 'upcoming',  label: 'Upcoming'  },
    { key: 'completed', label: 'Completed' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  ngOnInit() {
    this.sessionService.getUserSessions(this.user.id).subscribe({
      next: data => { this.sessions.set(data); this.loading.set(false); },
      error: ()   => { this.loading.set(false); },
    });
  }

  cancel(sessionId: number) {
    this.sessionService.cancel(sessionId).subscribe({
      next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
    });
  }

  accept(sessionId: number) {
    this.sessionService.accept(sessionId).subscribe({
      next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
    });
  }

  reject(sessionId: number) {
    this.sessionService.reject(sessionId).subscribe({
      next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
    });
  }

  complete(sessionId: number) {
    this.sessionService.complete(sessionId).subscribe({
      next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
    });
  }

  canCancel(s: SessionResponse)   { return this.isLearner && (s.status === 'REQUESTED' || s.status === 'ACCEPTED'); }
  canAccept(s: SessionResponse)   { return this.isMentor  && s.status === 'REQUESTED'; }
  canReject(s: SessionResponse)   { return this.isMentor  && s.status === 'REQUESTED'; }
  canComplete(s: SessionResponse) { return this.isMentor  && s.status === 'ACCEPTED'; }

  formatDate(d: string) {
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  statusClass(status: SessionStatus) {
    const map: Record<SessionStatus, string> = {
      REQUESTED: 'badge--pending',
      ACCEPTED:  'badge--accepted',
      COMPLETED: 'badge--completed',
      REJECTED:  'badge--rejected',
      CANCELLED: 'badge--cancelled',
    };
    return map[status] ?? '';
  }
}
