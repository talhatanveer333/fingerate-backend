import { Injectable } from '@nestjs/common';
import { AuthService } from './auth';
import { ViewsService } from './commons/views/views.service';

@Injectable()
export class MainService {
  constructor(
    private readonly authService: AuthService,
    private readonly viewsService: ViewsService
  ) {
    authService.adminCreation();
    viewsService.createPaymentRewardRechargeView();
  }
}
