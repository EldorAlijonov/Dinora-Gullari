import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
import { getGooglePrivateKeyDiagnostics, normalizeGooglePrivateKey } from '../../common/google-private-key';
import { OrderDocument } from '../orders/schemas/order.schema';
import { SaleDocument } from '../sales/schemas/sale.schema';
import { AppSettings } from '../settings/schemas/settings.schema';
import { SettingsService } from '../settings/settings.service';

const orderHeaders = [
  'Synced at',
  'Created at',
  'Mongo ID',
  'Type',
  'Customer',
  'Phone',
  'Telegram phone',
  'Title',
  'Pickup date',
  'Total amount',
  'Paid amount',
  'Debt amount',
  'Payment type',
  'Status',
  'Note',
];

const saleHeaders = [
  'Synced at',
  'Created at',
  'Mongo ID',
  'Type',
  'Customer',
  'Phone',
  'Telegram phone',
  'Title',
  'Pickup date',
  'Total amount',
  'Paid amount',
  'Debt amount',
  'Payment type',
  'Status',
  'Note',
];

@Injectable()
export class GoogleSheetsService {
  private readonly logger = new Logger(GoogleSheetsService.name);
  private readonly initializedSheets = new Set<string>();
  private sheetsClient?: sheets_v4.Sheets;
  private authClient?: InstanceType<typeof google.auth.JWT>;
  private clientCredentialsKey = '';

  constructor(private readonly settingsService: SettingsService) {}

  async appendOrderCreated(order: OrderDocument) {
    await this.appendRow('orders', orderHeaders, [
      new Date().toISOString(),
      this.dateValue(this.createdAt(order)),
      String(order._id),
      'Gul buyurtma',
      order.customerName,
      order.phone,
      order.telegramPhone || '',
      order.orderText,
      this.dateValue(order.pickupDate),
      order.totalAmount,
      order.prepaidAmount,
      order.debtAmount,
      'order',
      order.status,
      order.note || '',
    ]);
  }

  async appendSaleCreated(sale: SaleDocument) {
    await this.appendRow('sales', saleHeaders, [
      new Date().toISOString(),
      this.dateValue(this.createdAt(sale)),
      String(sale._id),
      'Sovga/tovar',
      sale.customerName || '',
      sale.phone || '',
      sale.telegramPhone || '',
      sale.productName,
      '',
      sale.amount,
      sale.paidAmount,
      sale.debtAmount,
      sale.paymentType,
      sale.debtAmount > 0 ? 'debt' : 'paid',
      sale.note || '',
    ]);
  }

  async markOrderDeleted(order: OrderDocument, deletedAt = new Date()) {
    await this.markDeleted('orders', String(order._id), deletedAt);
  }

  async markSaleDeleted(sale: SaleDocument, deletedAt = new Date()) {
    await this.markDeleted('sales', String(sale._id), deletedAt);
  }

  async testConnection() {
    const settings = await this.settingsService.getSettings();
    if (!settings?.googleSheetsEnabled) {
      throw new BadRequestException('Google Sheets zaxira nusxa yoqilmagan');
    }

    const spreadsheetId = settings.googleSheetsSpreadsheetId?.trim();
    if (!spreadsheetId) {
      throw new BadRequestException('Spreadsheet ID kiritilmagan');
    }

    const privateKeyDiagnostics = getGooglePrivateKeyDiagnostics(settings.googleSheetsPrivateKey);

    try {
      const sheets = await this.client(settings);
      const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId });
      const ordersSheet = settings.googleSheetsOrdersSheet || 'Orders';
      const salesSheet = settings.googleSheetsSalesSheet || 'Sales';

      await this.ensureHeader(sheets, spreadsheetId, ordersSheet, orderHeaders);
      await this.ensureHeader(sheets, spreadsheetId, salesSheet, saleHeaders);

