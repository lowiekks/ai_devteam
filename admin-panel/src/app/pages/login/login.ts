import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private authService = inject(AuthService);

  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);

  async onSubmit() {
    if (!this.email() || !this.password()) {
      this.error.set('Please enter email and password');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    try {
      await this.authService.signIn(this.email(), this.password());
    } catch (error: any) {
      this.error.set(error.message || 'Login failed. Please check your credentials.');
    } finally {
      this.loading.set(false);
    }
  }
}
