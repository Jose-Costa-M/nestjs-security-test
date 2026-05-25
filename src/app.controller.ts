import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // ❌ eval con input del usuario
  @Post('calc')
  calculate(@Body('formula') formula: string) {
    const result = eval(formula);
    return { result };
  }

  // ❌ Secret hardcodeado
  @Get('token')
  getToken() {
    const JWT_SECRET = 'hardcoded-secret-key-12345';
    return { token: JWT_SECRET };
  }
}
