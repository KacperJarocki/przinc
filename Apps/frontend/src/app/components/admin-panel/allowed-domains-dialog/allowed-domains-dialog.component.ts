import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

@Component({
  selector: 'app-allowed-domains-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatInputModule, 
    MatFormFieldModule, 
    MatListModule, 
    MatIconModule,
    FormsModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>Zarządzaj dozwolonymi domenami</h2>
    <div mat-dialog-content>
      <p class="description">Tylko użytkownicy z adresami email w tych domenach będą mogli tworzyć nowe zgłoszenia. Jeśli lista jest pusta, każdy może zgłosić incydent.</p>
      
      <div class="add-container">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Dozwolona domena (np. &#64;gmail.com)</mat-label>
          <input matInput [(ngModel)]="newDomain" (keyup.enter)="addDomain()" placeholder="&#64;firma.pl">
        </mat-form-field>
        <button mat-mini-fab color="primary" (click)="addDomain()" [disabled]="!newDomain">
          <mat-icon>add</mat-icon>
        </button>
      </div>

      <mat-list>
        <mat-list-item *ngFor="let domain of domains">
          <span matListItemTitle>{{domain.domain}}</span>
          <button mat-icon-button color="warn" (click)="deleteDomain(domain.id)" matListItemMeta>
            <mat-icon>delete</mat-icon>
          </button>
        </mat-list-item>
        <mat-list-item *ngIf="domains.length === 0">
          <span class="empty-list">Brak zdefiniowanych ograniczeń domenowych.</span>
        </mat-list-item>
      </mat-list>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button (click)="close()">Zamknij</button>
    </div>
  `,
  styles: [`
    .full-width { width: 100%; }
    .add-container { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .add-container mat-form-field { flex: 1; margin-bottom: 0; }
    .description { color: #666; font-size: 0.9em; margin-bottom: 20px; }
    .empty-list { font-style: italic; color: #888; }
  `]
})
export class AllowedDomainsDialogComponent {
  domains: any[] = [];
  newDomain: string = '';

  constructor(
    private apiService: ApiService,
    private dialogRef: MatDialogRef<AllowedDomainsDialogComponent>,
    private snackBar: MatSnackBar
  ) {
    this.loadDomains();
  }

  loadDomains() {
    this.apiService.getAllowedDomains().subscribe({
      next: (data: any) => this.domains = data
   });
  }

  addDomain() {
    if (!this.newDomain) return;
    
    let domain = this.newDomain.trim();
    if (!domain.startsWith('@')) domain = '@' + domain;

    this.apiService.addAllowedDomain(domain).subscribe({
      next: () => {
        this.newDomain = '';
        this.loadDomains();
        this.snackBar.open('Domena dodana', 'OK', { duration: 3000 });
      },
      error: () => { this.snackBar.open('Błąd podczas dodawania domeny', 'Zamknij', { duration: 3000 }); }
    });
  }

  deleteDomain(id: number) {
    if (confirm('Czy na pewno usunąć tę domenę?')) {
      this.apiService.deleteAllowedDomain(id).subscribe({
        next: () => {
          this.loadDomains();
          this.snackBar.open('Domena usunięta', 'OK', { duration: 3000 });
        }
      });
    }
  }

  close() {
    this.dialogRef.close();
  }
}
