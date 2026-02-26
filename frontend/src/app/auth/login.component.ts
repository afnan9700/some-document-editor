// src/app/auth/login.component.ts
import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  Validators,
  NonNullableFormBuilder,
} from '@angular/forms';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `
    <main class="max-w-lg mx-auto p-6">
      <h1 class="text-2xl font-semibold mb-4">Sign in</h1>

      <form [formGroup]="form" (ngSubmit)="submit()" aria-labelledby="login-heading">
        <label for="username" class="block mb-1">Username</label>

        <input
          id="username"
          type="text"
          formControlName="username"
          autocomplete="username"
          required
          aria-required="true"
          class="input input-bordered w-full mb-3"
          [attr.aria-invalid]="username.invalid && username.touched"
        />

        <label for="password" class="block mb-1">Password</label>

        <input
          id="password"
          type="password"
          formControlName="password"
          autocomplete="current-password"
          required
          aria-required="true"
          class="input input-bordered w-full mb-3"
          [attr.aria-invalid]="password.invalid && password.touched"
        />

        @if (error()) {
          <div class="text-sm text-error mb-2" role="alert" aria-live="assertive">
            {{ error() }}
          </div>
        }

        <button type="submit" class="btn btn-primary w-full" [disabled]="loading() || form.invalid">
          @if (loading()) {
            <span>Signing in…</span>
          } @else {
            <span>Sign in</span>
          }
        </button>
      </form>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  // form (reactive)
  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // signals
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  get username() {
    return this.form.controls.username;
  }
  get password() {
    return this.form.controls.password;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    const value = this.form.getRawValue();
    this.auth.login(value).subscribe({
      next: () => {
        this.loading.set(false);

        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        if (err && err.status === 401) this.error.set('Invalid credentials');
        else this.error.set('Login failed — try again');
      },
    });
  }
}
