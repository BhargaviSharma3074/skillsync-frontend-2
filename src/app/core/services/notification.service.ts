import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";

export interface NotificationResponse {
  id: number;
  userId: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private baseUrl = 'http://34.14.151.244/api';

  getForUser(userId: number): Observable<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(`${this.baseUrl}/notifications/user/${userId}`);
  }

  markRead(notificationId: number): Observable<string> {
    return this.http.put<string>(`${this.baseUrl}/notifications/${notificationId}/read`, {});
  }
}
