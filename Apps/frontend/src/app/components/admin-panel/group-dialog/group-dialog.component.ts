import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { TicketGroup } from '../../../models/ticket-group';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-group-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule,
    MatSnackBarModule
  ],
  templateUrl: './group-dialog.component.html',
  styleUrls: ['./group-dialog.component.scss']
})
export class GroupDialogComponent implements OnInit {
  groups: TicketGroup[] = [];
  selectedGroupId: number | null = null;
  newGroupForm: FormGroup;
  isLoading = false;

  constructor(
    public dialogRef: MatDialogRef<GroupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { ticketIds: number[] },
    private apiService: ApiService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.newGroupForm = this.fb.group({
      name: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.loadGroups();
  }

  loadGroups(): void {
    this.apiService.getTicketGroups().subscribe({
      next: (response) => {
        this.groups = response.data || [];
      }
    });
  }

  confirm(): void {    
    if (this.newGroupForm.valid && this.newGroupForm.value.name) {
       this.createGroupAndAssign();
    } else if (this.selectedGroupId) {
       this.assignToGroup(this.selectedGroupId);
    } else {
       this.newGroupForm.markAllAsTouched();
    }
  }

  createGroupAndAssign(): void {
    this.isLoading = true;
    const groupData = {
      ...this.newGroupForm.value,
      createdBy: localStorage.getItem('email')
    };

    this.apiService.createTicketGroup(groupData).subscribe({
      next: (res) => {
        const newGroupId = res.data.id;
        this.assignToGroup(newGroupId);
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  assignToGroup(groupId: number): void {
    this.isLoading = true;
    let completed = 0;
    const total = this.data.ticketIds.length;
    let errors = 0;

    if (total === 0) {
      this.dialogRef.close(true);
      return;
    }

    this.data.ticketIds.forEach(ticketId => {
      this.apiService.addTicketToGroup(groupId, ticketId).subscribe({
        next: () => {
          completed++;
          this.checkCompletion(completed, total, errors);
        },
        error: () => {
          completed++;
          errors++;
          this.checkCompletion(completed, total, errors);
        }
      });
    });
  }

  checkCompletion(completed: number, total: number, errors: number): void {
    if (completed === total) {
      this.isLoading = false;
      if (errors > 0) {
        this.snackBar.open(`Ukończono z ${errors} błędami`, 'Zamknij', { duration: 5000, panelClass: ['error-snackbar'] });
      } else {
        this.snackBar.open('Pomyślnie przypisano do grupy', 'OK', { duration: 3000 });
      }
      this.dialogRef.close(true);
    }
  }
}
