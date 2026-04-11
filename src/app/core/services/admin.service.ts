import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { UserDTO } from '../auth/auth.model';
import { MentorResponse } from './mentor.service';
import { catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { SkillResponse } from './skill.service';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = 'https://skillsync.mooo.com/api';

  getAllUsers(size: number = 20): Observable<any> {
    return this.http.get<any>(`${this.base}/admin/users?size=${size}`);
  }

  /** Try admin endpoint first; fall back to public mentors list. */
  getAllMentors(): Observable<MentorResponse[]> {
    return this.http
      .get<MentorResponse[]>(`${this.base}/admin/mentors`)
      .pipe(
        catchError(() =>
          this.http.get<MentorResponse[]>(`${this.base}/mentors`),
        ),
      );
  }

  approveMentor(mentorId: number): Observable<unknown> {
    return this.http.put(`${this.base}/admin/mentors/${mentorId}/approve`, {});
  }

  rejectMentor(mentorId: number): Observable<unknown> {
    return this.http.put(`${this.base}/admin/mentors/${mentorId}/reject`, {});
  }

  addSkill(skill: {
    name: string;
    category: string;
  }): Observable<SkillResponse> {
    return this.http.post<SkillResponse>(`${this.base}/admin/skills`, skill);
  }

  deleteSkill(skillId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/admin/skills/${skillId}`);
  }

  getAllGroups(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/groups`);
  }

  deactivateGroup(groupId: number): Observable<unknown> {
    return this.http.put(`${this.base}/admin/groups/${groupId}/deactivate`, {});
  }

  deleteGroup(groupId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/admin/groups/${groupId}`);
  }
}
