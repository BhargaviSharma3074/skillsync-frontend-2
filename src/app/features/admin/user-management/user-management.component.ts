import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AdminService } from 'src/app/core/services/admin.service';
import { UserDTO } from 'src/app/core/auth/auth.model';
import { MentorResponse } from 'src/app/core/services/mentor.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    SkeletonComponent,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  users = signal<UserDTO[]>([]);
  totalUsersCount = signal(0);
  loading = signal(true);
  error = signal(false);

  searchQuery = signal('');
  roleFilter = signal<string>('ALL');

  mentors = signal<MentorResponse[]>([]);
  mentorUserIds = computed(() => new Set(this.mentors().map(m => m.userId)));

  filteredUsers = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    const role = this.roleFilter();
    return this.users().filter((u) => {
      const matchesSearch =
        !q ||
        u.username.toLowerCase().includes(q) ||
        (u.name || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);

      const r = (u.role || '').toUpperCase();
      const isMentor = this.mentorUserIds().has(u.id) || r.includes('MENTOR');
      const isAdmin = r.includes('ADMIN');

      let matchesRole = role === 'ALL';
      if (!matchesRole) {
        if (role === 'MENTOR') matchesRole = isMentor;
        else if (role === 'ADMIN') matchesRole = isAdmin;
        else if (role === 'LEARNER') matchesRole = !isMentor && !isAdmin && (r.includes('LEARNER') || r === '');
      }

      return matchesSearch && matchesRole;
    });
  });

  isMentor(user: UserDTO): boolean {
    return this.mentorUserIds().has(user.id) || (user.role || '').toUpperCase().includes('MENTOR');
  }

  isAdmin(user: UserDTO): boolean {
    return (user.role || '').toUpperCase().includes('ADMIN');
  }

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
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      },
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
    if (r.includes('ADMIN')) return '#dd0031';
    if (r.includes('MENTOR')) return '#2e7d32';
    if (r.includes('LEARNER')) return '#1e88e5';
    return '#6b7280';
  }

  roleBg(role: string): string {
    const r = (role || '').toUpperCase();
    if (r.includes('ADMIN')) return '#fce4ec';
    if (r.includes('MENTOR')) return '#e8f5e9';
    if (r.includes('LEARNER')) return '#e3f2fd';
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

  avatarColor(user: UserDTO): string {
    const colors = [
      '#e53935',
      '#43a047',
      '#1e88e5',
      '#8e24aa',
      '#f9a825',
      '#0097a7',
    ];
    return colors[user.id % colors.length];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
