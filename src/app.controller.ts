import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  Req,
  Query,
} from '@nestjs/common';
import { Request } from 'express';
import * as crypto from 'crypto';
import { AppService } from './app.service';

// =============================================================
// ARCHIVO DE PRUEBA — VULNERABILIDADES INTENCIONALES
// Detectadas por: Gitleaks (VULN-01), Semgrep (VULN-01..05)
// Revisión manual: VULN-06..20
// =============================================================

// VULN-01: Secrets hardcodeados
const DB_CONNECTION_STRING =
  'postgresql://admin:Inol4b$uper$ecret@prod-db.inolab.com:5432/clientes';
const JWT_SECRET_KEY = 'mi-jwt-secret-inolab-2024-produccion';
const AZURE_STORAGE_KEY =
  'DefaultEndpointsProtocol=https;AccountName=inolab;AccountKey=dGVzdGtleWJhc2U2NGVuY29kZWRmb3Jpbm9sYWJ0ZXN0aW5ncHVycG9zZXM=;EndpointSuffix=core.windows.net';

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

  // VULN-03: SQL Injection con LIKE
  @Get('search')
  searchUsers(@Query('term') term: string) {
    const query = `SELECT * FROM users WHERE name LIKE '%${term}%'`;
    return { query };
  }

  // VULN-04: eval() — RCE
  @Post('calc')
  calculate(@Body('formula') formula: string) {
    // eslint-disable-next-line no-eval
    const result = eval(formula);
    return { result };
  }

  // VULN-05: Log de credenciales
  @Post('login')
  login(@Body() body: { username: string; password: string }) {
    console.log(`[AUTH] usuario: ${body.username} password: ${body.password}`);
    console.log(`[AUTH] secret: ${JWT_SECRET_KEY}`);
    return { status: 'ok' };
  }

  // VULN-06: XSS — HTML sin sanitizar
  @Get('render')
  renderContent(@Body('html') html: string) {
    return `<div dangerouslySetInnerHTML={{ __html: ${html} }} />`;
  }

  // VULN-07: Path Traversal
  @Get('files/:filename')
  getFile(@Param('filename') filename: string) {
    const filePath = `/var/app/uploads/${filename}`;
    return { filePath };
  }

  // VULN-08: IDOR — sin verificación de ownership
  @Get('profile/:userId')
  getProfile(@Param('userId') userId: string) {
    return { userId, data: 'datos sensibles del usuario' };
  }

  // VULN-09: Exposición de process.env completo
  @Get('debug')
  debug(@Headers() headers: Record<string, string>, @Req() req: Request) {
    return {
      headers,
      ip: req.ip,
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
  createUser(@Body() body: Record<string, unknown>) {
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
      return { error: error.message, stack: error.stack };
    }
  }

  // VULN-13: Algoritmo de hash débil (MD5)
  @Post('hash')
  hashPassword(@Body('password') password: string) {
    const hash = crypto.createHash('md5').update(password).digest('hex');
    return { hash };
  }

  // VULN-14: Algoritmo de cifrado débil (DES)
  @Post('encrypt')
  encryptData(@Body('data') data: string) {
    const key = Buffer.from('12345678');
    const cipher = crypto.createCipheriv('des', key, key);
    const encrypted = cipher.update(data, 'utf8', 'hex') + cipher.final('hex');
    return { encrypted };
  }

  // VULN-15: Número aleatorio no criptográfico para token
  @Get('token')
  generateToken() {
    const token = Math.random().toString(36).substring(2);
    return { token };
  }

  // VULN-16: Open Redirect — redirige a cualquier URL
  @Get('redirect')
  redirect(@Query('url') url: string, @Req() req: Request) {
    // Sin validar que url sea un dominio conocido
    return { redirect: url, host: req.hostname };
  }

  // VULN-17: Command Injection simulado
  @Post('ping')
  ping(@Body('host') host: string) {
    const command = `ping -c 1 ${host}`;
    // exec(command) — un atacante manda: "localhost; rm -rf /"
    return { command };
  }

  // VULN-18: XML External Entity (XXE) simulado
  @Post('parse-xml')
  parseXml(@Body('xml') xml: string) {
    // Parser sin deshabilitar external entities
    return { parsed: xml, warning: 'XXE vulnerable parser' };
  }

  // VULN-19: Comparación de strings no segura (timing attack)
  @Post('verify-token')
  verifyToken(
    @Body('token') token: string,
    @Body('expected') expected: string,
  ) {
    // Vulnerable a timing attack — usar crypto.timingSafeEqual()
    const isValid = token === expected;
    return { isValid };
  }

  // VULN-20: JWT sin verificación de algoritmo
  @Post('decode-jwt')
  decodeJwt(@Body('token') token: string) {
    // Decodifica sin verificar firma ni algoritmo
    const parts = token.split('.');
    const payload = Buffer.from(parts[1], 'base64').toString('utf8');
    return { payload };
  }

  // Referencia para evitar unused-vars
  @Get('config')
  getConfig() {
    return { db: DB_CONNECTION_STRING, storage: AZURE_STORAGE_KEY };
  }
}
