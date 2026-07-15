import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, sheets_v4 } from 'googleapis';
import { OrderDocument } from '../orders/schemas/order.schema';
import { SaleDocument } from '../sales/schemas/sale.schema';

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

  constructor(private readonly config: ConfigService) {}

  get enabled() {
    return this.config.get<string>('GOOGLE_SHEETS_ENABLED') === 'true';
  }

  async appendOrderCreated(order: OrderDocument) {
    await this.appendRow(this.orderSheetName(), orderHeaders, [
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
    await this.appendRow(this.salesSheetName(), saleHeaders, [
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

  private async appendRow(sheetName: string, headers: string[], row: Array<string | number>) {
    if (!this.enabled) return;

    const spreadsheetId = this.config.get<string>('GOOGLE_SHEETS_SPREADSHEET_ID');
    if (!spreadsheetId) {
      this.logger.warn('Google Sheets sync is enabled but GOOGLE_SHEETS_SPREADSHEET_ID is missing');
      return;
    }

    try {
      const sheets = await this.client();
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

  private async client() {
    if (this.sheetsClient) return this.sheetsClient;

    const clientEmail = this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_EMAIL');
    const privateKey = this.config.get<string>('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (!clientEmail || !privateKey) {
      throw new Error('Google service account credentials are missing');
    }

    const auth = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    this.sheetsClient = google.sheets({ version: 'v4', auth });
    return this.sheetsClient;
  }

  private orderSheetName() {
    return this.config.get<string>('GOOGLE_SHEETS_ORDERS_SHEET') || 'Orders';
  }

  private salesSheetName() {
    return this.config.get<string>('GOOGLE_SHEETS_SALES_SHEET') || 'Sales';
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
