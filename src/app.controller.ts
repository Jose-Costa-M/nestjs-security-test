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
// =============================================================

// VULN-01: Secrets hardcodeados
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

  // VULN-02: SQL Injection — parámetro de ruta
  @Get('users/:id')
  getUser(@Param('id') id: string) {
    const query = `SELECT * FROM users WHERE id = ${id}`;
    return { query };
  }

  // VULN-03: SQL Injection — búsqueda con LIKE
  @Get('search')
  searchUsers(@Body('term') term: string) {
    const query = `SELECT * FROM users WHERE name LIKE '%${term}%'`;
    return { query };
  }

  // VULN-04: eval() — ejecución de código arbitrario
  @Post('calc')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  calculate(@Body('formula') formula: string): any {
    // eslint-disable-next-line no-eval
    const result = eval(formula);
    return { result };
  }

  // VULN-05: Log de credenciales en texto plano
  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    console.log(
      `[AUTH] usuario: ${body.username} password: ${body.password}`,
    );
    console.log(`[AUTH] secret: ${JWT_SECRET_KEY}`);
    return { status: 'ok' };
  }

  // VULN-06: XSS — dangerouslySetInnerHTML sin sanitizar
  @Get('render')
  renderContent(@Body('html') html: string) {
    return `<div dangerouslySetInnerHTML={{ __html: ${html} }} />`;
  }

  // VULN-07: Path Traversal
  @Get('files/:filename')
  getFile(@Param('filename') filename: string) {
    const path = `/var/app/uploads/${filename}`;
    return { path };
  }

  // VULN-08: IDOR — sin verificación de ownership
  @Get('profile/:userId')
  getProfile(@Param('userId') userId: string) {
    return { userId, data: 'datos sensibles del usuario' };
  }

  // VULN-09: Exposición de variables de entorno
  @Get('debug')
  debug(@Headers() headers: Record<string, string>, @Req() req: Request) {
    return {
      headers,
      ip: req.ip,
      // eslint-disable-next-line node/no-process-env
      env: process.env,
    };
  }

  // VULN-10: ReDoS — regex catastrófico
  @Post('validate-email')
  validateEmail(@Body('email') email: string) {
    const regex =
      /^([a-zA-Z0-9])+([a-zA-Z0-9._-])*@([a-zA-Z0-9_-])+([a-zA-Z0-9._-]+)+$/;
    return { valid: regex.test(email) };
  }

  // VULN-11: Mass Assignment — body sin whitelist
  @Post('users')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createUser(@Body() body: any) {
    return { created: body };
  }

  // VULN-12: Stack trace expuesto
  @Delete('users/:id')
  deleteUser(@Param('id') _id: string) {
    try {
      throw new Error(
        'DB Error: relation "users" does not exist at /internal/db/query.ts:42',
      );
    } catch (err) {
      const error = err as Error;
      return {
        error: error.message,
        stack: error.stack,
      };
    }
  }

  // Referencia para evitar unused-vars de DB_CONNECTION_STRING
  @Get('config')
  getConfig() {
    return { db: DB_CONNECTION_STRING };
  }
}
