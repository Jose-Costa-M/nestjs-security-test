import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Headers,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { AppService } from './app.service';

// =============================================================
// ARCHIVO DE PRUEBA — VULNERABILIDADES INTENCIONALES
// Detectadas por: Gitleaks (VULN-01), Semgrep (VULN-01,02,03,04,05)
// Requieren revisión manual: VULN-06 al 12
// =============================================================

// VULN-01: Secrets hardcodeados — detectado por Gitleaks + Semgrep
const DB_CONNECTION_STRING =
  'postgresql://admin:Inol4b$uper$ecret@prod-db.inolab.com:5432/clientes';
const JWT_SECRET_KEY = 'mi-jwt-secret-inolab-2024-produccion';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // VULN-02: SQL Injection — detectado por Semgrep
  @Get('users/:id')
  getUser(@Param('id') id: string) {
    const query = `SELECT * FROM users WHERE id = ${id}`;
    return { query };
  }

  // VULN-03: SQL Injection con LIKE — detectado por Semgrep
  @Get('search')
  searchUsers(@Body('term') term: string) {
    const query = `SELECT * FROM users WHERE name LIKE '%${term}%'`;
    return { query };
  }

  // VULN-04: eval() RCE — detectado por Semgrep + ESLint (no-eval)
  @Post('calc')
  calculate(@Body('formula') formula: string) {
    // eslint-disable-next-line no-eval
    const result = eval(formula);
    return { result };
  }

  // VULN-05: Log de credenciales — detectado por Semgrep
  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    console.log(`[AUTH] usuario: ${body.username} password: ${body.password}`);
    console.log(`[AUTH] secret: ${JWT_SECRET_KEY}`);
    return { status: 'ok' };
  }

  // VULN-06: XSS — revisión manual
  @Get('render')
  renderContent(@Body('html') html: string) {
    return `<div dangerouslySetInnerHTML={{ __html: ${html} }} />`;
  }

  // VULN-07: Path Traversal — revisión manual
  @Get('files/:filename')
  getFile(@Param('filename') filename: string) {
    const filePath = `/var/app/uploads/${filename}`;
    return { filePath };
  }

  // VULN-08: IDOR — revisión manual
  @Get('profile/:userId')
  getProfile(@Param('userId') userId: string) {
    return { userId, data: 'datos sensibles del usuario' };
  }

  // VULN-09: Exposición de process.env — revisión manual
  @Get('debug')
  debug(@Headers() headers: Record<string, string>, @Req() req: Request) {
    return {
      headers,
      ip: req.ip,
      env: process.env,
    };
  }

  // VULN-10: ReDoS — revisión manual
  @Post('validate-email')
  validateEmail(@Body('email') email: string) {
    const regex =
      /^([a-zA-Z0-9])+([a-zA-Z0-9._-])*@([a-zA-Z0-9_-])+([a-zA-Z0-9._-]+)+$/;
    return { valid: regex.test(email) };
  }

  // VULN-11: Mass Assignment — revisión manual
  @Post('users')
  createUser(@Body() body: Record<string, unknown>) {
    return { created: body };
  }

  // VULN-12: Stack trace expuesto — revisión manual
  @Delete('users/:id')
  deleteUser(@Param('id') _id: string) {
    try {
      throw new Error(
        'DB Error: relation "users" does not exist at /internal/db/query.ts:42',
      );
    } catch (err) {
      const error = err as Error;
      return { error: error.message, stack: error.stack };
    }
  }

  // Referencia para DB_CONNECTION_STRING
  @Get('config')
  getConfig() {
    return { db: DB_CONNECTION_STRING };
  }
}
