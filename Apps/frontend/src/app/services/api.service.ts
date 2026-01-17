import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EndpointKeys, Endpoints, lambda } from './endpoints';
import { Observable } from 'rxjs';
import { RequestOptions } from '../models/request-options';
import { TicketMessage, TicketDetails } from '../models/ticket-details';
import { UserDTO } from '../models/user-dto';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = '/api';

  constructor(private http: HttpClient) { }

  request<T = any>(url: EndpointKeys, method: string, payload?: object, urlParams?: any, options: RequestOptions = {}): Observable<T>{
    let finalUrl: string;

    if(!urlParams){
      finalUrl = <string>Endpoints[url];
    }
    else{
      finalUrl = (<lambda><unknown>Endpoints[url])(urlParams); 
    }

    const allOptions: RequestOptions & { body?: any, withCredentials?: boolean } = { ...options };
    if (payload) {
      allOptions.body = payload;
    }

    allOptions.withCredentials = true;

    return this.http.request<T>(method, finalUrl, allOptions);
  }

  login(email: string, password: string): Observable<any> {
    return this.request('login', 'POST', { email, password });
  }

  register(email: string, password: string, first_name: string, last_name: string): Observable<any> {
    return this.request('register', 'POST', { email, password, first_name, last_name });
  }

  logout(): Observable<any> {
    return this.request('logout', 'POST');
  }

  checkStatus(): Observable<any> {
    return this.request('checkStatus', 'GET');
  }

  getTickets(filters?: any): Observable<any> {
    return this.request('getTickets', 'GET', undefined, undefined, { params: filters });
  }
  getCategories(): Observable<string[]> {
    return this.request('getCategories', 'GET');
  }
  getTicket(id: number): Observable<TicketDetails> {
    return this.request('getTicket', 'GET', undefined, { id });
  }

  createTicket(ticket: any): Observable<any> {
    return this.request('createTicket', 'POST', ticket);
  }

  updateTicket(id: number, ticket: any): Observable<any> {
    return this.request('updateTicket', 'PUT', ticket, { id });
  }

  deleteTicket(id: number): Observable<any> {
    return this.request('deleteTicket', 'DELETE', undefined, { id });
  }

  getTicketMessages(ticketId: number): Observable<any> {
    return this.request('getTicketMessages', 'GET', undefined, { ticketId });
  }

  sendTicketMessage(ticketId: number, message: TicketMessage): Observable<any> {
    return this.request('sendTicketMessage', 'POST', message, { ticketId });
  }

  getTicketGroups(): Observable<any> {
    return this.request('getTicketGroups', 'GET');
  }

  createTicketGroup(group: any): Observable<any> {
    return this.request('createTicketGroup', 'POST', group);
  }

  addTicketToGroup(groupId: number, ticketId: number): Observable<any> {
    return this.request('addTicketToGroup', 'POST', undefined, { groupId, ticketId });
  }

  removeTicketFromGroup(groupId: number, ticketId: number): Observable<any> {
    return this.request('removeTicketFromGroup', 'DELETE', undefined, { groupId, ticketId });
  }

  getAllUsers(filters?: any): Observable<any> {
    return this.request('getAllUsers', 'GET', undefined, undefined, { params: filters });
  }

  createUser(user: UserDTO): Observable<any> {
    return this.request('createUser', 'POST', user);
  }

  updateUser(id: number, user: UserDTO): Observable<any> {
    return this.request('updateUser', 'PUT', user, { id });
  }

  deleteUser(id: number): Observable<any> {
    return this.request('deleteUser', 'DELETE', undefined, { id });
  }

  getAdminDashboard(): Observable<any> {
    return this.request('getAdminDashboard', 'GET');
  }

  getAllowedDomains(): Observable<any[]> {
    return this.request('getAllowedDomains', 'GET');
  }

  addAllowedDomain(domain: string): Observable<any> {
    return this.request('addAllowedDomain', 'POST', { domain });
  }

  deleteAllowedDomain(id: number): Observable<any> {
    return this.request('deleteAllowedDomain', 'DELETE', undefined, { id });
  }

  getAnalyticsStatistics(filters?: any): Observable<any> {
    return this.request('getAnalyticsStatistics', 'GET', undefined, undefined, { params: filters });
  }
}