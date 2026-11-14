import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactivePage } from './reactive-page';

describe('ReactivePage', () => {
  let component: ReactivePage;
  let fixture: ComponentFixture<ReactivePage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReactivePage],
    }).compileComponents();

    fixture = TestBed.createComponent(ReactivePage);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
