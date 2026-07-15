import { Injectable, Logger } from '@nestjs/common';
import { google, sheets_v4 } from 'googleapis';
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
      this.logger.warn(`Google Sheets sync failed for ${sheetName}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async ensureHeader(sheets: sheets_v4.Sheets, spreadsheetId: string, sheetName: string, headers: string[]) {
    const key = `${spreadsheetId}:${sheetName}`;
    if (this.initializedSheets.has(key)) return;

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

  private async client(settings: AppSettings) {
    const clientEmail = settings.googleSheetsServiceAccountEmail?.trim();
    const privateKey = settings.googleSheetsPrivateKey?.replace(/\\n/g, '\n').trim();
    const credentialsKey = `${clientEmail}:${privateKey}`;

    if (this.sheetsClient && this.clientCredentialsKey === credentialsKey) return this.sheetsClient;

    if (!clientEmail || !privateKey) {
      throw new Error('Google service account credentials are missing');
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheetsClient = google.sheets({ version: 'v4', auth });
    this.clientCredentialsKey = credentialsKey;
    return this.sheetsClient;
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
