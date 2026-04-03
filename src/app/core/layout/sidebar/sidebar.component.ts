import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MatIconModule, MatBadgeModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private authService = inject(AuthService);

  @Input() activePage = 'overview';
  @Output() navigate = new EventEmitter<string>();

  get userInitials() {
    const name = this.authService.currentUser?.name
      || this.authService.currentUser?.username
      || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  get isAdmin() {
    return this.authService.currentUser?.role?.toUpperCase().includes('ADMIN');
  }
  get isMentor() {
    return this.authService.currentUser?.role?.toUpperCase().includes('MENTOR');
  }

  navItems = [
    { label: 'Dashboard',       icon: 'dashboard', page: 'overview'      },
    { label: 'Find Mentors',    icon: 'search',    page: 'find-mentors'  },
    { label: 'My Sessions',     icon: 'event',     page: 'sessions'      },
    { label: 'Learning Groups', icon: 'groups',    page: 'groups'        },
    { label: 'Reviews',         icon: 'star',      page: 'reviews'       },
  ];

  mentorNavItems=[
    { label: 'Dashboard',       icon: 'dashboard', page: 'overview'      },
    { label: 'My Sessions',     icon: 'event',     page: 'sessions'      },
    { label: 'Learning Groups', icon: 'groups',    page: 'groups'        },
    { label: 'Reviews',         icon: 'star',      page: 'reviews'       },
  ]

  adminNavItems = [
    { label: 'Overview',          icon: 'dashboard',           page: 'overview'          },
    { label: 'User Management',   icon: 'manage_accounts',     page: 'admin-users'       },
    { label: 'Mentor Approvals',  icon: 'verified_user',       page: 'admin-approvals'   },
    { label: 'Skill Catalog',     icon: 'handyman',            page: 'skill-catalog'     },
    { label: 'Platform Analytics',icon: 'bar_chart',           page: 'admin-analytics'   },
  ];

  accountItems = [
    { label: 'My Profile',    icon: 'person',        page: 'profile'       },
    { label: 'Notifications', icon: 'notifications', page: 'notifications' },
    { label: 'Settings',      icon: 'settings',      page: 'settings'      },
  ];

  logout() {
    this.authService.logout();
  }
}
