import { Archive, Camera, DatabaseBackup, Download, Eye, EyeOff, Image, Lock, Plus, Save, Store, Trash2, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { updateUser } from '../features/auth/authSlice';
import apiClient, { useBackupFilesQuery, useChangePasswordMutation, useCreateBackupMutation, useDeletedRecordsQuery, useSettingsQuery, useTestGoogleSheetsMutation, useUpdateMeMutation, useUpdateSettingsMutation } from '../services/api';
import { getErrorMessage } from '../utils/errorMessage';

const defaultSettings = {
  storeName: 'Dinora Gullari',
  storePhone: '',
  storeAddress: '',
  workHours: '',
  logoUrl: '',
  telegramOrderAcceptedEnabled: true,
  telegramOrderStatusEnabled: true,
  telegramDebtReminderEnabled: true,
  telegramDebtPaymentEnabled: true,
  telegramSaleCreatedEnabled: true,
  telegramAdminIds: [],
  requirePhoneForDebtSales: true,
  debtReminderAfterDays: 3,
  preventSameDayDebtReminder: true,
  debtReminderText: 'Qarzdorlik bo‘yicha eslatma.',
  googleSheetsEnabled: false,
  googleSheetsSpreadsheetId: '',
  googleSheetsServiceAccountEmail: '',
  googleSheetsPrivateKey: '',
  googleSheetsOrdersSheet: 'Orders',
  googleSheetsSalesSheet: 'Sales',
};

const editableSettingKeys = [
  'storeName',
  'storePhone',
  'storeAddress',
  'workHours',
  'logoUrl',
  'debtReminderAfterDays',
  'debtReminderText',
  'googleSheetsSpreadsheetId',
  'googleSheetsServiceAccountEmail',
  'googleSheetsPrivateKey',
  'googleSheetsOrdersSheet',
  'googleSheetsSalesSheet',
];

function draftFromSaved(saved) {
  return editableSettingKeys.reduce((draft, key) => ({ ...draft, [key]: '' }), saved);
}

function savedValueText(value) {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '-';
  if (typeof value === 'boolean') return value ? 'Yoqilgan' : 'O‘chirilgan';
  if (value === undefined || value === null || value === '') return '-';
  return String(value);
}

function SavedValue({ id, label, value, visible, onToggle, secret = false }) {
  const text = savedValueText(value);
  const shown = visible ? (secret && text !== '-' ? '••••••••••••••••' : text) : 'Yashirilgan';

  return (
    <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400">Saqlangan: {label}</span>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-slate-100"
          onClick={() => onToggle(id)}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          {visible ? 'Yashirish' : 'Ko‘rish'}
        </button>
      </div>
      <p className="max-h-28 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-100">{shown}</p>
    </div>
  );
}

function SettingInput({ id, label, savedValue, visible, onToggle, secret, children }) {
  return (
    <div className="space-y-2">
      {children}
      <SavedValue id={id} label={label} value={savedValue} visible={visible} onToggle={onToggle} secret={secret} />
    </div>
  );
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function readImageAsDataUrl(file) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const maxSide = 720;
    const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/webp', 0.82);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-lg border border-white/10 bg-slate-950/25 p-3">
      <span>
        <span className="block text-sm font-bold text-slate-100">{label}</span>
        {description && <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-rose-400" />
    </label>
  );
}

function formatDateTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('uz-UZ', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function normalizeGooglePrivateKey(value) {
  const trimmed = value.trim();
  let keyValue = value;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === 'string') keyValue = parsed;
    else if (parsed?.private_key) keyValue = parsed.private_key;
  } catch {
    const jsonFieldMatch = trimmed.match(/"private_key"\s*:\s*"((?:\\.|[^"\\])*)"/);
    if (jsonFieldMatch?.[1]) {
      try {
        keyValue = JSON.parse(`"${jsonFieldMatch[1]}"`);
      } catch {
        keyValue = jsonFieldMatch[1];
      }
    } else {
      const beginIndex = value.indexOf('-----BEGIN PRIVATE KEY-----');
      const endMarker = '-----END PRIVATE KEY-----';
      const endIndex = value.indexOf(endMarker);
      if (beginIndex >= 0 && endIndex >= beginIndex) {
        keyValue = value.slice(beginIndex, endIndex + endMarker.length);
      }
    }
  }

  return keyValue
    .replace(/^\s*"|"\s*,?\s*$/g, '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
}

