import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from 'src/app/core/auth/auth.service';
import { AdminService } from 'src/app/core/services/admin.service';
import { UserDTO } from 'src/app/core/auth/auth.model';
import { MentorResponse } from 'src/app/core/services/mentor.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  get user() { return this.authService.currentUser!; }

  userInitials = computed(() => {
    const name = this.user?.name || this.user?.username || 'A';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  users    = signal<UserDTO[]>([]);
  mentors  = signal<MentorResponse[]>([]);
  loading  = signal(true);

  learners        = computed(() => this.users().filter(u => u.role === 'LEARNER').length);
  mentorUsers     = computed(() => this.users().filter(u => u.role === 'MENTOR').length);
  adminUsers      = computed(() => this.users().filter(u => u.role === 'ADMIN').length);
  activeMentors   = computed(() => this.mentors().filter(m => m.status === 'ACTIVE').length);
  pendingMentors  = computed(() => this.mentors().filter(m => m.status === 'PENDING').length);

  stats = computed(() => [
    { label: 'Total Users',       value: this.users().length,       sub: 'All accounts',      icon: 'group',         color: '#4285f4', bg: '#e8f0fe' },
    { label: 'Learners',          value: this.learners(),           sub: 'Active learners',   icon: 'school',        color: '#34a853', bg: '#e6f4ea' },
    { label: 'Mentors',           value: this.mentorUsers(),        sub: 'Mentor accounts',   icon: 'psychology',    color: '#f9a825', bg: '#fff8e1' },
    { label: 'Pending Approvals', value: this.pendingMentors(),     sub: 'Awaiting review',   icon: 'pending',       color: '#dd0031', bg: '#fce4ec' },
  ]);

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  recentUsers = computed(() =>
    [...this.users()]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)
  );

  ngOnInit() {
    this.adminService.getAllUsers().subscribe({
      next: data => {
        this.users.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.adminService.getAllMentors().subscribe({
      next: (data: any) => {
        const list: MentorResponse[] = Array.isArray(data) ? data : (data?.content ?? []);
        this.mentors.set(list);
      },
      error: () => {},
    });
  }

  roleColor(role: string): string {
    const map: Record<string, string> = {
      LEARNER: '#4285f4',
      MENTOR:  '#34a853',
      ADMIN:   '#dd0031',
    };
    return map[role] ?? '#6b7280';
  }

  roleBg(role: string): string {
    const map: Record<string, string> = {
      LEARNER: '#e8f0fe',
      MENTOR:  '#e6f4ea',
      ADMIN:   '#fce4ec',
    };
    return map[role] ?? '#f3f4f6';
  }

  userAvatar(user: UserDTO): string {
    const name = user.name || user.username || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
