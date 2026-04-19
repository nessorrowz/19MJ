// Alur reset password disimpan sementara di session agar tidak menetap di storage permanen.
const STORAGE_KEY = '19mj-password-reset';
export const RESET_PIN_RESEND_COOLDOWN_SECONDS = 60;

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
};

export const getResetFlow = () => safeParse(sessionStorage.getItem(STORAGE_KEY));

export const saveResetFlow = (patch) => {
  const current = getResetFlow();
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...patch }));
};

export const getResetResendCooldownRemaining = (flow = getResetFlow(), now = Date.now()) => {
  const resendAvailableAt = Number(flow.resendAvailableAt || 0);

  if (!resendAvailableAt) {
    return 0;
  }

  return Math.max(0, Math.ceil((resendAvailableAt - now) / 1000));
};

export const setResetResendCooldown = (seconds = RESET_PIN_RESEND_COOLDOWN_SECONDS) => {
  saveResetFlow({ resendAvailableAt: Date.now() + (seconds * 1000) });
};

export const clearResetFlow = () => {
  sessionStorage.removeItem(STORAGE_KEY);
};

export const getLoginRouteByRole = (role) =>
  role === 'company' ? '/company/login' : '/login';

export const getRoleFromSearch = (search) => {
  const params = new URLSearchParams(search);
  return params.get('role') === 'company' ? 'company' : 'candidate';
};
