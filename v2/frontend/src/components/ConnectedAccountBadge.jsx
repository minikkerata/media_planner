import React from 'react';
import { AlertTriangle, User } from 'lucide-react';
import { useBufferProfile } from '../hooks/useBufferProfile';

/**
 * Reusable ConnectedAccountBadge component.
 * Displays the connected Buffer social media account's avatar, name, and username
 * without heavy container borders or backgrounds (clean & minimal).
 */
export default function ConnectedAccountBadge({ className = '', language = 'tr' }) {
  const { profile, loading, error } = useBufferProfile();

  if (loading && !profile) {
    return (
      <div className={`flex items-center gap-2 py-1 px-0.5 animate-pulse ${className}`}>
        <div className="w-7 h-7 rounded-full bg-foreground/10 shrink-0" />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="h-2.5 w-16 bg-foreground/10 rounded" />
          <div className="h-2 w-12 bg-foreground/10 rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-1.5 py-1 px-0.5 text-amber-500 text-[11px] leading-tight ${className}`} title={error}>
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
        <span className="truncate">
          {language === 'tr' ? 'Buffer hesap izinlerini kontrol edin' : 'Check Buffer account permissions'}
        </span>
      </div>
    );
  }

  if (!profile || (!profile.name && !profile.displayName && !profile.username)) {
    return null;
  }

  const displayName = profile.displayName || profile.name || '';
  const username = profile.username || (profile.name ? (profile.name.startsWith('@') ? profile.name : `@${profile.name}`) : '');
  const isSame = displayName.toLowerCase().replace('@', '') === username.toLowerCase().replace('@', '');

  return (
    <div className={`flex items-center gap-2.5 py-1 px-0.5 w-full min-w-0 select-none ${className}`}>
      {/* Avatar */}
      {profile.avatar ? (
        <img
          src={profile.avatar}
          alt={displayName || 'Account Avatar'}
          className="w-7 h-7 rounded-full object-cover ring-1 ring-border/20 shrink-0"
          onError={(e) => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className={`w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 items-center justify-center shrink-0 text-white font-bold text-[11px] shadow-sm ${profile.avatar ? 'hidden' : 'flex'}`}
      >
        {(displayName || 'B')[0]?.toUpperCase()}
      </div>

      {/* Names */}
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-xs font-semibold text-foreground truncate leading-tight">
          {displayName || username}
        </span>
        {username ? (
          <span className="text-[10px] text-foreground/50 truncate font-mono leading-tight mt-0.5">
            {username}
          </span>
        ) : null}
      </div>

      {/* Subtle Connected status indicator */}
      <div
        className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-sm"
        title={language === 'tr' ? 'Hesap Bağlı' : 'Account Connected'}
      />
    </div>
  );
}
