import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { LoadingService } from '../../services/loading.service';
import { LoginStatusService } from '../../services/login-status.service';
import { StorageService } from '../../services/storage.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    MatFormFieldModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  loginForm: FormGroup;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private apiService: ApiService,
    public loadingService: LoadingService,
    private loginStatusService: LoginStatusService,
    private storageService: StorageService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
    });
  }

  get email() { return this.loginForm.get('email'); }
  get password() { return this.loginForm.get('password'); }

  submit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.error = null;
    const { email, password } = this.loginForm.value;
    this.loadingService.startLoading();

    this.apiService.login(email, password).subscribe({
      next: (res) => {
        if (res.data) {
          this.storageService.set('role', res.data.role?.toString() || 'user');
          this.storageService.set('id', res.data.id?.toString() || '');
          this.storageService.set('email', res.data.email || '');
        }
        this.loadingService.stopLoading();
        this.loginStatusService.notifyLoginStatusChange();
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loadingService.stopLoading();

        if (err instanceof HttpErrorResponse) {
           if (err.status === 401) {
             this.error = 'Błędny email lub hasło';
           } else if (err.status === 429) {
             this.error = 'Zbyt wiele prób logowania. Spróbuj ponownie za chwilę.';
           } else if (err.status === 404) {
             this.error = 'Błędny email lub hasło';
           } else {
             if (err.error && err.error.message) {
               this.error = err.error.message;
             } else {
               this.error = 'Wystąpił błąd podczas logowania. Spróbuj ponownie.';
             }
           }
        } else {
          this.error = 'Wystąpił nieoczekiwany błąd.';
        }
      }
    });
  }
}