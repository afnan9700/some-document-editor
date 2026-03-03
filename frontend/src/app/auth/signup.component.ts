// src/app/auth/signup.component.ts
import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { 
  ReactiveFormsModule, 
  Validators, 
  NonNullableFormBuilder, 
  AbstractControl, 
  ValidationErrors, 
  ValidatorFn 
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';

// The pure validator function hoisted outside the component class
const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) return null;
  return password === confirmPassword ? null : { passwordMismatch: true };
};

@Component({
  selector: 'app-signup',
  imports: [ReactiveFormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col">
      <h1 id="signup-heading" class="text-2xl font-bold text-center mb-6">Sign up</h1>

      <form [formGroup]="form" (ngSubmit)="submit()" aria-labelledby="signup-heading">
        
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

        <label class="form-control w-full mb-3">
          <div class="label"><span class="label-text font-medium">Password</span></div>
          <input 
            id="password" 
            type="password" 
            formControlName="password"
            autocomplete="new-password" 
            required
            aria-required="true"
            class="input input-bordered w-full"
            [class.input-error]="password.invalid && password.touched"
            [attr.aria-invalid]="password.invalid && password.touched" 
          />
        </label>

        <label class="form-control w-full mb-6">
          <div class="label"><span class="label-text font-medium">Confirm Password</span></div>
          <input 
            id="confirmPassword" 
            type="password" 
            formControlName="confirmPassword"
            autocomplete="new-password" 
            required
            aria-required="true"
            class="input input-bordered w-full"
            [class.input-error]="(confirmPassword.invalid || form.hasError('passwordMismatch')) && confirmPassword.touched"
            [attr.aria-invalid]="(confirmPassword.invalid || form.hasError('passwordMismatch')) && confirmPassword.touched" 
          />
          @if (form.hasError('passwordMismatch') && confirmPassword.touched) {
            <div class="label pb-0">
              <span class="label-text-alt text-error font-medium">Passwords do not match.</span>
            </div>
          }
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
            Creating account...
          } @else {
            Create account
          }
        </button>
      </form>

      <div class="divider mt-6 mb-4">OR</div>
      
      <p class="text-center text-sm">
        Already have an account? 
        <a routerLink="/login" class="link link-primary font-medium">Sign in here</a>
      </p>
    </div>
  `
})
export class SignupComponent {
  private fb = inject(NonNullableFormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  // We apply the validator to the entire group configuration
  readonly form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  get username() { return this.form.controls.username; }
  get password() { return this.form.controls.password; }
  get confirmPassword() { return this.form.controls.confirmPassword; }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    // We extract only the username and password to send to the backend, 
    // discarding the confirmPassword as it is strictly client-side UI logic.
    const { username, password } = this.form.getRawValue();
    
    this.auth.signup({ username, password }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl('/');
      },
      error: (err: unknown) => {
        this.loading.set(false);
        const status = (err as { status?: number })?.status;
        if (status === 409) {
          this.error.set('That username is already taken. Please choose another.');
        } else {
          this.error.set('Registration failed. Please check your connection and try again.');
        }
      }
    });
  }
}