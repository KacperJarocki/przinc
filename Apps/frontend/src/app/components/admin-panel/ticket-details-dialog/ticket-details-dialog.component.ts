import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
  MatDialog
} from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ApiService } from '../../../services/api.service';
import { StorageService } from '../../../services/storage.service';
import { TicketDetails, TicketMessage } from '../../../models/ticket-details';
import { UserDTO } from '../../../models/user-dto';
import { ConfirmationDialogComponent } from '../../shared/confirmation-dialog/confirmation-dialog.component';

@Component({
  selector: 'app-ticket-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatSnackBarModule,
    MatCheckboxModule
  ],
  templateUrl: './ticket-details-dialog.component.html',
  styleUrls: ['./ticket-details-dialog.component.scss'],
})
export class TicketDetailsDialogComponent implements OnInit {
  ticket: TicketDetails;
  newMessage: string = '';
  replyToGroup: boolean = false;
  isLoading: boolean = false;
  
  users: UserDTO[] = [];
  categories: string[] = [];
  
  isEditingTitle: boolean = false;
  isEditingDescription: boolean = false;
  originalTitle: string = '';
  originalDescription: string = '';
  private ticketModified: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<TicketDetailsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TicketDetails,
    private apiService: ApiService,
    private storageService: StorageService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.ticket = { ...data };
    if (!this.ticket.messages) {
      this.ticket.messages = [];
    }
  }

  ngOnInit(): void {
    this.originalTitle = this.ticket.title;
    this.originalDescription = this.ticket.description;
    this.loadMessages();
    this.loadUsers();
    this.loadCategories();
  }

  loadUsers(): void {
    this.apiService.getAllUsers({ pageSize: 100 }).subscribe({
        next: (response: any) => {
            if (response && Array.isArray(response.data)) {
                this.users = response.data;
            } else if (Array.isArray(response)) {
                this.users = response;
            }
        }
    });
  }

  loadCategories(): void {
    this.apiService.getCategories().subscribe({
        next: (cats) => this.categories = cats,
        error: () => {
            this.categories = ['Sieć', 'Sprzęt', 'Oprogramowanie', 'HR', 'Inne'];
        }
    });
  }
showNotification(message: string, isError: boolean = false): void {
      this.snackBar.open(message, 'Zamknij', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top',
          panelClass: isError ? ['error-snackbar'] : ['success-snackbar']
      });
  }

  updateTicketField(field: string, value: any): void {
      this.isLoading = true;
      const payload: any = {};
      payload[field] = value;
      
      this.apiService.request('updateTicket', 'PUT', payload, { id: this.ticket.id })
          .subscribe({
              next: () => {
                  (this.ticket as any)[field] = value;
                  this.isLoading = false;
                  this.ticketModified = true;
                  if (field === 'title') this.isEditingTitle = false;
                  if (field === 'description') this.isEditingDescription = false;
                  
                  this.showNotification(`Zaktualizowano pole ${field}`);
              },
              error: () => {
                  this.isLoading = false;
                  this.showNotification(`Błąd aktualizacji pola ${field}`, true);
              }
          });
  }

  updateTicketStatus(newStatus: string): void {
      this.updateTicketField('status', newStatus);
  }

  updateTicketPriority(newPriority: string): void {
      this.updateTicketField('priority', newPriority);
  }

  updateTicketCategory(newCategory: string): void {
      this.updateTicketField('category', newCategory);
  }
  
  updateTicketAssignee(assigneeEmail: string): void {
      this.updateTicketField('assignedTo', assigneeEmail);
  }

  startEditTitle(): void {
      this.originalTitle = this.ticket.title;
      this.isEditingTitle = true;
  }
  
  cancelEditTitle(): void {
      this.ticket.title = this.originalTitle;
      this.ticket.title = this.originalTitle; 
      this.isEditingTitle = false;
  }
  
  saveTitle(): void {
      this.updateTicketField('title', this.ticket.title);
  }

  startEditDescription(): void {
      this.originalDescription = this.ticket.description;
      this.isEditingDescription = true;
  }
  
  cancelEditDescription(): void {
      this.ticket.description = this.originalDescription;
      this.isEditingDescription = false;
  }
  
  saveDescription(): void {
      this.updateTicketField('description', this.ticket.description);
  }

  deleteTicket(): void {
      this.dialog.open(ConfirmationDialogComponent, {
          data: { message: 'Czy na pewno chcesz trwale usunąć ten incydent? Tej operacji nie można cofnąć.' }
      }).afterClosed().subscribe(result => {
          if (result) {
              this.isLoading = true;
              this.apiService.request('deleteTicket', 'DELETE', undefined, { id: this.ticket.id })
                  .subscribe({
                      next: () => {
                          this.showNotification('Incydent został usunięty');
                          this.dialogRef.close({ deleted: true });
                      },
                      error: () => {
                          this.isLoading = false;
                          this.showNotification('Błąd podczas usuwania incydentu', true);
                      }
                  });
          }
      });
  }


  loadMessages(): void {
    this.apiService
      .getTicketMessages(this.ticket.id)
      .subscribe({
        next: (response: any) => {
          if (response.success && response.data) {
            this.ticket.messages = response.data;
          }
        }
      });
  }

  sendMessage(): void {
    if (!this.newMessage || this.newMessage.trim().length === 0) {
      return;
    }

    this.isLoading = true;

    const messageCount = this.ticket.messages ? this.ticket.messages.length : 0;
    const user = this.storageService.get('user');
    const senderEmail = user?.email || 'admin@example.com';
    const senderName = (user?.firstName && user?.lastName) ? `${user.firstName} ${user.lastName}` : (user?.username || 'Admin');

    const newMsg: any = {
      ticketId: this.ticket.id,
      senderEmail: senderEmail,
      senderName: senderName,
      senderType: 'admin',
      content: this.newMessage,
      createdDate: new Date().toISOString(),
      attachments: [],
      replyToGroup: this.replyToGroup
    };

    this.apiService.sendTicketMessage(this.ticket.id, newMsg).subscribe({
      next: (response: any) => {
        if (response.success) {
          if (this.ticket.messages) {
             const { replyToGroup, ...msgToAdd } = newMsg;
             this.ticket.messages.push({ ...msgToAdd, id: response.data?.id || (this.ticket.messages.length + 1) });
          }
          this.newMessage = '';
          this.replyToGroup = false;
          this.isLoading = false;
          this.showNotification('Wiadomość została wysłana');

          setTimeout(() => this.scrollToBottom(), 100);
        }
      },
      error: () => {
        this.isLoading = false;
        this.showNotification('Nie udało się wysłać wiadomości', true);
      },
    });
  }

  private scrollToBottom(): void {
    const messagesContainer = document.querySelector(
      '.messages-container'
    ) as HTMLElement;
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      new: 'status-new',
      open: 'status-open',
      'in-progress': 'status-in-progress',
      closed: 'status-closed',
      resolved: 'status-resolved',
      rejected: 'status-rejected',
    };
    return statusMap[status.toLowerCase()] || 'status-open';
  }

  getPriorityClass(priority: string): string {
    const priorityMap: { [key: string]: string } = {
      low: 'priority-low',
      medium: 'priority-medium',
      high: 'priority-high',
      critical: 'priority-critical',
    };
    return priorityMap[priority.toLowerCase()] || 'priority-medium';
  }

  closeDialog(): void {
    if (this.ticketModified) {
        this.dialogRef.close({ updated: true, ticket: this.ticket });
    } else {
        this.dialogRef.close();
    }
  }
}