      return {
        ok: true,
        title: spreadsheet.data.properties?.title || '',
        sheets: [ordersSheet, salesSheet],
        privateKeyDiagnostics,
        message: 'Google Sheets ulanishi ishlayapti',
      };
    } catch (error) {
      throw new BadRequestException({
        message: this.googleErrorMessage(error),
        privateKeyDiagnostics,
      });
    }
  }

  private async appendRow(kind: 'orders' | 'sales', headers: string[], row: Array<string | number>) {
    const settings = await this.settingsService.getSettings();
    if (!settings?.googleSheetsEnabled) return;

    const spreadsheetId = settings.googleSheetsSpreadsheetId?.trim();
    if (!spreadsheetId) {
      this.logger.warn('Google Sheets sync is enabled but spreadsheet ID is missing');
      return;
    }

    const sheetName = kind === 'orders' ? settings.googleSheetsOrdersSheet || 'Orders' : settings.googleSheetsSalesSheet || 'Sales';

    try {
      const sheets = await this.client(settings);
      await this.ensureHeader(sheets, spreadsheetId, sheetName, headers);
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${this.quoteSheetName(sheetName)}!A:O`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [row] },
      });
    } catch (error) {
      this.logger.warn(
        `Google Sheets sync failed for ${sheetName}: ${error instanceof Error ? error.message : String(error)}; ` +
          `privateKeyDiagnostics=${JSON.stringify(getGooglePrivateKeyDiagnostics(settings.googleSheetsPrivateKey))}`,
      );
    }
  }

  private async markDeleted(kind: 'orders' | 'sales', recordId: string, deletedAt: Date) {
    const settings = await this.settingsService.getSettings();
    if (!settings?.googleSheetsEnabled) return;

    const spreadsheetId = settings.googleSheetsSpreadsheetId?.trim();
    if (!spreadsheetId) return;

    const sheetName = kind === 'orders' ? settings.googleSheetsOrdersSheet || 'Orders' : settings.googleSheetsSalesSheet || 'Sales';

    try {
      const sheets = await this.client(settings);
      await this.ensureHeader(sheets, spreadsheetId, sheetName, kind === 'orders' ? orderHeaders : saleHeaders);
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${this.quoteSheetName(sheetName)}!A:O`,
      });
      const rows = response.data.values || [];
      const rowIndex = rows.findIndex((row, index) => index > 0 && row[2] === recordId);
      if (rowIndex < 0) {
        this.logger.warn(`Google Sheets row not found for deleted ${kind} record ${recordId}`);
        return;
      }

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${this.quoteSheetName(sheetName)}!N${rowIndex + 1}:O${rowIndex + 1}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['O\'chirildi', `O'chirilgan vaqt: ${deletedAt.toISOString()}`]],
        },
      });
    } catch (error) {
      this.logger.warn(`Google Sheets delete mark failed for ${sheetName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async ensureHeader(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetName: string, headers: string[]) {
    const key = `${spreadsheetId}:${sheetName}`;
    if (this.initializedSheets.has(key)) return;

    await this.ensureSheetExists(sheets, spreadsheetId, sheetName);

    const range = `${this.quoteSheetName(sheetName)}!A1:O1`;
    const response = await sheets.spreadsheets.values.get({ spreadsheetId, range });
    const firstRow = response.data.values?.[0] || [];

    if (firstRow.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
    }

    this.initializedSheets.add(key);
  }

  private async ensureSheetExists(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetName: string) {
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties.title',
    });
    const exists = spreadsheet.data.sheets?.some((sheet) => sheet.properties?.title === sheetName);
    if (exists) return;

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      },
    });
  }

  private async client(settings: AppSettings) {
    const clientEmail = settings.googleSheetsServiceAccountEmail?.trim();
    const privateKey = normalizeGooglePrivateKey(settings.googleSheetsPrivateKey);
    const credentialsKey = `${clientEmail}:${privateKey}`;

    if (this.sheetsClient && this.authClient && this.clientCredentialsKey === credentialsKey) return this.sheetsClient;

    if (!clientEmail || !privateKey) {
      throw new Error('Google service account credentials are missing');
    }

    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
      throw new Error(`private key is not a valid PEM private key; diagnostics=${JSON.stringify(getGooglePrivateKeyDiagnostics(settings.googleSheetsPrivateKey))}`);
    }

    const diagnostics = getGooglePrivateKeyDiagnostics(settings.googleSheetsPrivateKey);
    if (!diagnostics.opensslReadable) {
      throw new Error(`private key cannot be decoded; diagnostics=${JSON.stringify(diagnostics)}`);
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    await auth.authorize();

    this.sheetsClient = google.sheets({ version: 'v4', auth });
    this.authClient = auth;
    this.clientCredentialsKey = credentialsKey;
    return this.sheetsClient;
  }

  private googleErrorMessage(error: unknown) {
    const rawMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error);

    if (/invalid_grant|Invalid JWT Signature|PEM|private key|DECODER routines|unsupported/i.test(rawMessage)) {
      return 'Private key noto‘g‘ri. JSON keyni yangidan yarating va private_key qiymatini qayta kiriting.';
    }

    if (/not found|Requested entity was not found/i.test(rawMessage)) {
      return 'Spreadsheet topilmadi. Spreadsheet ID noto‘g‘ri yoki Google Sheet service account emailga share qilinmagan.';
    }

    if (/permission|PERMISSION_DENIED|forbidden|insufficient/i.test(rawMessage)) {
      return 'Ruxsat yetarli emas. Google Sheet faylini service account emailga Editor qilib share qiling.';
    }

    if (/Unable to parse range|Unable to parse/i.test(rawMessage)) {
      return 'Sheet nomi noto‘g‘ri. Buyurtmalar yoki sotuvlar sheet nomini tekshiring.';
    }

    return rawMessage || 'Google Sheets ulanishida xatolik yuz berdi';
  }

  private quoteSheetName(name: string) {
    return `'${name.replace(/'/g, "''")}'`;
  }

  private dateValue(value?: Date) {
    return value ? new Date(value).toISOString() : '';
  }

  private createdAt(document: unknown) {
    const record = document as Record<string, unknown>;
    return record.createdAt instanceof Date ? record.createdAt : undefined;
  }
}
