import { Controller, Get, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('date')
  getData() {
    return this.appService.getValue('test-date');
  }

  @Get('date/set')
  @UseGuards(ThrottlerGuard)
  async setData() {
    return this.appService.setValue('test-date', new Date().toISOString());
  }
}
