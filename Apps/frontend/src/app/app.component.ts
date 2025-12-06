import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule, HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  template: `
    <div class="main-container">

      <header class="header">
        <h1>System Zgłoszeń Incydentów</h1>
        <p>Panel użytkownika i administratora</p>
      </header>

      <section class="actions">
        <button class="btn primary" (click)="showLogin = true; 
showRegister = false;">Zaloguj się</button>
        <button class="btn secondary" (click)="showRegister = true; 
showLogin = false;">Zarejestruj się</button>
      </section>

      <section *ngIf="showLogin" class="form-section">
        <h2>Logowanie</h2>
        <input type="text" placeholder="Email" [(ngModel)]="loginEmail">
        <input type="password" placeholder="Hasło" 
[(ngModel)]="loginPassword">
        <button class="btn primary" (click)="login()">Zaloguj</button>
        <p class="message">{{ loginMessage }}</p>
      </section>

      <section *ngIf="showRegister" class="form-section">
        <h2>Rejestracja</h2>
        <input type="text" placeholder="Username" 
[(ngModel)]="registerUsername">
        <input type="text" placeholder="Email" 
[(ngModel)]="registerEmail">
        <input type="password" placeholder="Hasło" 
[(ngModel)]="registerPassword">
        <button class="btn primary" 
(click)="register()">Zarejestruj</button>
        <p class="message">{{ registerMessage }}</p>
      </section>

      <section class="info" *ngIf="!showLogin && !showRegister">
        <div class="card">
          <h3>Zgłaszaj incydenty</h3>
          <p>Szybko zgłoś problem do administratora.</p>
        </div>
        <div class="card">
          <h3>️ Panel admina</h3>
          <p>Zarządzaj ticketami i ich statusem.</p>
        </div>
        <div class="card">
          <h3>Powiadomienia</h3>
          <p>Użytkownik otrzyma maila po zmianie statusu.</p>
        </div>
      </section>

      <footer class="footer">
        <p>Projekt Bezpieczeństwo Sieci Komputerowych II</p>
      </footer>
    </div>
  `,
  styles: [`
    .main-container {
      min-height: 100vh;
      font-family: Arial, sans-serif;
      background: linear-gradient(to right, #4f46e5, #3b82f6);
      color: white;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }

    .header { margin-top: 40px; text-align: center; }
    .header h1 { font-size: 36px; margin-bottom: 10px; }

    .actions { margin-top: 30px; display: flex; gap: 20px; }
    .btn { padding: 12px 24px; border-radius: 10px; border: none; 
font-size: 16px; cursor: pointer; }
    .primary { background-color: #22c55e; color: white; }
    .secondary { background-color: white; color: #1e3a8a; }

    .form-section { margin-top: 30px; display: flex; flex-direction: 
column; gap: 10px; width: 300px; }
    .form-section input { padding: 8px; border-radius: 5px; border: none; 
}
    .message { color: yellow; font-size: 14px; }

    .info { margin-top: 50px; display: flex; gap: 20px; flex-wrap: wrap; 
justify-content: center; }
    .card { background-color: rgba(255,255,255,0.15); padding: 20px 25px; 
border-radius: 15px; width: 220px; text-align: center; }

    .footer { margin-top: auto; margin-bottom: 20px; opacity: 0.8; }
  `]
})
export class AppComponent {
  showLogin = false;
  showRegister = false;

  loginEmail = '';
  loginPassword = '';
  loginMessage = '';

  registerUsername = '';
  registerEmail = '';
  registerPassword = '';
  registerMessage = '';

  constructor(private http: HttpClient) {}

  login() {
    this.http.post('http://localhost:5000/api/login', {
      email: this.loginEmail,
      password: this.loginPassword
    }).subscribe({
      next: (res:any) => this.loginMessage = 'Zalogowano!',
      error: err => this.loginMessage = 'Błąd logowania'
    });
  }

  register() {
    this.http.post('http://localhost:5000/api/register', {
      username: this.registerUsername,
      email: this.registerEmail,
      password: this.registerPassword
    }).subscribe({
      next: (res:any) => this.registerMessage = 'Zarejestrowano!',
      error: err => this.registerMessage = 'Błąd rejestracji'
    });
  }
}

