import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  applyEach,
  applyWhen,
  email,
  form,
  FormField,
  pattern,
  required,
} from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { User, UserPayload } from '../../core/user';
import { UsersApi } from '../../core/users-api';

@Component({
  selector: 'app-signals-page',
  imports: [FormField, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './signals-page.html',
  styleUrl: './signals-page.scss',
})
export class SignalsPage {
  private readonly api = inject(UsersApi);
  private readonly destroyRef = inject(DestroyRef);

  readonly users = signal<User[]>([]);
  readonly selected = signal<User | undefined>(undefined);
  readonly listState = signal<'loading' | 'ready' | 'error'>('loading');
  readonly saving = signal(false);
  readonly message = signal('');
  private readonly draft = signal<UserPayload>({
    name: '',
    email: '',
    role: 'employee',
    company: '',
    address: { city: '', street: '' },
    phones: [],
  });
  readonly form = form(this.draft, (fields) => {
    required(fields.name);
    pattern(fields.name, /\S/);
    required(fields.email);
    email(fields.email);
    applyWhen(
      fields.company,
      ({ valueOf }) => valueOf(fields.role) === 'contractor',
      (company) => {
        required(company);
        pattern(company, /\S/);
      },
    );
    applyEach(fields.phones, (phone) => required(phone));
  });

  constructor() {
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
    const { id, ...payload } = user;
    this.form().reset(structuredClone(payload));
  }

  addPhone() {
    this.form.phones().value.update((phones) => [...phones, '']);
    this.form.phones().markAsDirty();
  }

  removePhone(index: number) {
    this.form.phones().value.update((phones) => phones.filter((_, i) => i !== index));
    this.form.phones().markAsDirty();
  }

  save() {
    const user = this.selected();
    if (!user || this.saving()) return;
    if (this.form().invalid()) {
      this.form().markAsTouched();
      return;
    }
    this.saving.set(true);
    this.message.set('');
    this.api
      .update(user.id, this.draft())
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
