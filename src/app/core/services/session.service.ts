import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";

/** * Session status types matching your backend logic
 */
export type SessionStatus = 'REQUESTED' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';

/** * Structure of the session returned from the API
 */
export interface SessionResponse {
  id: number;
  mentorId: number;
  learnerId: number;
  sessionDate: string; // ISO format: YYYY-MM-DDTHH:mm:ss
  status: SessionStatus;
  topic: string;
  duration?: number;
  createdAt: string;
}

/** * Payload structure for the booking request
 * Matches the 3-field requirement you shared
 */
export interface BookSessionPayload {
  mentorId: number | undefined;
  sessionDate: string;
  topic: string;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private http = inject(HttpClient);
  private baseUrl = 'http://34.14.151.244/api';

  /**
   * Fetch all sessions associated with a user ID
   */
  getUserSessions(userId: number): Observable<SessionResponse[]> {
    return this.http.get<SessionResponse[]>(`${this.baseUrl}/sessions/user/${userId}`);
  }

  /**
   * POST request to create a new session
   * This is called before the Razorpay payment initiation
   */
  book(payload: BookSessionPayload): Observable<SessionResponse> {
    return this.http.post<SessionResponse>(`${this.baseUrl}/sessions`, payload);
  }

  /**
   * Update session status to ACCEPTED
   */
  accept(sessionId: number): Observable<SessionResponse> {
    return this.http.put<SessionResponse>(`${this.baseUrl}/sessions/${sessionId}/accept`, {});
  }

  /**
   * Update session status to REJECTED
   */
  reject(sessionId: number): Observable<SessionResponse> {
    return this.http.put<SessionResponse>(`${this.baseUrl}/sessions/${sessionId}/reject`, {});
  }

  /**
   * Cancel an existing session
   */
  cancel(sessionId: number): Observable<SessionResponse> {
    return this.http.put<SessionResponse>(`${this.baseUrl}/sessions/${sessionId}/cancel`, {});
  }

  /**
   * Mark a session as COMPLETED (usually after the meeting ends)
   */
  complete(sessionId: number): Observable<SessionResponse> {
    return this.http.put<SessionResponse>(`${this.baseUrl}/sessions/${sessionId}/complete`, {});
  }

  /**
   * Fetch details for a specific session by its ID
   */
  getSessionById(sessionId: number): Observable<SessionResponse> {
    return this.http.get<SessionResponse>(`${this.baseUrl}/sessions/${sessionId}`);
  }
}