export default function SettingsPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { data: settingsData, isLoading } = useSettingsQuery();
  const [updateSettings, settingsState] = useUpdateSettingsMutation();
  const [testGoogleSheets, googleSheetsTestState] = useTestGoogleSheetsMutation();
  const [updateMe, profileState] = useUpdateMeMutation();
  const [changePassword, passwordState] = useChangePasswordMutation();
  const [createBackup, backupState] = useCreateBackupMutation();
  const { data: backupFiles = [] } = useBackupFilesQuery();
  const { data: deletedRecords = [] } = useDeletedRecordsQuery();
  const [settings, setSettings] = useState(defaultSettings);
  const [savedSettings, setSavedSettings] = useState(defaultSettings);
  const [visibleSavedSettings, setVisibleSavedSettings] = useState({});
  const [telegramAdminInput, setTelegramAdminInput] = useState('');
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '', avatarUrl: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (!settingsData) return;
    const saved = { ...defaultSettings, ...settingsData };
    setSavedSettings(saved);
    setSettings(draftFromSaved(saved));
  }, [settingsData]);

  useEffect(() => {
    setProfile({
      fullName: user?.fullName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      avatarUrl: user?.avatarUrl || '',
    });
  }, [user]);

  const setSetting = (key, value) => setSettings((current) => ({ ...current, [key]: value }));

  const toggleSavedSetting = (key) => {
    setVisibleSavedSettings((current) => ({ ...current, [key]: !current[key] }));
  };

  const currentSavedValue = (key) => savedSettings[key];

  const settingsPayload = () => {
    const payload = { ...settings };
    editableSettingKeys.forEach((key) => {
      const value = settings[key];
      payload[key] = value === '' || value === undefined ? savedSettings[key] : value;
    });
    payload.debtReminderAfterDays = Number(payload.debtReminderAfterDays || defaultSettings.debtReminderAfterDays);
    return payload;
  };

  const addTelegramAdmin = () => {
    const value = telegramAdminInput.trim();
    if (!/^-?\d+$/.test(value)) {
      toast.error('Telegram chat ID faqat raqamlardan iborat bo\'lsin');
      return;
    }
    setSettings((current) => ({
      ...current,
      telegramAdminIds: [...new Set([...(current.telegramAdminIds || []), value])],
    }));
    setTelegramAdminInput('');
  };

  const removeTelegramAdmin = (chatId) => {
    setSettings((current) => ({
      ...current,
      telegramAdminIds: (current.telegramAdminIds || []).filter((value) => value !== chatId),
    }));
  };

  const chooseImage = async (event, callback) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await readImageAsDataUrl(file);
      callback(dataUrl);
    } catch {
      toast.error('Rasmni yuklashda xatolik yuz berdi');
    } finally {
      event.target.value = '';
    }
  };

  const saveSettings = async () => {
    try {
      const saved = await updateSettings(settingsPayload()).unwrap();
      const nextSaved = { ...defaultSettings, ...saved };
      setSavedSettings(nextSaved);
      setSettings(draftFromSaved(nextSaved));
      toast.success('Sozlamalar saqlandi');
      return true;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Sozlamalarni saqlashda xatolik'));
      return false;
    }
  };

  const saveProfile = async () => {
    try {
      const saved = await updateMe(profile).unwrap();
      dispatch(updateUser(saved));
      toast.success('Profil yangilandi');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Profilni yangilashda xatolik'));
    }
  };

  const savePassword = async () => {
    if (passwords.newPassword.length < 6) {
      toast.error('Yangi parol kamida 6 ta belgidan iborat bo‘lsin');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Yangi parollar mos kelmadi');
      return;
    }
    try {
      await changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword }).unwrap();
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Parol yangilandi');
    } catch {
      toast.error('Joriy parol noto‘g‘ri yoki xatolik yuz berdi');
    }
  };

  const handleCreateBackup = async () => {
    try {
      await createBackup().unwrap();
      toast.success('Backup yaratildi');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Backup yaratishda xatolik'));
    }
  };

  const handleTestGoogleSheets = async () => {
    try {
      const saved = await saveSettings();
      if (!saved) return;
      const result = await testGoogleSheets().unwrap();
      toast.success(result.message || 'Google Sheets ulanishi ishlayapti');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Google Sheets ulanishida xatolik'));
    }
  };

  const downloadExport = async () => {
    try {
      const response = await apiClient.get('/backups/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `dinora-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Eksport yuklab olindi');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Eksportda xatolik'));
    }
  };

  if (isLoading) {
    return <div className="rounded-lg border border-white/10 bg-panel/70 p-8 text-center text-slate-400">Yuklanmoqda...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_.85fr]">
        <Card>
          <div className="mb-4 flex items-center gap-3">
            <Store className="h-5 w-5 text-rose-300" />
            <h2 className="text-lg font-bold text-slate-100">Do‘kon ma’lumotlari</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingInput id="storeName" label="Do‘kon nomi" savedValue={currentSavedValue('storeName')} visible={visibleSavedSettings.storeName} onToggle={toggleSavedSetting}>
              <Input label="Do‘kon nomi" placeholder="Yangi nom kiriting" value={settings.storeName} onChange={(event) => setSetting('storeName', event.target.value)} />
            </SettingInput>
            <SettingInput id="storePhone" label="Do‘kon telefoni" savedValue={currentSavedValue('storePhone')} visible={visibleSavedSettings.storePhone} onToggle={toggleSavedSetting}>
              <Input label="Do‘kon telefoni" placeholder="Yangi telefon kiriting" value={settings.storePhone} onChange={(event) => setSetting('storePhone', event.target.value)} />
            </SettingInput>
            <SettingInput id="workHours" label="Ish vaqti" savedValue={currentSavedValue('workHours')} visible={visibleSavedSettings.workHours} onToggle={toggleSavedSetting}>
              <Input label="Ish vaqti" placeholder="Yangi ish vaqtini kiriting" value={settings.workHours} onChange={(event) => setSetting('workHours', event.target.value)} />
            </SettingInput>
            <SettingInput id="storeAddress" label="Manzil" savedValue={currentSavedValue('storeAddress')} visible={visibleSavedSettings.storeAddress} onToggle={toggleSavedSetting}>
              <Input label="Manzil" placeholder="Yangi manzil kiriting" value={settings.storeAddress} onChange={(event) => setSetting('storeAddress', event.target.value)} />
            </SettingInput>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-slate-950/25 p-4">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/8">
              {settings.logoUrl || savedSettings.logoUrl ? <img src={settings.logoUrl || savedSettings.logoUrl} alt="Logo" className="h-full w-full object-cover" /> : <Image className="h-7 w-7 text-slate-500" />}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/12">
              <Image className="h-4 w-4" />
              Logoni tanlash
              <input type="file" accept="image/*" className="hidden" onChange={(event) => chooseImage(event, (value) => setSetting('logoUrl', value))} />
            </label>
          </div>
          <Button loading={settingsState.isLoading} className="mt-4" onClick={saveSettings}><Save className="h-4 w-4" /> Saqlash</Button>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <UserRound className="h-5 w-5 text-sky-300" />
            <h2 className="text-lg font-bold text-slate-100">Admin profili</h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/8">
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profil rasmi" className="h-full w-full object-cover" /> : <UserRound className="h-8 w-8 text-slate-500" />}
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/12">
              <Camera className="h-4 w-4" />
              Profil rasmi
              <input type="file" accept="image/*" className="hidden" onChange={(event) => chooseImage(event, (value) => setProfile((current) => ({ ...current, avatarUrl: value })))} />
            </label>
          </div>
          <div className="mt-4 space-y-4">
            <Input label="Ism familiya" value={profile.fullName} onChange={(event) => setProfile((current) => ({ ...current, fullName: event.target.value }))} />
            <Input label="Email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} />
            <Input label="Telefon" value={profile.phone} onChange={(event) => setProfile((current) => ({ ...current, phone: event.target.value }))} />
          </div>
          <Button loading={profileState.isLoading} className="mt-4" onClick={saveProfile}><Save className="h-4 w-4" /> Profilni saqlash</Button>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-100">Telegram va qarzdorlik</h2>
          <div className="grid gap-3">
            <Toggle label="Buyurtma qabul qilinganda xabar" checked={settings.telegramOrderAcceptedEnabled} onChange={(value) => setSetting('telegramOrderAcceptedEnabled', value)} />
            <Toggle label="Buyurtma statusi va olib ketish xabarlari" checked={settings.telegramOrderStatusEnabled} onChange={(value) => setSetting('telegramOrderStatusEnabled', value)} />
            <Toggle label="Qarzdorlik eslatmalari" checked={settings.telegramDebtReminderEnabled} onChange={(value) => setSetting('telegramDebtReminderEnabled', value)} />
            <Toggle label="Qarz to‘lovi xabarlari" checked={settings.telegramDebtPaymentEnabled} onChange={(value) => setSetting('telegramDebtPaymentEnabled', value)} />
            <Toggle label="Sovg‘a/tovar xaridi xabari" checked={settings.telegramSaleCreatedEnabled} onChange={(value) => setSetting('telegramSaleCreatedEnabled', value)} />
            <div className="rounded-lg border border-white/10 bg-slate-950/25 p-3">
              <span className="block text-sm font-bold text-slate-100">Telegram adminlar</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">
                Chat ID qo'shing. Botda /adminlar, /admin_qosh va /admin_ochir komandalaridan ham foydalanish mumkin.
              </span>
              <div className="mt-3 flex gap-2">
                <Input
                  aria-label="Telegram admin chat ID"
                  placeholder="123456789"
                  value={telegramAdminInput}
                  onChange={(event) => setTelegramAdminInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      addTelegramAdmin();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={addTelegramAdmin}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3 space-y-2">
                {(settings.telegramAdminIds || []).length === 0 ? (
                  <p className="text-xs text-slate-500">Qo'shimcha admin chat ID yo'q.</p>
                ) : (
                  settings.telegramAdminIds.map((chatId) => (
                    <div key={chatId} className="flex items-center justify-between gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                      <span>{chatId}</span>
                      <button
                        type="button"
                        className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-300"
                        onClick={() => removeTelegramAdmin(chatId)}
                        title="Adminni olib tashlash"
                        aria-label="Adminni olib tashlash"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
            <Toggle label="Nasiya savdoda telefon majburiy" description="Telefon bo‘lmasa qarz eslatmasi yuborib bo‘lmaydi." checked={settings.requirePhoneForDebtSales} onChange={(value) => setSetting('requirePhoneForDebtSales', value)} />
            <Toggle label="Bir kunda qayta eslatmaslik" checked={settings.preventSameDayDebtReminder} onChange={(value) => setSetting('preventSameDayDebtReminder', value)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
            <SettingInput id="debtReminderAfterDays" label="Necha kundan keyin" savedValue={currentSavedValue('debtReminderAfterDays')} visible={visibleSavedSettings.debtReminderAfterDays} onToggle={toggleSavedSetting}>
              <Input label="Necha kundan keyin" type="number" min="0" placeholder="Yangi kun" value={settings.debtReminderAfterDays} onChange={(event) => setSetting('debtReminderAfterDays', event.target.value)} />
            </SettingInput>
            <SettingInput id="debtReminderText" label="Qarz eslatmasi matni" savedValue={currentSavedValue('debtReminderText')} visible={visibleSavedSettings.debtReminderText} onToggle={toggleSavedSetting}>
              <Textarea label="Qarz eslatmasi matni" placeholder="Yangi matn kiriting" value={settings.debtReminderText} onChange={(event) => setSetting('debtReminderText', event.target.value)} />
            </SettingInput>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button loading={settingsState.isLoading} onClick={saveSettings}><Save className="h-4 w-4" /> Saqlash</Button>
            <Button variant="secondary" loading={googleSheetsTestState.isLoading} onClick={handleTestGoogleSheets}>
              <DatabaseBackup className="h-4 w-4" /> Ulanishni tekshirish
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold text-slate-100">Google Sheets zaxira nusxa</h2>
          <div className="space-y-4">
            <Toggle
              label="Google Sheetsga avtomatik yozish"
              description="Buyurtma yoki sovg'a/tovar sotuv yaratilganda Google Sheetsga ham alohida qator qo'shiladi."
              checked={settings.googleSheetsEnabled}
              onChange={(value) => setSetting('googleSheetsEnabled', value)}
            />
            <SettingInput id="googleSheetsSpreadsheetId" label="Spreadsheet ID" savedValue={currentSavedValue('googleSheetsSpreadsheetId')} visible={visibleSavedSettings.googleSheetsSpreadsheetId} onToggle={toggleSavedSetting}>
              <Input
                label="Spreadsheet ID"
                placeholder="Yangi Spreadsheet ID"
                value={settings.googleSheetsSpreadsheetId}
                onChange={(event) => setSetting('googleSheetsSpreadsheetId', event.target.value)}
              />
            </SettingInput>
            <SettingInput id="googleSheetsServiceAccountEmail" label="Service account email" savedValue={currentSavedValue('googleSheetsServiceAccountEmail')} visible={visibleSavedSettings.googleSheetsServiceAccountEmail} onToggle={toggleSavedSetting}>
              <Input
                label="Service account email"
                placeholder="Yangi service account email"
                value={settings.googleSheetsServiceAccountEmail}
                onChange={(event) => setSetting('googleSheetsServiceAccountEmail', event.target.value)}
              />
            </SettingInput>
            <SettingInput id="googleSheetsPrivateKey" label="Service account private key" savedValue={currentSavedValue('googleSheetsPrivateKey')} visible={visibleSavedSettings.googleSheetsPrivateKey} onToggle={toggleSavedSetting} secret>
              <Textarea
                label="Service account private key"
                placeholder="Yangi private key kiriting"
                value={settings.googleSheetsPrivateKey}
                onChange={(event) => setSetting('googleSheetsPrivateKey', normalizeGooglePrivateKey(event.target.value))}
              />
            </SettingInput>
            <div className="grid gap-4 sm:grid-cols-2">
              <SettingInput id="googleSheetsOrdersSheet" label="Buyurtmalar sheet nomi" savedValue={currentSavedValue('googleSheetsOrdersSheet')} visible={visibleSavedSettings.googleSheetsOrdersSheet} onToggle={toggleSavedSetting}>
                <Input
                  label="Buyurtmalar sheet nomi"
                  placeholder="Yangi sheet nomi"
                  value={settings.googleSheetsOrdersSheet}
                  onChange={(event) => setSetting('googleSheetsOrdersSheet', event.target.value)}
                />
              </SettingInput>
              <SettingInput id="googleSheetsSalesSheet" label="Sotuvlar sheet nomi" savedValue={currentSavedValue('googleSheetsSalesSheet')} visible={visibleSavedSettings.googleSheetsSalesSheet} onToggle={toggleSavedSetting}>
                <Input
                  label="Sotuvlar sheet nomi"
                  placeholder="Yangi sheet nomi"
                  value={settings.googleSheetsSalesSheet}
                  onChange={(event) => setSetting('googleSheetsSalesSheet', event.target.value)}
                />
              </SettingInput>
            </div>
          </div>
          <Button loading={settingsState.isLoading} className="mt-4" onClick={saveSettings}><Save className="h-4 w-4" /> Saqlash</Button>
        </Card>

        <Card>
          <div className="mb-4 flex items-center gap-3">
            <Lock className="h-5 w-5 text-emerald-300" />
            <h2 className="text-lg font-bold text-slate-100">Parol almashtirish</h2>
          </div>
          <div className="space-y-4">
            <Input label="Joriy parol" type="password" value={passwords.currentPassword} onChange={(event) => setPasswords((current) => ({ ...current, currentPassword: event.target.value }))} />
            <Input label="Yangi parol" type="password" value={passwords.newPassword} onChange={(event) => setPasswords((current) => ({ ...current, newPassword: event.target.value }))} />
            <Input label="Yangi parolni takrorlang" type="password" value={passwords.confirmPassword} onChange={(event) => setPasswords((current) => ({ ...current, confirmPassword: event.target.value }))} />
          </div>
          <Button loading={passwordState.isLoading} className="mt-4" onClick={savePassword}><Lock className="h-4 w-4" /> Parolni yangilash</Button>
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <DatabaseBackup className="h-5 w-5 text-cyan-300" />
            <h2 className="text-lg font-bold text-slate-100">Backup va ma'lumot xavfsizligi</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={backupState.isLoading} onClick={handleCreateBackup}>
              <DatabaseBackup className="h-4 w-4" /> Backup yaratish
            </Button>
            <Button onClick={downloadExport}>
              <Download className="h-4 w-4" /> JSON eksport
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-slate-950/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <DatabaseBackup className="h-4 w-4 text-cyan-300" />
              <h3 className="font-bold text-slate-100">Oxirgi backup fayllar</h3>
            </div>
            <div className="space-y-2">
              {backupFiles.length === 0 ? (
                <p className="text-sm text-slate-500">Hali backup fayl yaratilmagan.</p>
              ) : (
                backupFiles.slice(0, 5).map((file) => (
                  <div key={file.filename} className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <span className="min-w-0 truncate text-slate-200">{file.filename}</span>
                    <span className="shrink-0 text-xs text-slate-500">{formatDateTime(file.createdAt)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Archive className="h-4 w-4 text-amber-300" />
              <h3 className="font-bold text-slate-100">O'chirilgan yozuvlar arxivi</h3>
            </div>
            <div className="space-y-2">
              {deletedRecords.length === 0 ? (
                <p className="text-sm text-slate-500">O'chirilgan yozuvlar arxivi bo'sh.</p>
              ) : (
                deletedRecords.slice(0, 5).map((item) => (
                  <div key={item._id} className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-200">{item.collection === 'orders' ? 'Buyurtma' : 'Sovg‘a/tovar'}</span>
                      <span className="text-xs text-slate-500">{formatDateTime(item.deletedAt)}</span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      {item.record?.customerName || item.record?.productName || item.recordId}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
