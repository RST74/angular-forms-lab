import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SignalsPage } from './signals-page';
import { User } from '../../core/user';

describe('SignalsPage', () => {
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
  let fixture: ComponentFixture<SignalsPage>;
  let page: SignalsPage;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(SignalsPage);
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
    page.form.role().value.set('contractor');
    page.form.email().value.set('invalid');
    page.save();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Для подрядчика укажите компанию.');
    expect(page.form.company().invalid()).toBe(true);
    expect(page.form.email().touched()).toBe(true);
    http.expectNone(url + '/a1');
    page.form.role().value.set('employee');
    page.form.email().value.set(user.email);
    expect(page.form().valid()).toBe(true);
  });

  it('switches profiles and restores the original phones on cancel', () => {
    http.expectOne(url).flush([user, { ...user, id: 'b2', name: 'Ольга', phones: [] }]);
    fixture.detectChanges();
    const picker: HTMLSelectElement = fixture.nativeElement.querySelector('select');
    picker.selectedIndex = 1;
    picker.dispatchEvent(new Event('change'));
    expect(page.form.phones().value().length).toBe(0);
    page.addPhone();
    fixture.detectChanges();
    expect(picker.disabled).toBe(true);
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('button'),
    );
    buttons.find((button) => button.textContent.includes('Отменить'))!.click();
    expect(page.form.phones().value().length).toBe(0);
    expect(page.form().dirty()).toBe(false);
  });

  it('preserves the draft after failure and sends one PUT on retry', () => {
    http.expectOne(url).flush([user]);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
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
    expect(page.form.name().value()).toBe('Мария');
    expect(page.form().dirty()).toBe(true);
    page.save();
    page.save();
    http.expectOne(url + '/a1').flush({ ...user, name: 'Мария', phones: [] });
    expect(page.users()[0].name).toBe('Мария');
    expect(page.form().dirty()).toBe(false);
    expect(page.message()).toBe('Изменения сохранены.');
  });
});
