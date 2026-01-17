import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Endpoints } from './endpoints';

@Injectable({
  providedIn: 'root'
})
export class IncidentService {

  constructor(private http: HttpClient) {}

  getIncidentStats(): Observable<any> {
    return this.http.get(`${Endpoints.getAdminDashboard}`, { withCredentials: true });
  }

  getRecentIncidents(limit: number = 5): Observable<any[]> {
    let params = new HttpParams();
    params = params.set('limit', limit.toString());
    return this.http.get<any>(`${Endpoints.getTickets}`, { params, withCredentials: true }).pipe(
      map(response => {
        if (response && Array.isArray(response.data)) {
          return response.data;
        } else if (response && response.data && typeof response.data === 'object') {
          return Object.values(response.data);
        } else if (Array.isArray(response)) {
          return response;
        }
        return [];
      })
    );
  }

  getIncidents(filters: any): Observable<any[]> {
    let params = new HttpParams();
    
    if (filters.status) params = params.set('status', filters.status);
    if (filters.priority) params = params.set('priority', filters.priority);
    if (filters.dateFrom) params = params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params = params.set('dateTo', filters.dateTo);
    if (filters.assignedTo) params = params.set('assignedTo', filters.assignedTo);

    return this.http.get<any>(Endpoints.getTickets, { params, withCredentials: true }).pipe(
      map(response => {
        if (response && Array.isArray(response.data)) {
          return response.data;
        } else if (response && response.data && typeof response.data === 'object') {
          return Object.values(response.data);
        } else if (Array.isArray(response)) {
          return response;
        }
        return [];
      })
    );
  }
}