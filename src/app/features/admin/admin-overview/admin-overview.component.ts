import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from 'src/app/core/auth/auth.service';
import { AdminService } from 'src/app/core/services/admin.service';
import { UserDTO } from 'src/app/core/auth/auth.model';
import { MentorResponse } from 'src/app/core/services/mentor.service';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    SkeletonComponent,
  ],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent implements OnInit {
  private authService = inject(AuthService);
  private adminService = inject(AdminService);

  get user() {
    return this.authService.currentUser!;
  }

  userInitials = computed(() => {
    const name = this.user?.name || this.user?.username || 'A';
    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  });

  users = signal<UserDTO[]>([]);
  mentors = signal<MentorResponse[]>([]);
  totalUsersCount = signal(0);
  loading = signal(true);

  mentorUserIds = computed(() => new Set(this.mentors().map((m) => m.userId)));

  learners = computed(
    () =>
      this.users().filter((u) => {
        const r = (u.role || '').toUpperCase();
        const isMentor = this.mentorUserIds().has(u.id) || r.includes('MENTOR');
        const isAdmin = r.includes('ADMIN');
        return !isMentor && !isAdmin && (r.includes('LEARNER') || r === '');
      }).length,
  );
  mentorUsers = computed(
    () =>
      this.users().filter((u) => {
        const r = (u.role || '').toUpperCase();
        return this.mentorUserIds().has(u.id) || r.includes('MENTOR');
      }).length,
  );
  adminUsers = computed(
    () =>
      this.users().filter((u) => (u.role || '').toUpperCase().includes('ADMIN'))
        .length,
  );
  activeMentors = computed(
    () => this.mentors().filter((m) => m.status === 'ACTIVE').length,
  );
  pendingMentors = computed(
    () => this.mentors().filter((m) => m.status === 'PENDING').length,
  );

  stats = computed(() => [
    {
      label: 'Total Users',
      value: this.totalUsersCount(),
      sub: 'All accounts',
      icon: 'group',
      color: '#4285f4',
      bg: '#e8f0fe',
    },
    {
      label: 'Learners',
      value: this.learners(),
      sub: 'Active learners',
      icon: 'school',
      color: '#34a853',
      bg: '#e6f4ea',
    },
    {
      label: 'Mentors',
      value: this.mentorUsers(),
      sub: 'Mentor accounts',
      icon: 'psychology',
      color: '#f9a825',
      bg: '#fff8e1',
    },
    {
      label: 'Pending Approvals',
      value: this.pendingMentors(),
      sub: 'Awaiting review',
      icon: 'pending',
      color: '#dd0031',
      bg: '#fce4ec',
    },
  ]);

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  recentUsers = computed(() =>
    [...this.users()]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 5),
  );

  ngOnInit() {
    this.adminService.getAllUsers(1000).subscribe({
      next: (data) => {
        const list: UserDTO[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        this.users.set(list);
        this.totalUsersCount.set(data?.totalElements ?? list.length);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });

    this.adminService.getAllMentors().subscribe({
      next: (data: any) => {
        const list: MentorResponse[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        this.mentors.set(list);
      },
      error: () => {},
    });
  }

  roleColor(role: string): string {
    const r = (role || '').toUpperCase();
    if (r.includes('ADMIN')) return '#ec4899';
    if (r.includes('MENTOR')) return '#7c3aed';
    if (r.includes('LEARNER')) return '#3b82f6';
    return '#6b7280';
  }

  roleBg(role: string): string {
    const r = (role || '').toUpperCase();
    if (r.includes('ADMIN')) return '#fce7f3';
    if (r.includes('MENTOR')) return '#ede9fe';
    if (r.includes('LEARNER')) return '#dbeafe';
    return '#f3f4f6';
  }

  userAvatar(user: UserDTO): string {
    const name = user.name || user.username || 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
