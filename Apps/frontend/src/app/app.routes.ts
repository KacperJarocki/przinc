import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page.component';
import { LoginComponent } from './components/login/login.component';
import { AdminPanelComponent } from './components/admin-panel/admin-panel.component';
import { TicketRegisterComponent } from './components/ticket-register/ticket-register.component';
import { roleGuard } from './guards/role.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'register-ticket', component: TicketRegisterComponent },
    { path: 'home', component: LandingPageComponent },
    { path: 'admin', component: AdminPanelComponent, canActivate: [authGuard, roleGuard], data: { roles: ['admin'] } },

    { path: '**', redirectTo: 'home' }
];
