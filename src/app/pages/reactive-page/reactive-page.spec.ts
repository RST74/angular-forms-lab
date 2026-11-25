import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactivePage } from './reactive-page';
import { User } from '../../core/user';

describe('ReactivePage', () => {
  const url = 'http://localhost:3000/users';
  const user: User = {
    id: 'a1',
    name: 'Иван',
    email: 'ivan@example.com',
    role: 'employee',
    company: '',
    address: { city: 'Минск', street: '' },
    phones: ['123'],
  };
  let fixture: ComponentFixture<ReactivePage>;
  let page: ReactivePage;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(ReactivePage);
    page = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('shows the empty state after a failed load and retry', () => {
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    http.expectOne(url).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('В базе пока нет пользователей');
  });

  it('validates the contractor company and the email before sending', () => {
    http.expectOne(url).flush([user]);
    page.form.patchValue({ role: 'contractor', email: 'invalid' });
    page.save();
    expect(page.form.controls.company.invalid).toBe(true);
    expect(page.form.controls.email.touched).toBe(true);
    http.expectNone(url + '/a1');
    page.form.patchValue({ role: 'employee', email: user.email });
    expect(page.form.valid).toBe(true);
  });

  it('switches profiles and restores the original phones on cancel', () => {
    http.expectOne(url).flush([user, { ...user, id: 'b2', name: 'Ольга', phones: [] }]);
    fixture.detectChanges();
    const picker: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    picker.selectedIndex = 1;
    picker.dispatchEvent(new Event('change'));
    expect(page.form.controls.phones.length).toBe(0);
    page.addPhone();
    fixture.detectChanges();
    expect(picker.disabled).toBe(true);
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    buttons.find((button) => button.textContent.includes('Отменить'))!.click();
    expect(page.form.controls.phones.length).toBe(0);
    expect(page.form.pristine).toBe(true);
  });

  it('preserves the draft after failure and sends one PUT on retry', () => {
    http.expectOne(url).flush([user]);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName=name]');
    input.value = 'Мария';
    input.dispatchEvent(new Event('input'));
    page.removePhone(0);
    const form: HTMLFormElement = fixture.nativeElement.querySelector('form');
    form.dispatchEvent(new Event('submit'));
    const first = http.expectOne(url + '/a1');
    expect(first.request.method).toBe('PUT');
    expect(first.request.body).toEqual({
      name: 'Мария',
      email: user.email,
      role: user.role,
      company: '',
      address: user.address,
      phones: [],
    });
    first.flush({}, { status: 500, statusText: 'Error' });
    expect(page.form.controls.name.value).toBe('Мария');
    expect(page.form.dirty).toBe(true);
    page.save();
    page.save();
    http.expectOne(url + '/a1').flush({ ...user, name: 'Мария', phones: [] });
    expect(page.users()[0].name).toBe('Мария');
    expect(page.form.pristine).toBe(true);
    expect(page.message()).toBe('Изменения сохранены.');
  });
});
