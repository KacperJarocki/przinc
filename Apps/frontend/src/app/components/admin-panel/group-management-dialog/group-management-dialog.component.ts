import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../services/api.service';
import { TicketGroup } from '../../../models/ticket-group';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-group-management-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatListModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './group-management-dialog.component.html',
  styleUrls: ['./group-management-dialog.component.scss']
})
export class GroupManagementDialogComponent implements OnInit {
  groups: TicketGroup[] = [];
  isLoading = false;

  constructor(
    private dialogRef: MatDialogRef<GroupManagementDialogComponent>,
    private api: ApiService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.isLoading = true;
    this.api.request<any>('getTicketGroups', 'GET').subscribe({
      next: (response) => {
        this.isLoading = false;
        if (Array.isArray(response)) {
          this.groups = response;
        } else if (response && Array.isArray(response.data)) {
           this.groups = response.data;
        } else {
           this.groups = [];
        }
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  deleteGroup(group: TicketGroup): void {
    this.dialog.open(ConfirmationDialogComponent, {
      data: { message: `Czy na pewno chcesz usunąć grupę "${group.name}"? Spowoduje to odpięcie wszystkich zgłoszeń od tej grupy.` }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.isLoading = true;
        this.api.request('deleteTicketGroup', 'DELETE', undefined, { id: group.id }).subscribe({
          next: () => {
             this.loadGroups();
             this.snackBar.open('Grupa usunięta', 'OK', { duration: 3000 });
          },
          error: () => {
             this.isLoading = false;
             this.snackBar.open('Błąd podczas usuwania grupy', 'Zamknij', { duration: 3000, panelClass: ['error-snackbar'] });
          }
        });
      }
    });
  }
}
