import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthGuard } from './auth/auth-guard.js';
import { AccountScreen } from './screens/account.js';
import { BerandaScreen } from './screens/beranda.js';
import { KasusDetailScreen } from './screens/kasus-detail/index.js';
import { SignInScreen } from './screens/sign-in.js';
import { SignUpScreen } from './screens/sign-up.js';

export function App(): JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/sign-in" element={<SignInScreen />} />
        <Route path="/sign-up" element={<SignUpScreen />} />
        <Route element={<AuthGuard />}>
          <Route path="/" element={<BerandaScreen />} />
          <Route path="/kasus/:caseId" element={<KasusDetailScreen />} />
          <Route path="/akun" element={<AccountScreen />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
