import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { User, UserRole } from '../../core/user';
import { UsersApi } from '../../core/users-api';

@Component({
  selector: 'app-reactive-page',
  imports: [ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './reactive-page.html',
  styleUrl: './reactive-page.scss',
})
export class ReactivePage {
  private readonly api = inject(UsersApi);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly destroyRef = inject(DestroyRef);

  readonly users = signal<User[]>([]);
  readonly selected = signal<User | undefined>(undefined);
  readonly listState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly saving = signal(false);
  readonly message = signal('');
  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    email: ['', [Validators.required, Validators.email]],
    role: this.fb.control<UserRole>('employee'),
    company: [''],
    address: this.fb.group({ city: [''], street: [''] }),
    phones: this.fb.array<string>([]),
  });

  constructor() {
    this.form.controls.role.valueChanges.pipe(takeUntilDestroyed()).subscribe((role) => {
      const company = this.form.controls.company;
      company.setValidators(
        role === 'contractor' ? [Validators.required, Validators.pattern(/\S/)] : [],
      );
      company.updateValueAndValidity();
    });
    this.load();
  }

  load() {
    this.listState.set('loading');
    this.api
      .getAll()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users.set(users);
          this.listState.set('ready');
          if (users.length) this.edit(users[0]);
        },
        error: () => this.listState.set('error'),
      });
  }

  edit(user: User) {
    this.selected.set(user);
    this.message.set('');
    const phones = this.form.controls.phones;
    phones.clear();
    for (const phone of user.phones) phones.push(this.fb.control(phone, Validators.required));
    this.form.reset(user);
  }

  addPhone() {
    this.form.controls.phones.push(this.fb.control('', Validators.required));
    this.form.markAsDirty();
  }

  removePhone(index: number) {
    this.form.controls.phones.removeAt(index);
    this.form.markAsDirty();
  }

  save() {
    const user = this.selected();
    if (!user || this.saving()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.message.set('');
    this.api
      .update(user.id, this.form.getRawValue())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.users.update((users) =>
            users.map((item) => (item.id === updated.id ? updated : item)),
          );
          this.edit(updated);
          this.saving.set(false);
          this.message.set('Изменения сохранены.');
        },
        error: () => {
          this.saving.set(false);
          this.message.set('Сохранение не удалось. Проверьте соединение и попробуйте ещё раз.');
        },
      });
  }
}
