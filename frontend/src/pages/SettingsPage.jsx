import { Archive, Camera, DatabaseBackup, Download, Image, Lock, Save, Store, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { updateUser } from '../features/auth/authSlice';
import apiClient, { useBackupFilesQuery, useChangePasswordMutation, useCreateBackupMutation, useDeletedRecordsQuery, useSettingsQuery, useUpdateMeMutation, useUpdateSettingsMutation } from '../services/api';
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

export default function SettingsPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { data: settingsData, isLoading } = useSettingsQuery();
  const [updateSettings, settingsState] = useUpdateSettingsMutation();
  const [updateMe, profileState] = useUpdateMeMutation();
  const [changePassword, passwordState] = useChangePasswordMutation();
  const [createBackup, backupState] = useCreateBackupMutation();
  const { data: backupFiles = [] } = useBackupFilesQuery();
  const { data: deletedRecords = [] } = useDeletedRecordsQuery();
  const [settings, setSettings] = useState(defaultSettings);
  const [profile, setProfile] = useState({ fullName: '', email: '', phone: '', avatarUrl: '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  useEffect(() => {
    if (settingsData) setSettings({ ...defaultSettings, ...settingsData });
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
      await updateSettings({
        ...settings,
        debtReminderAfterDays: Number(settings.debtReminderAfterDays || 0),
      }).unwrap();
      toast.success('Sozlamalar saqlandi');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Sozlamalarni saqlashda xatolik'));
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
            <Input label="Do‘kon nomi" value={settings.storeName} onChange={(event) => setSetting('storeName', event.target.value)} />
            <Input label="Do‘kon telefoni" value={settings.storePhone} onChange={(event) => setSetting('storePhone', event.target.value)} />
            <Input label="Ish vaqti" value={settings.workHours} onChange={(event) => setSetting('workHours', event.target.value)} />
            <Input label="Manzil" value={settings.storeAddress} onChange={(event) => setSetting('storeAddress', event.target.value)} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 rounded-lg border border-white/10 bg-slate-950/25 p-4">
            <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white/8">
              {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-cover" /> : <Image className="h-7 w-7 text-slate-500" />}
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
            <Toggle label="Nasiya savdoda telefon majburiy" description="Telefon bo‘lmasa qarz eslatmasi yuborib bo‘lmaydi." checked={settings.requirePhoneForDebtSales} onChange={(value) => setSetting('requirePhoneForDebtSales', value)} />
            <Toggle label="Bir kunda qayta eslatmaslik" checked={settings.preventSameDayDebtReminder} onChange={(value) => setSetting('preventSameDayDebtReminder', value)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-[160px_1fr]">
            <Input label="Necha kundan keyin" type="number" min="0" value={settings.debtReminderAfterDays} onChange={(event) => setSetting('debtReminderAfterDays', event.target.value)} />
            <Textarea label="Qarz eslatmasi matni" value={settings.debtReminderText} onChange={(event) => setSetting('debtReminderText', event.target.value)} />
          </div>
          <Button loading={settingsState.isLoading} className="mt-4" onClick={saveSettings}><Save className="h-4 w-4" /> Saqlash</Button>
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
            <Input
              label="Spreadsheet ID"
              placeholder="1AbC..."
              value={settings.googleSheetsSpreadsheetId}
              onChange={(event) => setSetting('googleSheetsSpreadsheetId', event.target.value)}
            />
            <Input
              label="Service account email"
              placeholder="service-account@project.iam.gserviceaccount.com"
              value={settings.googleSheetsServiceAccountEmail}
              onChange={(event) => setSetting('googleSheetsServiceAccountEmail', event.target.value)}
            />
            <Textarea
              label="Service account private key"
              placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
              value={settings.googleSheetsPrivateKey}
              onChange={(event) => setSetting('googleSheetsPrivateKey', event.target.value)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Buyurtmalar sheet nomi"
                value={settings.googleSheetsOrdersSheet}
                onChange={(event) => setSetting('googleSheetsOrdersSheet', event.target.value)}
              />
              <Input
                label="Sotuvlar sheet nomi"
                value={settings.googleSheetsSalesSheet}
                onChange={(event) => setSetting('googleSheetsSalesSheet', event.target.value)}
              />
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
