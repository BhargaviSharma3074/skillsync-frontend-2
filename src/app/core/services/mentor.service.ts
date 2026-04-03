import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";

export interface MentorResponse {
  id: number;
  userId: number;
  bio: string;
  experience: number;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  status: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
  availability: string;
  skills: string[];
}

export interface MentorFilters {
  skillId?: number;
  minRating?: number;
  maxRate?: number;
  minExp?: number;
  sortBy?: string;
}

export interface MentorApplyResponse{
  bio: string;
  experience: number;
  hourlyRate: number;
  skillIds: number[];
}

@Injectable({ providedIn: 'root' })
export class MentorService {
  private http = inject(HttpClient);
  private baseUrl = 'http://34.14.151.244/api';

  getAll(filters?: MentorFilters): Observable<MentorResponse[]> {
    let params = new HttpParams();
    if (filters?.skillId)   params = params.set('skillId',   filters.skillId);
    if (filters?.minRating) params = params.set('minRating', filters.minRating);
    if (filters?.maxRate)   params = params.set('maxRate',   filters.maxRate);
    if (filters?.minExp)    params = params.set('minExp',    filters.minExp);
    if (filters?.sortBy)    params = params.set('sortBy',    filters.sortBy);
    return this.http.get<MentorResponse[]>(`${this.baseUrl}/mentors`, { params });
  }

  getById(id: number): Observable<MentorResponse> {
    return this.http.get<MentorResponse>(`${this.baseUrl}/mentors/${id}`);
  }

  applyMentor(paylod: MentorApplyResponse): Observable<MentorApplyResponse>{
    return this.http.post<MentorApplyResponse>(`${this.baseUrl}/mentors/apply`, paylod);
  }
}
