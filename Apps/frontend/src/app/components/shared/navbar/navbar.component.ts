import { Component } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { AsyncPipe, CommonModule } from '@angular/common';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { LoginStatusService } from '../../../services/login-status.service';
import { StorageService } from '../../../services/storage.service';
@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    MatIconModule,
    MatToolbarModule,
    MatButtonModule,
    MatTooltipModule,
    RouterLink,
    AsyncPipe,
    CommonModule
],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.scss'
})
export class NavbarComponent {
 private _isLoggedIn = new BehaviorSubject<boolean>(false);
  isLoggedIn$: Observable<boolean> = this._isLoggedIn.asObservable();
  private loginStatusSubscription!: Subscription;
  admin: string | undefined| number = undefined; 

  constructor(private router: Router, private apiService: ApiService,private loginStatusService: LoginStatusService, private storage: StorageService) {}

  ngOnInit(): void {
    this.checkLoginStatus();
     this.loginStatusSubscription = this.loginStatusService.loginStatusChanged$.subscribe(() => {
      this.checkLoginStatus(); 
    });
    this.admin = this.storage.get('role');
  }
  ngOnChanges(): void {
    this.admin = this.storage.get('role');
  }
  
  ngOnDestroy(): void {
    if (this.loginStatusSubscription) {
      this.loginStatusSubscription.unsubscribe();
    }
  }

  checkLoginStatus(): void {
    if (typeof localStorage === 'undefined') {
      this._isLoggedIn.next(false);
      return;
    }
    
    this.apiService.checkStatus().subscribe({
      next: (res) => {
        if (res.success) {
          this._isLoggedIn.next(true);
        } else {
          this._isLoggedIn.next(false);
        }
      },
      error: () => {
        this._isLoggedIn.next(false);
      }
    });
  }

  logout(): void {
    const clearLocalStorage = () => {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('id');
        localStorage.removeItem('email');
      }
    };

    this.apiService.logout().subscribe({
      next: () => {
        clearLocalStorage();
        this._isLoggedIn.next(false);
        this.router.navigate(['/login']);
        this.loginStatusService.notifyLoginStatusChange();
      },
      error: (err: any) => {
        clearLocalStorage();
        this._isLoggedIn.next(false);
        this.router.navigate(['/login']);
      }
    });
  }
}