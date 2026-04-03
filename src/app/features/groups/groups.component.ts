import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';
import { GroupResponseDTO, GroupService } from 'src/app/core/services/group.service';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    CommonModule, FormsModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatCard
  ],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.scss'],
})
export class GroupsComponent implements OnInit {
  private authService  = inject(AuthService);
  private groupService = inject(GroupService);

  get user() { return this.authService.currentUser!; }

  groups  = signal<GroupResponseDTO[]>([]);
  loading = signal(true);
  joined  = signal(new Set<number>());

  searchTerm = signal('');
  activeTab = signal<'all' | 'joined' | 'created'>('all');

  // Since the backend handles the tabs now, this only filters the search bar
  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.groups();

    return this.groups().filter(g =>
      g.name.toLowerCase().includes(term) || g.description?.toLowerCase().includes(term)
    );
  });

  // Create group form
  showCreate = signal(false);
  newName = '';
  newDesc = '';
  creating = signal(false);

  ngOnInit() {
    // 1. Fetch joined groups once strictly to track WHICH groups the user is in
    // This ensures the "Join/Leave" buttons show correctly on the "Discover" tab
    this.groupService.getJoined().subscribe({
      next: (data: any) => {
        const list: GroupResponseDTO[] = Array.isArray(data) ? data : (data?.content ?? []);
        this.joined.set(new Set(list.map(g => g.id)));

        // 2. Load the initial tab data (Defaults to 'all' / Discover)
        this.fetchGroupsForTab(this.activeTab());
      },
      error: () => this.loading.set(false)
    });
  }

  // Handle Tab Clicks
  setTab(tab: 'all' | 'joined' | 'created') {
    if (this.activeTab() === tab) return; // Prevent duplicate calls if clicking the same tab
    this.activeTab.set(tab);
    this.searchTerm.set(''); // Clear search when switching tabs
    this.fetchGroupsForTab(tab);
  }

  // Fetch the data based on the active tab
  private fetchGroupsForTab(tab: 'all' | 'joined' | 'created') {
    this.loading.set(true);
    let request$;

    if (tab === 'all' || tab === 'created') {
      request$ = this.groupService.getAll();
    } else {
      request$ = this.groupService.getJoined();
    }

    request$.subscribe({
      next: (data: any) => {
        let list: GroupResponseDTO[] = Array.isArray(data) ? data : (data?.content ?? []);
        list = list.filter(g => g.active);

        // If 'created' tab, filter the getAll results client-side
        // (Unless you have a specific getCreated() endpoint, then use that above)
        if (tab === 'created') {
          list = list.filter(g => g.createdBy === this.user.id);
        }

        this.groups.set(list);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  /* --- Group Actions --- */

  isJoined(groupId: number) { return this.joined().has(groupId); }

join(groupId: number) {
    this.groupService.join(groupId, this.user.id).subscribe({
      next: () => {
        this.joined.update(s => new Set([...s, groupId]));
      },
      error: (err) => console.error('Failed to join group', err),
    });
  }

  leave(groupId: number) {
    this.groupService.leave(groupId, this.user.id).subscribe({
      next: () => {
        this.joined.update(s => {
          const newSet = new Set(s);
          newSet.delete(groupId);
          return newSet;
        });

        if (this.activeTab() === 'joined') {
          const updatedList = this.groups().filter(g => g.id !== groupId);
          this.groups.set(updatedList);
        }


      },
      error: (err) => console.error('Failed to leave group', err),
    });
  }

  createGroup() {
    if (!this.newName.trim()) return;
    this.creating.set(true);
    this.groupService.create({ name: this.newName, description: this.newDesc, createdBy: this.user.id }).subscribe({
      next: group => {
        // Instantly switch to the 'created' tab to show their new group
        this.setTab('created');
        this.newName = '';
        this.newDesc = '';
        this.showCreate.set(false);
        this.creating.set(false);
      },
      error: () => { this.creating.set(false); },
    });
  }

  avatarColor(id: number) { return ['#e53935','#43a047','#1e88e5','#8e24aa','#f59e0b','#00897b'][id % 6]; }
  groupInitials(name: string) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
}
