import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Preferences } from '../core/models';
import { SessionService } from '../core/session.service';
import { httpErrorMessage } from '../core/http-error-message';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  busy = false;
  message = '';
  preferences: Preferences;

  constructor(
    private router: Router,
    private auth: AuthService,
    public session: SessionService,
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {
    this.preferences = this.session.getPreferences();
  }

  async login(): Promise<void> {
    this.message = '';
    if (this.username === null || this.username === undefined || String(this.username).trim() === '') {
      this.message = 'Ingrese un usuario.';
      return;
    }
    if (this.password === null || this.password === undefined || String(this.password).trim() === '') {
      this.message = 'Ingrese una contraseña.';
      return;
    }
    this.busy = true;
    try {
      const response = await this.auth.login({ username: this.username, password: this.password });
      if (response && response.token) {
        this.session.save(response.token, response.user, this.preferences);
        await this.router.navigate(['/dashboard']);
      } else {
        this.message = 'El backend respondió sin token.';
      }
    } catch (error: unknown) {
      this.message = 'No se pudo autenticar a ' + this.username + '. ' + httpErrorMessage(error, 'login');
    } finally {
      this.zone.run(() => {
        this.busy = false;
        this.cdr.detectChanges();
      });
    }
  }
}
