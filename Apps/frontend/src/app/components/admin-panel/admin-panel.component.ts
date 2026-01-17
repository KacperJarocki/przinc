import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { ApiService } from '../../services/api.service';
import { UserDTO } from '../../models/user-dto'; 
import { CommonModule } from '@angular/common'; 
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { catchError, finalize } from 'rxjs/operators'; 
import { of } from 'rxjs';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddUserDialogComponent } from './add-user-dialog/add-user-dialog.component';
import { AllowedDomainsDialogComponent } from './allowed-domains-dialog/allowed-domains-dialog.component';
import { TicketDetailsDialogComponent } from './ticket-details-dialog/ticket-details-dialog.component';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ConfirmationDialogComponent } from '../shared/confirmation-dialog/confirmation-dialog.component';
import { IncidentService } from '../../services/incident.service';
import { Chart, ChartConfiguration } from 'chart.js/auto';
import { TicketDetails } from '../../models/ticket-details';
import { GroupManagementDialogComponent } from './group-management-dialog/group-management-dialog.component';
import { StorageService } from '../../services/storage.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { GroupDialogComponent } from './group-dialog/group-dialog.component';

@Component({
  selector: 'app-admin-panel',
  standalone: true,
  imports: [
    MatTableModule,
    MatTabsModule,
    MatButtonModule,
    CommonModule,
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatRippleModule,
    MatDialogModule,
    MatMenuModule,
    MatCheckboxModule
  ],
  templateUrl: './admin-panel.component.html',
  styleUrls: ['./admin-panel.component.scss']
})
export class AdminPanelComponent implements OnInit { 

  users: UserDTO[] = []; 
  displayedColumns: string[] = ['firstName', 'lastName', 'email', 'role', 'actions'];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  currentUserId: number | null = null;
  currentUserEmail: string | null = null;

  filterForm: FormGroup;
  dashboardLoading = false;
  dashboardErrorMessage: string | null = null;
  
  stats = {
    totalIncidents: 0,
    newIncidents: 0,
    openIncidents: 0,
    inProgressIncidents: 0,
    resolvedIncidents: 0,
    closedIncidents: 0,
    avgResolutionTime: 0,
    criticalCount: 0
  };

  recentIncidents: any[] = [];
  dashboardDisplayedColumns: string[] = ['select', 'id', 'title', 'createdBy', 'status', 'priority', 'createdDate', 'group', 'actions'];
  selectedTicketIds: Set<number> = new Set();

  analyticsLoading = false;
  selectedDateRange: string = '';
  customDateFrom: Date | null = null;
  customDateTo: Date | null = null;
  selectedCategory: string = '';
  categories: string[] = [];
  trendChart: Chart | null = null;
  priorityChart: Chart | null = null;
  statusChart: Chart | null = null;
  categoryChart: Chart | null = null;

