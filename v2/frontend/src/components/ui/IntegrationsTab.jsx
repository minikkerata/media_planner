import React, { useState, useEffect } from 'react';
import { Check, AlertCircle, Loader2 } from 'lucide-react';
import Button from './Button';
import SettingsSection from './SettingsSection';
import Input from './Input';
import { api } from '../../services/api';
import { t } from '../../utils/translations';

export default function IntegrationsTab({ language, onClose, showToast, highlight = (x) => x }) {
  const [settings, setSettings] = useState({
    buffer_api_key: '',
    buffer_channel_id: '',
    buffer_post_interval: 24,
    cloudinary_cloud_name: '',
    cloudinary_api_key: '',
    cloudinary_api_secret: '',
    fixed_text: ''
  });

  const [bufferTestStatus, setBufferTestStatus] = useState({ state: 'idle', message: '' });
  const [cloudinaryTestStatus, setCloudinaryTestStatus] = useState({ state: 'idle', message: '' });
  const [bufferProfile, setBufferProfile] = useState(null); // { name, avatar, service }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getSettings()
      .then(data => {
        if (active && data) {
          setSettings({
            buffer_api_key: data.buffer_api_key || '',
            buffer_channel_id: data.buffer_channel_id || '',
            buffer_post_interval: data.buffer_post_interval !== undefined ? data.buffer_post_interval : 24,
            cloudinary_cloud_name: data.cloudinary_cloud_name || '',
            cloudinary_api_key: data.cloudinary_api_key || '',
            cloudinary_api_secret: data.cloudinary_api_secret || '',
            fixed_text: data.fixed_text || ''
          });
          // Also try to fetch buffer profile if key+id are set
          if (data.buffer_api_key && data.buffer_channel_id) {
            api.getBufferProfile().then(p => { if (active && p.success) setBufferProfile(p); }).catch(() => {});
          }
        }
      })
      .catch(err => {
        console.error("Failed to load settings:", err);
        if (showToast) showToast(t('cannot_connect_backend', language), 'error');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [language]);

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      const res = await api.saveSettings(settings);
      if (res.success) {
        if (showToast) showToast(t('save_success_toast', language), 'success');
        window.dispatchEvent(new Event('settings-changed'));
        if (onClose) onClose();
      } else {
        if (showToast) showToast(res.message || 'Hata', 'error');
      }
    } catch (err) {
      console.error(err);
      if (showToast) showToast(t('cannot_connect_backend', language), 'error');
    }
  };

  const testBufferConnection = async () => {
    if (!settings.buffer_api_key) {
      setBufferTestStatus({ state: 'error', message: 'API Key gereklidir.' });
      return;
    }
    setBufferTestStatus({ state: 'testing', message: '' });
    try {
      const res = await api.testBuffer(settings.buffer_api_key);
      if (res.success) {
        setBufferTestStatus({ state: 'success', message: res.message || t('test_success', language) });
        // Try to fetch profile info
        try {
          const profile = await api.getBufferProfile();
          if (profile.success) setBufferProfile(profile);
        } catch (_) {}
      } else {
        setBufferTestStatus({ state: 'error', message: res.message || 'Doğrulama başarısız.' });
      }
    } catch (err) {
      setBufferTestStatus({ state: 'error', message: err.message || 'Bağlantı hatası.' });
    }
  };

  const testCloudinaryConnection = async () => {
    const { cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret } = settings;
    if (!cloudinary_cloud_name || !cloudinary_api_key || !cloudinary_api_secret) {
      setCloudinaryTestStatus({ state: 'error', message: 'Tüm Cloudinary alanları gereklidir.' });
      return;
    }
    setCloudinaryTestStatus({ state: 'testing', message: '' });
    try {
      const res = await api.testCloudinary(cloudinary_cloud_name, cloudinary_api_key, cloudinary_api_secret);
      if (res.success) {
        setCloudinaryTestStatus({ state: 'success', message: `${t('test_success', language)} (URL: ${res.url})` });
      } else {
        setCloudinaryTestStatus({ state: 'error', message: res.message || 'Yükleme başarısız.' });
      }
    } catch (err) {
      setCloudinaryTestStatus({ state: 'error', message: err.message || 'Bağlantı hatası.' });
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-foreground/50">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <SettingsSection
      description={highlight(t('integrations_desc', language))}
      onSave={handleSave}
      saveLabel={t('save_btn', language)}
    >
      <div className="flex flex-col gap-6 py-2 overflow-y-auto max-h-[460px] pr-1 scrollbar-thin">
        {/* Buffer Integration Card */}
        <div className="bg-foreground/[0.02] border border-foreground/5 rounded-xl p-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-foreground/5 pb-2">
            {highlight(t('buffer_settings', language))}
          </h3>

          {/* Connected Instagram profile card */}
          {bufferProfile && bufferProfile.name && (
            <div className="flex items-center gap-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/15 rounded-xl px-3 py-2.5">
              {bufferProfile.avatar ? (
                <img
                  src={bufferProfile.avatar}
                  alt={bufferProfile.name}
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-purple-500/30 shrink-0"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shrink-0">
                  <span className="text-white text-xs font-bold">{bufferProfile.name[0]?.toUpperCase()}</span>
                </div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground truncate">@{bufferProfile.name}</span>
                <span className="text-[10px] text-foreground/45 capitalize">{bufferProfile.service || 'instagram'} · Buffer</span>
              </div>
              <div className="ml-auto shrink-0 w-2 h-2 rounded-full bg-green-500" title="Connected" />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-medium text-foreground/75">
                {highlight(t('buffer_api_key_label', language))}
              </label>
              <Input
                type="password"
                value={settings.buffer_api_key}
                onChange={(e) => handleChange('buffer_api_key', e.target.value)}
                placeholder="buf_..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/75">
                {highlight(t('buffer_channel_id_label', language))}
              </label>
              <Input
                type="text"
                value={settings.buffer_channel_id}
                onChange={(e) => handleChange('buffer_channel_id', e.target.value)}
                placeholder="654a..."
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/75">
                {highlight(t('buffer_post_interval_label', language))}
              </label>
              <Input
                type="number"
                min="1"
                value={settings.buffer_post_interval}
                onChange={(e) => handleChange('buffer_post_interval', parseInt(e.target.value, 10) || 24)}
                placeholder="24"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={testBufferConnection}
              disabled={bufferTestStatus.state === 'testing'}
              className="shrink-0"
            >
              {bufferTestStatus.state === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {t('test_connection_btn', language)}
            </Button>

            {bufferTestStatus.state === 'success' && (
              <div className="flex items-center gap-1.5 text-green-500 text-xs font-medium">
                <Check size={14} className="shrink-0" />
                <span>{bufferTestStatus.message}</span>
              </div>
            )}

            {bufferTestStatus.state === 'error' && (
              <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <span>{bufferTestStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Cloudinary Integration Card */}
        <div className="bg-foreground/[0.02] border border-foreground/5 rounded-xl p-4 flex flex-col gap-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 border-b border-foreground/5 pb-2">
            {highlight(t('cloudinary_settings', language))}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5 col-span-2">
              <label className="text-xs font-medium text-foreground/75">
                {highlight(t('cloudinary_cloud_name_label', language))}
              </label>
              <Input
                type="text"
                value={settings.cloudinary_cloud_name}
                onChange={(e) => handleChange('cloudinary_cloud_name', e.target.value)}
                placeholder="cloud-name"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/75">
                {highlight(t('cloudinary_api_key_label', language))}
              </label>
              <Input
                type="text"
                value={settings.cloudinary_api_key}
                onChange={(e) => handleChange('cloudinary_api_key', e.target.value)}
                placeholder="123456789012345"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-foreground/75">
                {highlight(t('cloudinary_api_secret_label', language))}
              </label>
              <Input
                type="password"
                value={settings.cloudinary_api_secret}
                onChange={(e) => handleChange('cloudinary_api_secret', e.target.value)}
                placeholder="••••••••••••••••••••••••••••"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 mt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={testCloudinaryConnection}
              disabled={cloudinaryTestStatus.state === 'testing'}
              className="shrink-0"
            >
              {cloudinaryTestStatus.state === 'testing' && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {t('test_connection_btn', language)}
            </Button>

            {cloudinaryTestStatus.state === 'success' && (
              <div className="flex items-center gap-1.5 text-green-500 text-xs font-medium truncate max-w-md">
                <Check size={14} className="shrink-0" />
                <span className="truncate">{cloudinaryTestStatus.message}</span>
              </div>
            )}

            {cloudinaryTestStatus.state === 'error' && (
              <div className="flex items-center gap-1.5 text-red-500 text-xs font-medium">
                <AlertCircle size={14} className="shrink-0" />
                <span>{cloudinaryTestStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </SettingsSection>
  );
}
