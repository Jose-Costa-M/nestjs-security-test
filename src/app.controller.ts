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
// Cada vulnerabilidad está numerada y etiquetada con su tipo
// =============================================================

// VULN-01: Secret hardcodeado en módulo
const DB_CONNECTION = 'postgresql://admin:Inol4b$uper$ecret@prod-db.inolab.com:5432/clientes';
const JWT_SECRET_KEY = 'mi-jwt-secret-inolab-2024-produccion';
const OPENAI_TOKEN = 'sk-aBcDeFgHiJkLmNoPqRsTuVwXyZ1234567890abcde';

@Controller('api')
export class AppController {
  constructor(private readonly appService: AppService) {}

  // ----------------------------------------------------------
  // VULN-02: SQL Injection
  // El id del usuario se interpola directo en la query
  // Un atacante puede mandar: 1 OR 1=1 --
  // ----------------------------------------------------------
  @Get('users/:id')
  async getUser(@Param('id') id: string) {
    const query = `SELECT * FROM users WHERE id = ${id}`;
    return { query };
  }

  // ----------------------------------------------------------
  // VULN-03: SQL Injection en búsqueda
  // Un atacante puede mandar: ' OR '1'='1
  // ----------------------------------------------------------
  @Get('search')
  async searchUsers(@Body('term') term: string) {
    const query = `SELECT * FROM users WHERE name LIKE '%${term}%'`;
    return { query };
  }

  // ----------------------------------------------------------
  // VULN-04: eval() — ejecución de código arbitrario
  // Un atacante puede mandar: process.exit(1) o peor
  // ----------------------------------------------------------
  @Post('calc')
  calculate(@Body('formula') formula: string) {
    const result = eval(formula);
    return { result };
  }

  // ----------------------------------------------------------
  // VULN-05: Log de credenciales
  // Las passwords aparecen en texto plano en los logs
  // ----------------------------------------------------------
  @Post('login')
  async login(@Body() body: { username: string; password: string }) {
    console.log(`[AUTH] usuario: ${body.username} password: ${body.password}`);
    console.log(`[AUTH] token generado con secret: ${JWT_SECRET_KEY}`);
    return { status: 'ok' };
  }

  // ----------------------------------------------------------
  // VULN-06: XSS — HTML sin sanitizar
  // Un atacante puede inyectar <script>alert('xss')</script>
  // ----------------------------------------------------------
  @Get('render')
  renderContent(@Body('html') html: string) {
    return `<div dangerouslySetInnerHTML={{ __html: ${html} }} />`;
  }

  // ----------------------------------------------------------
  // VULN-07: Path traversal
  // Un atacante puede mandar: ../../etc/passwd
  // ----------------------------------------------------------
  @Get('files/:filename')
  getFile(@Param('filename') filename: string) {
    const path = `/var/app/uploads/${filename}`;
    // fs.readFileSync(path) — acceso a cualquier archivo del servidor
    return { path };
  }

  // ----------------------------------------------------------
  // VULN-08: IDOR — acceso a recursos sin verificar ownership
  // Cualquier usuario autenticado puede ver datos de otro usuario
  // ----------------------------------------------------------
  @Get('profile/:userId')
  getProfile(@Param('userId') userId: string) {
    // No verifica que req.user.id === userId
    return { userId, data: 'datos sensibles del usuario' };
  }

  // ----------------------------------------------------------
  // VULN-09: Header de autenticación expuesto en respuesta
  // ----------------------------------------------------------
  @Get('debug')
  debug(@Headers() headers: Record<string, string>, @Req() req: Request) {
    return {
      headers,              // expone Authorization, cookies, etc.
      ip: req.ip,
      env: process.env,    // expone TODAS las variables de entorno
    };
  }

  // ----------------------------------------------------------
  // VULN-10: Regex catastrófico — ReDoS
  // Un atacante puede mandar un string largo que congela el servidor
  // ----------------------------------------------------------
  @Post('validate-email')
  validateEmail(@Body('email') email: string) {
    const regex = /^([a-zA-Z0-9])+([a-zA-Z0-9._-])*@([a-zA-Z0-9_-])+([a-zA-Z0-9._-]+)+$/;
    return { valid: regex.test(email) };
  }

  // ----------------------------------------------------------
  // VULN-11: Mass assignment — acepta cualquier campo del body
  // Un atacante puede mandar: { "role": "admin", "isAdmin": true }
  // ----------------------------------------------------------
  @Post('users')
  createUser(@Body() body: any) {
    // Sin whitelist — cualquier campo del body se guarda
    return { created: body };
  }

  // ----------------------------------------------------------
  // VULN-12: Información sensible en mensaje de error
  // Stack traces y detalles internos expuestos al cliente
  // ----------------------------------------------------------
  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    try {
      throw new Error('DB Error: relation "users" does not exist at /internal/db/query.ts:42');
    } catch (error) {
      return {
        error: error.message,  // expone stack trace y rutas internas
        stack: error.stack,
      };
    }
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
