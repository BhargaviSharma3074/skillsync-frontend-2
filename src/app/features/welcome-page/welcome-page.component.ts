import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.scss']
})
export class WelcomeComponent {
  features = [
    {
      icon: 'school',
      title: 'Expert Mentorship',
      description: 'Connect with industry professionals who have walked the path and can guide your journey.'
    },
    {
      icon: 'trending_up',
      title: 'Accelerate Growth',
      description: 'Upskill faster with personalized feedback, 1-on-1 sessions, and real-world insights.'
    },
    {
      icon: 'groups',
      title: 'Vibrant Community',
      description: 'Join a network of driven learners and mentors building the future of technology together.'
    }
  ];
}
