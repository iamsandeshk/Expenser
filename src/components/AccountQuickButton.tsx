import { useEffect, useState } from 'react';
import { Megaphone, UserCircle2 } from 'lucide-react';
import { getAccountProfile, showRewardAd } from '@/lib/storage';
import { isProUserCached } from '@/lib/proAccess';

interface AccountQuickButtonProps {
  onClick: () => void;
  size?: number;
}

export function AccountQuickButton({ onClick, size = 44 }: AccountQuickButtonProps) {
  const [accountAvatar, setAccountAvatar] = useState(() => getAccountProfile().avatar || '');
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [isRewardAdLoading, setIsRewardAdLoading] = useState(false);
  const [isEffectivePro, setIsEffectivePro] = useState(() => isProUserCached());

  const sanitizeAvatarUrl = (value?: string) => {
    const raw = (value || '').trim();
    if (!raw) return '';
    const allowed = raw.startsWith('https://') || raw.startsWith('http://') || raw.startsWith('data:image/');
    if (!allowed) return '';

    if (raw.includes('googleusercontent.com') && !/[?&]sz=\d+/i.test(raw)) {
      return `${raw}${raw.includes('?') ? '&' : '?'}sz=256`;
    }

    return raw;
  };

  useEffect(() => {
    const syncAccount = () => {
      const nextAvatar = sanitizeAvatarUrl(getAccountProfile().avatar);
      setAccountAvatar(nextAvatar);
      setAvatarLoadFailed(false);
    };
    syncAccount();
    window.addEventListener('splitmate_account_changed', syncAccount);
    window.addEventListener('focus', syncAccount);
    return () => {
      window.removeEventListener('splitmate_account_changed', syncAccount);
      window.removeEventListener('focus', syncAccount);
    };
  }, []);

  useEffect(() => {
    const syncPro = () => setIsEffectivePro(isProUserCached());
    window.addEventListener('splitmate_pro_changed', syncPro);
    return () => window.removeEventListener('splitmate_pro_changed', syncPro);
  }, []);

  const handleRewardAdClick = async () => {
    if (isRewardAdLoading) return;
    setIsRewardAdLoading(true);
    try {
      await showRewardAd();
    } finally {
      setIsRewardAdLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2 shrink-0">
      {!isEffectivePro && (
        <button
          type="button"
          onClick={handleRewardAdClick}
          className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 transition-transform active:scale-95"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            background: 'hsl(var(--card) / 0.92)',
            border: '1px solid hsl(var(--border) / 0.45)',
            backdropFilter: 'blur(18px)',
            boxShadow: '0 10px 28px -12px hsl(var(--primary) / 0.32)',
          }}
          aria-label="Watch ad for 24 hours of ad-free experience"
          disabled={isRewardAdLoading}
        >
          <Megaphone size={Math.round(size * 0.46)} className={isRewardAdLoading ? 'text-muted-foreground animate-pulse' : 'text-primary'} />
        </button>
      )}

      <button
        type="button"
        onClick={onClick}
        className="rounded-full flex items-center justify-center overflow-hidden flex-shrink-0"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          background: 'hsl(var(--card) / 0.9)',
          border: '1px solid hsl(var(--border) / 0.45)',
          backdropFilter: 'blur(18px)',
          boxShadow: '0 10px 28px -12px hsl(var(--primary) / 0.38)',
        }}
        aria-label="Open account"
      >
        {accountAvatar && !avatarLoadFailed ? (
          <img
            src={accountAvatar}
            alt="Account"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setAvatarLoadFailed(true)}
          />
        ) : (
          <UserCircle2 size={Math.round(size * 0.46)} className="text-primary" />
        )}
      </button>
    </div>
  );
}
