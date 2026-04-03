import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AdminService } from 'src/app/core/services/admin.service';
import { UserDTO } from 'src/app/core/auth/auth.model';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatProgressSpinnerModule,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.scss',
})
export class UserManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  users   = signal<UserDTO[]>([]);
  loading = signal(true);
  error   = signal(false);

  searchQuery  = signal('');
  roleFilter   = signal<string>('ALL');

  filteredUsers = computed(() => {
    const q    = this.searchQuery().toLowerCase().trim();
    const role = this.roleFilter();
    return this.users().filter(u => {
      const matchesSearch =
        !q ||
        u.username.toLowerCase().includes(q) ||
        (u.name  || '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      const matchesRole = role === 'ALL' || u.role === role;
      return matchesSearch && matchesRole;
    });
  });

  ngOnInit() {
    this.adminService.getAllUsers().subscribe({
      next: data => { this.users.set(data); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  roleColor(role: string): string {
    const map: Record<string, string> = { LEARNER: '#1e88e5', MENTOR: '#2e7d32', ADMIN: '#dd0031' };
    return map[role] ?? '#6b7280';
  }

  roleBg(role: string): string {
    const map: Record<string, string> = { LEARNER: '#e3f2fd', MENTOR: '#e8f5e9', ADMIN: '#fce4ec' };
    return map[role] ?? '#f3f4f6';
  }

  userAvatar(user: UserDTO): string {
    const name = user.name || user.username || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  avatarColor(user: UserDTO): string {
    const colors = ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#f9a825', '#0097a7'];
    return colors[user.id % colors.length];
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }
}
