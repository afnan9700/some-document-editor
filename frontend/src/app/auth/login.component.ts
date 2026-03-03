// src/app/auth/login.component.ts
import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { ReactiveFormsModule, Validators, NonNullableFormBuilder } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

@Component({
  selector: 'app-login',
  // standalone: true is intentionally omitted (Angular v20+ default)
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col">
      <h1 id="login-heading" class="text-2xl font-bold text-center mb-6">Sign in</h1>

      <form [formGroup]="form" (ngSubmit)="submit()" aria-labelledby="login-heading">
        
        <label class="form-control w-full mb-3">
          <div class="label pt-0"><span class="label-text font-medium">Username</span></div>
          <input
            id="username"
            type="text"
            formControlName="username"
            autocomplete="username"
            required
            aria-required="true"
            class="input input-bordered w-full"
            [class.input-error]="username.invalid && username.touched"
            [attr.aria-invalid]="username.invalid && username.touched"
          />
        </label>

        <label class="form-control w-full mb-6">
          <div class="label"><span class="label-text font-medium">Password</span></div>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            required
            aria-required="true"
            class="input input-bordered w-full"
            [class.input-error]="password.invalid && password.touched"
            [attr.aria-invalid]="password.invalid && password.touched"
          />
        </label>

        @if (error()) {
          <div class="alert alert-error text-sm rounded-box mb-4 p-3" role="alert" aria-live="assertive">
            <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-5 w-5" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>{{ error() }}</span>
          </div>
        }

        <button type="submit" class="btn btn-primary w-full" [disabled]="loading() || form.invalid">
          @if (loading()) {
            <span class="loading loading-spinner loading-sm"></span>
            Signing in...
          } @else {
            Sign in
          }
        </button>
      </form>

      <div class="divider mt-6 mb-4">OR</div>
      
      <p class="text-center text-sm">
        Don't have an account? 
        <a routerLink="/signup" class="link link-primary font-medium">Create one</a>
      </p>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  get username() { return this.form.controls.username; }
  get password() { return this.form.controls.password; }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        // Type-checking the error payload is safer than assuming err.status exists on 'unknown'
        const status = (err as { status?: number })?.status;
        if (status === 401) {
            this.error.set('Invalid credentials. Please verify your username and password.');
        } else {
            this.error.set('An unexpected error occurred. Please try again.');
        }
      },
    });
  }
}