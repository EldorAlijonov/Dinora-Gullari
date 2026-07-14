import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Flower2, Lock, Phone } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { setCredentials } from '../features/auth/authSlice';
import { useLoginMutation, usePublicSettingsQuery } from '../services/api';

const schema = z.object({
  login: z.string().min(3, 'Telefon yoki email kiriting'),
  password: z.string().min(6, 'Kamida 6 ta belgi'),
});

export default function LoginPage() {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const { data: settings } = usePublicSettingsQuery();
  const [showPassword, setShowPassword] = useState(false);
  const [login, { isLoading, error }] = useLoginMutation();
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { login: '', password: '' } });

  if (user) return <Navigate to="/" replace />;

  const onSubmit = async (values) => {
    const result = await login(values).unwrap();
    dispatch(setCredentials(result));
  };

  return (
    <div className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_20%_10%,#fecdd3,transparent_28%),linear-gradient(135deg,#fff7ed,#fff1f2_48%,#ecfdf5)] p-4">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="grid w-full max-w-5xl overflow-hidden rounded-lg glass md:grid-cols-[1.05fr_.95fr]">
        <div className="relative min-h-[420px] overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-emerald-500 p-8 text-white">
          <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle,#fff_1px,transparent_1px)] [background-size:28px_28px]" />
          <div className="relative z-10 flex h-full flex-col justify-between">
            <div className="inline-flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-white/20 backdrop-blur">
              {settings?.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="h-full w-full object-cover" /> : <Flower2 className="h-8 w-8" />}
            </div>
            <div>
              <h1 className="text-4xl font-bold">{settings?.storeName || 'Dinora Gullari'}</h1>
              <p className="mt-3 max-w-sm text-base font-medium text-white/85">Buyurtmalar, sotuvlar, foyda, qarzlar va Telegram xabarlar bir joyda.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm font-bold">
              {['Premium', 'Tezkor', 'Mobil'].map((item) => (
                <span key={item} className="rounded-lg bg-white/18 px-3 py-2 text-center backdrop-blur">{item}</span>
              ))}
            </div>
          </div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-7 md:p-10">
          <p className="text-sm font-bold uppercase text-rose-500">Admin panel</p>
          <h2 className="mt-1 text-3xl font-bold text-slate-950">Tizimga kirish</h2>
          <div className="mt-8 space-y-4">
            <Input label="Telefon yoki email" placeholder="+998901234567" error={formState.errors.login?.message} {...register('login')} />
            <Input
              label="Parol"
              type={showPassword ? 'text' : 'password'}
              placeholder="******"
              error={formState.errors.password?.message}
              rightElement={
                <button
                  type="button"
                  className="grid h-8 w-8 place-items-center rounded-md text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                  title={showPassword ? 'Parolni yashirish' : 'Parolni ko‘rsatish'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
              {...register('password')}
            />
            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">Login yoki parol noto‘g‘ri.</p>}
            <Button loading={isLoading} className="w-full">
              <Lock className="h-4 w-4" />
              Kirish
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            <Phone className="h-4 w-4" />
            Demo admin uchun README dagi seed buyrug‘idan foydalaning.
          </div>
        </form>
      </motion.div>
    </div>
  );
}
