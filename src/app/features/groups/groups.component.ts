import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { AuthService } from 'src/app/core/auth/auth.service';
import {
  GroupResponseDTO,
  GroupService,
} from 'src/app/core/services/group.service';
import {
  UserBasic,
  UserLookupService,
} from 'src/app/core/services/user-lookup.service';
import { CreateGroupDialogComponent } from './create-group-dialog/create-group-dialog.component';
import { GroupChatComponent } from './group-chat/group-chat.component';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    SkeletonComponent,
    GroupChatComponent,
  ],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.scss'],
})
export class GroupsComponent implements OnInit {
  private authService = inject(AuthService);
  private groupService = inject(GroupService);
  private userLookup = inject(UserLookupService);
  private dialog = inject(MatDialog);

  get user() {
    return this.authService.currentUser!;
  }

  groups = signal<GroupResponseDTO[]>([]);
  loading = signal(true);
  joined = signal(new Set<number>());
  userMap = signal(new Map<number, UserBasic>());

  searchTerm = signal('');
  activeTab = signal<'all' | 'joined' | 'created'>('all');
  selectedGroup = signal<GroupResponseDTO | null>(null);
  view = signal<'list' | 'chat'>('list');

  filtered = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) return this.groups();
    return this.groups().filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        g.description?.toLowerCase().includes(term),
    );
  });

  ngOnInit() {
    this.groupService.getJoined().subscribe({
      next: (data: any) => {
        const list: GroupResponseDTO[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        this.joined.set(new Set(list.map((g) => g.id)));
        this.fetchGroupsForTab(this.activeTab());
      },
      error: () => this.loading.set(false),
    });
  }

  setTab(tab: 'all' | 'joined' | 'created') {
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.searchTerm.set('');
    this.fetchGroupsForTab(tab);
  }

  private fetchGroupsForTab(tab: 'all' | 'joined' | 'created') {
    this.loading.set(true);
    const req$ =
      tab === 'joined'
        ? this.groupService.getJoined()
        : this.groupService.getAll();
    req$.subscribe({
      next: (data: any) => {
        let list: GroupResponseDTO[] = Array.isArray(data)
          ? data
          : (data?.content ?? []);
        list = list.filter((g) => g.active);
        if (tab === 'created')
          list = list.filter((g) => g.createdBy === this.user.id);
        this.groups.set(list);
        this.loading.set(false);
        this.resolveCreatorNames(list);
      },
      error: () => this.loading.set(false),
    });
  }

  private resolveCreatorNames(groups: GroupResponseDTO[]) {
    const ids = [...new Set(groups.map((g) => g.createdBy))];
    if (!ids.length) return;
    this.userLookup.batchFetch(ids).subscribe((map) => this.userMap.set(map));
  }

  openChat(g: GroupResponseDTO) {
    this.selectedGroup.set(g);
    this.view.set('chat');
  }

  backToList() {
    this.view.set('list');
    this.selectedGroup.set(null);
  }

  join(groupId: number) {
    this.groupService.join(groupId, this.user.id).subscribe({
      next: () => this.joined.update((s) => new Set([...s, groupId])),
      error: (err) => console.error('Failed to join group', err),
    });
  }

  leave(groupId: number) {
    this.groupService.leave(groupId, this.user.id).subscribe({
      next: () => {
        this.joined.update((s) => {
          const n = new Set(s);
          n.delete(groupId);
          return n;
        });
        if (this.activeTab() === 'joined')
          this.groups.update((l) => l.filter((g) => g.id !== groupId));
        // if we're in chat view for this group, go back
        if (this.selectedGroup()?.id === groupId) this.backToList();
      },
      error: (err) => console.error('Failed to leave group', err),
    });
  }

  openCreateDialog() {
    const ref = this.dialog.open(CreateGroupDialogComponent, {
      width: '480px',
      maxWidth: '95vw',
      panelClass: 'ss-dialog',
    });
    ref.afterClosed().subscribe((group) => {
      if (group) this.setTab('created');
    });
  }

  isJoined(id: number) {
    return this.joined().has(id);
  }
  canChat(g: GroupResponseDTO) {
    return this.isJoined(g.id) || g.createdBy === this.user.id;
  }

  creatorName(group: GroupResponseDTO): string {
    if (group.createdBy === this.user.id) return 'You';
    const u = this.userMap().get(group.createdBy);
    return this.userLookup.displayName(u);
  }

  memberCount(g: GroupResponseDTO) {
    return ((g.id * 7 + 3) % 40) + 12;
  }

  avatarColor(id: number) {
    return ['#7c3aed', '#ec4899', '#06b6d4', '#3b82f6', '#22c55e', '#f59e0b'][
      id % 6
    ];
  }

  groupInitials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  timeAgo(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
}
