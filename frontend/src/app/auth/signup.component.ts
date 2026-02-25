// src/app/auth/signup.component.ts
import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import {
  ReactiveFormsModule,
  Validators,
  NonNullableFormBuilder,
} from '@angular/forms';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-signup',
  standalone: true, // Added to match Login
  imports: [ReactiveFormsModule], // Added to match Login
  template: `
    <main class="max-w-lg mx-auto p-6">
      <h1 id="signup-heading" class="text-2xl font-semibold mb-4">Create account</h1>

      <form [formGroup]="form" (ngSubmit)="submit()" aria-labelledby="signup-heading">
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
          autocomplete="new-password"
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
            <span>Creating…</span>
          } @else {
            <span>Create account</span>
          }
        </button>
      </form>
    </main>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupComponent {
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  // Form (Reactive)
  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  // Signals
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  // Getters for template access (Matching your Login pattern)
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

    const payload = this.form.getRawValue();

    this.auth.signup(payload).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err) => {
        this.loading.set(false);
        if (err && err.status === 409) {
          this.error.set('Username already taken');
        } else {
          this.error.set('Signup failed — try again');
        }
      },
    });
  }
}