import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";

export interface GroupResponseDTO {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  active: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class GroupService {
  private http = inject(HttpClient);
  private baseUrl = 'http://34.14.151.244/api';

  getAll(): Observable<GroupResponseDTO[]> {
    return this.http.get<GroupResponseDTO[]>(`${this.baseUrl}/groups`);
  }

  getJoined(): Observable<GroupResponseDTO[]>{
    return this.http.get<GroupResponseDTO[]>(`${this.baseUrl}/groups/joined`);
  }

  create(payload: { name: string; description: string; createdBy: number }): Observable<GroupResponseDTO> {
    return this.http.post<GroupResponseDTO>(`${this.baseUrl}/groups`, payload);
  }

  join(groupId: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/groups/${groupId}/join`, { userId });
  }

  leave(groupId: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/groups/${groupId}/leave`, { userId });
  }
}
