import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-ticket-register',
  templateUrl: './ticket-register.component.html',
  styleUrls: ['./ticket-register.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatOptionModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatSnackBarModule,
    MatIconModule
  ]
})
export class TicketRegisterComponent implements OnInit {
  reportForm!: FormGroup;
  isSubmitting = false;
  categories: string[] = [];

  constructor(
    private fb: FormBuilder,
    private apiService: ApiService,
    private snackBar: MatSnackBar,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.reportForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      title: ['', Validators.required],
      category: ['', Validators.required],
      description: ['', Validators.required],
      priority: ['low']
    });

    this.loadCategories();
  }

  loadCategories() {
    this.apiService.getCategories().subscribe({
      next: (data) => this.categories = data,
      error: () => {
        this.categories = ['Hardware', 'Software', 'Sieć', 'HR', 'Inne'];
      }
    });
  }

  submitReport(): void {
    if (this.reportForm.valid) {
      this.isSubmitting = true;
      const formData = this.reportForm.value;
      
      this.apiService.createTicket(formData).subscribe({
        next: (res) => {
          this.isSubmitting = false;
          this.snackBar.open('Zgłoszenie zostało wysłane pomyślnie. Sprawdź swoją skrzynkę mailową.', 'Zamknij', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.isSubmitting = false;
          let errorMessage = 'Wystąpił błąd podczas wysyłania zgłoszenia.';
          
          if (err.status === 429) {
            errorMessage = 'Zbyt wiele zgłoszeń w krótkim czasie. Spróbuj ponownie za chwilę.';
          } else if (err.error && err.error.message) {
            errorMessage = err.error.message;
          }

          this.snackBar.open(errorMessage, 'Zamknij', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    } else {
      this.reportForm.markAllAsTouched();
    }
  }
}