import { AsyncPipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Component, inject } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { SidebarComponent } from 'src/app/core/layout/sidebar/sidebar.component';
import { GroupsComponent } from 'src/app/features/groups/groups.component';
import { FindMentorsComponent } from 'src/app/features/mentors/find-mentors/find-mentors.component';
import { NotificationsComponent } from 'src/app/features/notifications/notifications.component';
import { ProfileComponent } from 'src/app/features/profile/profile.component';
import { ReviewsComponent } from 'src/app/features/reviews/reviews.component';
import { MySessionsComponent } from 'src/app/features/sessions/my-sessions.component';
import { LearnerDashboardComponent } from './learner-dashboard/learner-dashboard.component';
import { MentorDashboardComponent } from './mentor-dashboard/mentor-dashboard.component';
import { AdminOverviewComponent } from 'src/app/features/admin/admin-overview/admin-overview.component';
import { UserManagementComponent } from 'src/app/features/admin/user-management/user-management.component';
import { MentorApprovalsComponent } from 'src/app/features/admin/mentor-approvals/mentor-approvals.component';
import { PlatformAnalyticsComponent } from 'src/app/features/admin/platform-analytics/platform-analytics.component';
import { SkillCatalogComponent } from '../admin/skill-catalog/skill-catalog.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AsyncPipe,
    MatIconModule,
    SidebarComponent,
    LearnerDashboardComponent,
    MentorDashboardComponent,
    FindMentorsComponent,
    MySessionsComponent,
    GroupsComponent,
    ReviewsComponent,
    ProfileComponent,
    NotificationsComponent,
    AdminOverviewComponent,
    UserManagementComponent,
    MentorApprovalsComponent,
    PlatformAnalyticsComponent,
    SkillCatalogComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  authService = inject(AuthService);
  activePage = 'overview';

  get isLearner() { return this.authService.currentUser?.role?.toUpperCase().includes('LEARNER'); }
  get isMentor()  { return this.authService.currentUser?.role?.toUpperCase().includes('MENTOR'); }
  get isAdmin()   { return this.authService.currentUser?.role?.toUpperCase().includes('ADMIN'); }
}
