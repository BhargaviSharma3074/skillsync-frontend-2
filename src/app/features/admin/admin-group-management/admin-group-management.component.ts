import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { AdminService } from 'src/app/core/services/admin.service';

export interface GroupAdminDTO {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  memberCount: number | null | undefined;
  active: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-group-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, SkeletonComponent,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatDialogModule,
  ],
  templateUrl: './admin-group-management.component.html',
  styleUrl: './admin-group-management.component.scss',
})
export class AdminGroupManagementComponent implements OnInit {
  private adminService = inject(AdminService);

  groups  = signal<GroupAdminDTO[]>([]);
  loading = signal(true);
  error   = signal(false);

  searchQuery = signal('');
  actionError = signal('');

  filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.groups().filter(g =>
      !q ||
      g.name.toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q)
    );
  });

  ngOnInit() {
    this.adminService.getAllGroups().subscribe({
      next: data => { this.groups.set(data); this.loading.set(false); },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  deactivate(group: GroupAdminDTO) {
    if (group.active === false) return;
    this.actionError.set('');
    this.adminService.deactivateGroup(group.id).subscribe({
      next: () => {
        this.groups.update(gs => gs.map(g => g.id === group.id ? { ...g, active: false } : g));
      },
      error: () => this.actionError.set('Failed to deactivate group.'),
    });
  }

  deleteGroup(group: GroupAdminDTO) {
    if (!confirm(`Delete group "${group.name}"? This cannot be undone.`)) return;
    this.actionError.set('');
    this.adminService.deleteGroup(group.id).subscribe({
      next: () => {
        this.groups.update(gs => gs.filter(g => g.id !== group.id));
      },
      error: () => this.actionError.set('Failed to delete group.'),
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