  recentAnalyticsTickets: any[] = [];
  analyticsTicketsColumns: string[] = ['id', 'title', 'category', 'status', 'createdDate'];

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private apiService: ApiService, 
    private dialog: MatDialog,
    private fb: FormBuilder,
    private incidentService: IncidentService,
    private storage: StorageService,
    private snackBar: MatSnackBar
  ) {
    this.filterForm = this.fb.group({
      status: [''],
      priority: [''],
      dateFrom: [null],
      dateTo: [null],
      assignedTo: ['']
    });
  }

  ngOnInit(): void {
    const resolve = (key: string) => this.storage.get(key) || (isPlatformBrowser(this.platformId) ? localStorage.getItem(key) : null);
    const clean = (val: any) => String(val).replace(/['"]+/g, '').trim();

    const id = resolve('id');
    if (id) this.currentUserId = Number(clean(id));

    const email = resolve('email');
    if (email) this.currentUserEmail = clean(email);

    this.getAllUsers();
    this.loadDashboardData();
    this.loadAnalyticsData();
    this.apiService.getCategories().subscribe(cats => this.categories = cats);
  }

  isSameDay(date1: Date, date2: Date): boolean {
    return date1.getDate() === date2.getDate() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getFullYear() === date2.getFullYear();
  }

  openGroupManagementDialog(): void {
      this.dialog.open(GroupManagementDialogComponent, {
        width: '500px'
      });
  }
  openGroupDialog(incident?: any): void {
     let ticketsToGroup: number[] = [];
    
     if (incident) {
       ticketsToGroup = [incident.id];
     } else {
       ticketsToGroup = Array.from(this.selectedTicketIds);
     }

     if (ticketsToGroup.length === 0) {
       this.snackBar.open('Wybierz przynajmniej jeden incydent', 'Zamknij', { duration: 3000 });
       return;
     }

     const dialogRef = this.dialog.open(GroupDialogComponent, {
       width: '500px',
       data: { ticketIds: ticketsToGroup }
     });

     dialogRef.afterClosed().subscribe(result => {
       if (result) {
         this.loadDashboardData();
         this.selectedTicketIds.clear();
       }
     });
  }

  isAllSelected(): boolean {
    const numSelected = this.selectedTicketIds.size;
    const numRows = this.recentIncidents.length;
    return numSelected === numRows && numRows > 0;
  }

  masterToggle(): void {
    if (this.isAllSelected()) {
      this.selectedTicketIds.clear();
      return;
    }

    this.selectedTicketIds.clear();
    this.recentIncidents.forEach(row => this.selectedTicketIds.add(row.id));
  }

  toggleSelection(row: any): void {
    if (this.selectedTicketIds.has(row.id)) {
      this.selectedTicketIds.delete(row.id);
    } else {
      this.selectedTicketIds.add(row.id);
    }
  }

  removeTicketFromGroup(incident: any): void {
    if (!incident.groupId) return;

    this.dialog.open(ConfirmationDialogComponent, {
      data: { message: 'Czy na pewno chcesz usunąć ten incydent z grupy?' }
    }).afterClosed().subscribe(result => {
        if (result) {
            this.dashboardLoading = true;
            this.apiService.removeTicketFromGroup(incident.groupId, incident.id)
                .pipe(finalize(() => this.dashboardLoading = false))
                .subscribe({
                    next: () => {
                        this.loadDashboardData();
                        this.snackBar.open('Usunięto z grupy', 'OK', { duration: 3000 });
                    },
                    error: (err) => {
                        this.snackBar.open('Nie udało się usunąć incydentu z grupy', 'Zamknij', { duration: 3000, panelClass: ['error-snackbar'] });
                    }
                });
        }
    });
  }

  isCurrentUser(user: UserDTO): boolean {
    if (this.currentUserId && user.id && Number(this.currentUserId) === Number(user.id)) return true;
    if (this.currentUserEmail && user.email) {
        return this.currentUserEmail.toLowerCase().trim() === user.email.toLowerCase().trim();
    }
    return false;
  }

  loadDashboardData(): void {
    this.dashboardLoading = true;
    this.dashboardErrorMessage = null;

    this.incidentService.getIncidentStats()
      .pipe(
        catchError((error) => {
          this.dashboardErrorMessage = 'Nie udało się załadować statystyk';
          return of(null);
        }),
        finalize(() => this.dashboardLoading = false)
      )
      .subscribe((response: any) => {  
        if (response && response.data && response.data.tickets) {
          const ticketsData = response.data.tickets;
          this.stats = {
            totalIncidents: ticketsData.total || 0,
            newIncidents: ticketsData.new || 0,
            openIncidents: ticketsData.open || 0,
            inProgressIncidents: ticketsData.inProgress || 0,
            resolvedIncidents: ticketsData.resolved || 0,
            closedIncidents: ticketsData.closed || 0,
            avgResolutionTime: 24,
            criticalCount: ticketsData.critical || 0
          };
        }
      });

    this.incidentService.getRecentIncidents(10)
      .pipe(
        catchError(() => {
          return of([]);
        })
      )
      .subscribe((data: any[]) => {
        this.recentIncidents = data || [];
      });
  }

  applyFilters(): void {
    const filters = { ...this.filterForm.value };
    
    if (filters.dateFrom) {
      const d = new Date(filters.dateFrom);
      const offset = d.getTimezoneOffset(); 
      const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
      filters.dateFrom = adjustedDate.toISOString().split('T')[0];
    }
    
    if (filters.dateTo) {
      const d = new Date(filters.dateTo);
      const offset = d.getTimezoneOffset();
      const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
      filters.dateTo = adjustedDate.toISOString().split('T')[0];
    }
    
    this.dashboardLoading = true;
    
    this.incidentService.getIncidents(filters)
      .pipe(
        catchError((error) => {
          this.dashboardErrorMessage = 'Błąd podczas filtrowania';
          return of([]);
        }),
        finalize(() => this.dashboardLoading = false)
      )
      .subscribe((data) => {
        this.recentIncidents = data;
      });
  }

  resetFilters(): void {
    this.filterForm.reset();
    this.loadDashboardData();
  }

  exportReport(format: 'csv' | 'pdf'): void {
    this.dashboardLoading = true;
    const filters = { ...this.filterForm.value };

    if (filters.dateFrom) {
      const d = new Date(filters.dateFrom);
      const offset = d.getTimezoneOffset(); 
      const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
      filters.dateFrom = adjustedDate.toISOString().split('T')[0];
    }
    
    if (filters.dateTo) {
      const d = new Date(filters.dateTo);
      const offset = d.getTimezoneOffset();
      const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
      filters.dateTo = adjustedDate.toISOString().split('T')[0];
    }

    this.incidentService.getIncidents(filters)
      .pipe(
        finalize(() => this.dashboardLoading = false)
      )
      .subscribe({
        next: (data: any[]) => {
          if (format === 'csv') {
            this.downloadCsv(data, 'raport-incydentow.csv');
          } else {
            this.downloadPdf(data, 'raport-incydentow.pdf');
          }
        },
        error: () => {
          this.dashboardErrorMessage = 'Nie udało się wyeksportować raportu.';
        }
      });
  }

  downloadCsv(data: any[], filename: string): void {
    if (!data || data.length === 0) {
      this.snackBar.open('Brak danych do eksportu', 'Zamknij', { duration: 3000 });
      return;
    }

    const headers = ['ID', 'Tytuł', 'Status', 'Priorytet', 'Kategoria', 'Data utworzenia', 'Przypisany do', 'Grupa', 'Opis'];
    const keys = ['id', 'title', 'status', 'priority', 'category', 'createdDate', 'assignedTo', 'group', 'description'];

    const csvContent = [
      headers.join(','),
      ...data.map(item => keys.map(key => {
        let val = item[key];
        if (val === null || val === undefined) val = '';
        val = String(val).replace(/"/g, '""'); 
        val = val.replace(/\n/g, ' '); 
        return `"${val}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    if (typeof document !== 'undefined') {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
  }

  downloadPdf(data: any[], filename: string): void {
    if (!data || data.length === 0) {
      this.snackBar.open('Brak danych do eksportu', 'Zamknij', { duration: 3000 });
      return;
    }

    const doc = new jsPDF();
    
    const addFontAndGenerate = (fontBase64?: string) => {
      if (fontBase64) {
        doc.addFileToVFS('Roboto-Regular.ttf', fontBase64);
        doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        doc.setFont('Roboto');
      }

      const headers = [['ID', 'Tytuł', 'Status', 'Priorytet', 'Kategoria', 'Data utworzenia', 'Przypisany do']];
      
      const rows = data.map(item => [
        item.id,
        item.title,
        item.status,
        item.priority,
        item.category,
        new Date(item.createdDate).toLocaleDateString(),
        item.assignedTo || '-'
      ]);
  
      doc.text('Raport Incydentów', 14, 15);
      doc.setFontSize(10);
      doc.text(`Data wygenerowania: ${new Date().toLocaleString()}`, 14, 22);
  
      autoTable(doc, {
        head: headers,
        body: rows,
        startY: 25,
        styles: { 
          fontSize: 8,
          font: fontBase64 ? 'Roboto' : 'helvetica',
          fontStyle: 'normal'
        },
        headStyles: { fillColor: [63, 81, 181] }
      });
  
      doc.save(filename);
    };

    fetch('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf')
      .then(response => {
        if (!response.ok) throw new Error('Font load failed');
        return response.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const fontBase64 = base64data.split(',')[1];
          addFontAndGenerate(fontBase64);
        };
        reader.readAsDataURL(blob);
      })
      .catch(() => {
        addFontAndGenerate(undefined);
      });
  }

  viewIncidentDetails(incident: any): void {
    const ticketDetails: TicketDetails = {
      ...incident,
      messages: incident.messages || []
    };

    const dialogRef = this.dialog.open(TicketDetailsDialogComponent, {
      data: ticketDetails,
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '95vh',
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
        if (result?.deleted || result?.updated) {
            this.loadDashboardData();
            this.loadAnalyticsData();
        }
    });
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase().replace(' ', '-')}`;
  }

  getPriorityClass(priority: string): string {
    return `priority-${priority.toLowerCase()}`;
  }

  getAllUsers(): void {
    this.isLoading = true;
    this.errorMessage = null; 

    this.apiService.getAllUsers({ pageSize: 1000 })
      .pipe(
        catchError((error) => {
          this.errorMessage = 'Nie udało się załadować użytkowników.';
          this.users = [];
          return of({ data: [] });
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((response: any) => {
        const usersArr: any[] = Array.isArray(response?.data) ? response.data : [];
        this.users = usersArr.map((user: any) => ({
          ...user,
          role: this.mapRole(user.role)
        }));
      });
  }

  setDateRange(range: string): void {
    if (range !== 'custom') {
        this.customDateFrom = null;
        this.customDateTo = null;
    }
    this.selectedDateRange = range;
    this.refreshAnalytics();
  }

  onCustomDateChange(): void {
      if (this.customDateFrom && this.customDateTo) {
          if (this.customDateFrom > this.customDateTo) {
              this.snackBar.open('Data początkowa musi być wcześniejsza niż data końcowa', 'Zamknij', { 
                  duration: 3000,
                  panelClass: ['error-snackbar']
              });
              return;
          }
          this.selectedDateRange = 'custom';
          this.refreshAnalytics();
      }
  }

  refreshAnalytics(): void {
    this.loadAnalyticsData();
  }

  loadAnalyticsData(): void {
  this.analyticsLoading = true;

  const filters: any = { pageSize: 1000 };

  if (this.selectedCategory) {
    filters.category = this.selectedCategory;
  }

  const today = new Date();
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  if (this.selectedDateRange === 'week') {
    dateFrom = new Date(today);
    dateFrom.setDate(today.getDate() - 7);
  } else if (this.selectedDateRange === 'month') {
    dateFrom = new Date(today);
    dateFrom.setMonth(today.getMonth() - 1);
  } else if (this.selectedDateRange === 'quarter') {
    dateFrom = new Date(today);
    dateFrom.setMonth(today.getMonth() - 3);
  } else if (this.selectedDateRange === 'custom' && this.customDateFrom && this.customDateTo) {
      dateFrom = new Date(this.customDateFrom);
      dateFrom.setHours(0,0,0,0);
      
      dateTo = new Date(this.customDateTo);
      dateTo.setHours(23,59,59,999);
  }

  if (dateFrom) {
    filters.dateFrom = dateFrom.toISOString();
  }
  
  if (dateTo) {
      filters.dateTo = dateTo.toISOString();
  }

  this.apiService.getTickets(filters).pipe(
    catchError((error) => {
      this.analyticsLoading = false;
      return of({ data: [] });
    }),
    finalize(() => {
      this.analyticsLoading = false;
    })
  ).subscribe((response: any) => {
    let tickets = Array.isArray(response?.data) ? response.data : [];

    this.recentAnalyticsTickets = tickets.slice(0, 3);

    this.updateTrendChart(tickets);
    this.updatePriorityChart(tickets);
    this.updateStatusChart(tickets);
    this.updateCategoryChart(tickets);
  });
} 

  updateTrendChart(tickets: any[]): void {
    const labels: string[] = [];
    const data: number[] = [];
    
    let endDate = new Date();

    let daysBack = 7;
    if (this.selectedDateRange === 'month') {
      daysBack = 30;
    } else if (this.selectedDateRange === 'quarter') {
      daysBack = 90;
    } else if (this.selectedDateRange === 'custom' && this.customDateFrom && this.customDateTo) {
        endDate = new Date(this.customDateTo);
        const diffTime = Math.abs(this.customDateTo.getTime() - this.customDateFrom.getTime());
        daysBack = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }

    for (let i = daysBack - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('pl-PL', { month: '2-digit', day: '2-digit' }));
      
      const count = tickets.filter(t => this.isSameDay(new Date(t.createdDate), date)).length;
      data.push(count);
    }

    if (typeof document !== 'undefined') {
        const ctx = document.getElementById('trendChart') as HTMLCanvasElement;
        if (ctx) {
          if (this.trendChart) this.trendChart.destroy();
          this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
              labels,
              datasets: [{
                label: 'Liczba Ticketów',
                data,
                borderColor: '#1976d2',
                backgroundColor: 'rgba(25, 118, 210, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointRadius: daysBack > 30 ? 1 : 3 
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: true,
              plugins: { legend: { position: 'bottom' } },
              scales: {
                x: {
                  ticks: {
                    maxTicksLimit: daysBack > 30 ? 15 : 7
                  }
                },
                 y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
              }
            }
          });
        }
      }
  }

  private getColors(count: number): string[] {
    const baseColors = [
      '#FF6384', 
      '#36A2EB', 
      '#FFCE56', 
      '#4BC0C0', 
      '#9966FF',
      '#FF9F40',
      '#E7E9ED', 
      '#76A346',
      '#C04B4B',
      '#4B4BC0'
    ];
    
    const colors: string[] = [];
    for (let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
  }

  updatePriorityChart(tickets: any[]): void {
    const knownPriorities = ['Krytyczny', 'Wysoki', 'Średni', 'Niski'];
    const priorityCounts: {[key: string]: number} = {};
    
    knownPriorities.forEach(p => priorityCounts[p] = 0);

    tickets.forEach(t => {
        const p = t.priority || 'Nieokreślony';
        priorityCounts[p] = (priorityCounts[p] || 0) + 1;
    });

    const labels = Object.keys(priorityCounts);
    const data = Object.values(priorityCounts);
    const colors = labels.map(label => {
        switch(label) {
            case 'Krytyczny': return '#d32f2f';
            case 'Wysoki': return '#ff6f00';
            case 'Średni': return '#f57f17';
            case 'Niski': return '#388e3c';
            default: return this.getColors(1)[0];
        }
    });

    if (isPlatformBrowser(this.platformId)) {
      const ctx = document.getElementById('priorityChart') as HTMLCanvasElement;
      if (ctx) {
        if (this.priorityChart) this.priorityChart.destroy();
        this.priorityChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: colors,
              borderColor: '#fff',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { 
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                } 
            }
          }
        });
      }
    }
  }

  updateStatusChart(tickets: any[]): void {
    const knownStatuses = ['Nowy', 'Otwarte', 'W trakcie', 'Rozwiązany', 'Zamknięte'];
    const statusCounts: {[key: string]: number} = {};
    
    knownStatuses.forEach(s => statusCounts[s] = 0);

    tickets.forEach(t => {
        const s = t.status || 'Nieznany';
        statusCounts[s] = (statusCounts[s] || 0) + 1;
    });

    const labels = Object.keys(statusCounts);
    const data = Object.values(statusCounts);
    
    const labelColors = labels.map(l => {
        const lower = l.toLowerCase();
        if (lower.includes('nowy')) return '#2196F3'; // Blue
        if (lower.includes('otwarte') || lower.includes('open')) return '#F44336'; // Red
        if (lower.includes('trakcie') || lower.includes('progress')) return '#FF9800'; // Orange
        if (lower.includes('rozwiąz') || lower.includes('resolved')) return '#4CAF50'; // Green
        if (lower.includes('zamk') || lower.includes('closed')) return '#607D8B'; // Blue Grey
        return '#E7E9ED';
    });

    if (isPlatformBrowser(this.platformId)) {
      const ctx = document.getElementById('statusChart') as HTMLCanvasElement;
      if (ctx) {
        if (this.statusChart) this.statusChart.destroy();
        this.statusChart = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: labelColors,
              borderColor: '#fff',
              borderWidth: 2
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { 
                    position: 'bottom',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                } 
            }
          }
        });
      }
    }
  }

  updateCategoryChart(tickets: any[]): void {
    const categoryCounts: {[key: string]: number} = {};
    if (this.categories && this.categories.length > 0) {
        this.categories.forEach(c => categoryCounts[c] = 0);
    }
    tickets.forEach(t => {
      const cat = t.category || 'Inne';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);
    const colors = this.getColors(labels.length);
    if (isPlatformBrowser(this.platformId)) {
      const ctx = document.getElementById('categoryChart') as HTMLCanvasElement;
      if (ctx) {
        if (this.categoryChart) this.categoryChart.destroy();
        this.categoryChart = new Chart(ctx, {
          type: 'bar', 
          data: {
            labels: labels,
            datasets: [{
              label: 'Liczba zgłoszeń',
              data: data,
              backgroundColor: colors,
              borderColor: colors,
              borderWidth: 1
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: { 
                legend: { 
                    display: false
                } 
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
          }
        });
      }
    }
  }
  private mapRole(roleValue: number|string): string {
    switch (roleValue) {
      case 0:
      case 'admin': 
        return 'ADMIN';
      case 1:
      case 'user':
        return 'USER';
      default: return 'UNKNOWN';
    }
  }
  deleteUser(user: UserDTO): void {
    const storedId = this.storage.get('id');
    
    if (storedId && String(storedId) === String(user.id)) {
      this.snackBar.open('Nie możesz usunąć własnego konta!', 'Zamknij', { 
        duration: 5000, 
        panelClass: ['error-snackbar'] 
      });
      return;
    }
    
    if (this.isCurrentUser(user)) {
         this.snackBar.open('Nie możesz usunąć własnego konta!', 'Zamknij', { 
            duration: 5000, 
            panelClass: ['error-snackbar'] 
          });
          return;
    }
    
    this.dialog.open(ConfirmationDialogComponent, {
      data: { message: `Jesteś pewny że chcesz usunąć użytkownika ${user.email}?` }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.errorMessage = null;
        this.apiService.deleteUser(user.id || 0)
          .pipe(
            catchError((error) => {
              this.errorMessage = 'Nie udało się usunąć użytkownika';
              const msg = error.error?.message || 'Nie udało się usunąć użytkownika';
              this.snackBar.open(msg, 'Zamknij', { duration: 5000, panelClass: ['error-snackbar'] });
              return of(null);
            }),
            finalize(() => {
              this.isLoading = false;
            })
          )
          .subscribe((res) => {
            if (res !== null) {
              this.snackBar.open('Użytkownik usunięty pomyślnie', 'OK', { duration: 3000, panelClass: ['success-snackbar'] });
              this.getAllUsers();
            }
          });
      }
    });
  }
  openAddUserDialog(): void {
    const dialogRef = this.dialog.open(AddUserDialogComponent, {
      width: '400px',
      disableClose: true
    });
    dialogRef.afterClosed().subscribe((newUser: any) => {
      if (newUser) {
        this.addUser(newUser);
      }
    });
  }

  openAllowedDomains(): void {
    this.dialog.open(AllowedDomainsDialogComponent, {
      width: '500px'
    });
  }

  addUser(userData: any): void { 
    this.isLoading = true;
    this.errorMessage = null;

    const userPayload: any = {
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      first_name: userData.firstName || '',
      last_name: userData.lastName || '',
      email: userData.email || '',
      username: userData.email || '',
      password: userData.password || '',
      role: userData.role === 0 || userData.role === '0' ? 'admin' : 'user'
    };

    this.apiService.createUser(userPayload as any)
      .pipe(
        catchError((error) => {
          this.errorMessage = error.error?.message || 'Nie udało się dodać użytkownika';
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe((addedUser: UserDTO | null) => {
        if (addedUser) {
          this.getAllUsers();
        }
      });
  }
}