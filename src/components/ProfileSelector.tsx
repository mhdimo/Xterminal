// ProfileSelector - Dropdown for switching shell profiles
// Quick access to different shells (zsh, bash, fish, etc.)

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Terminal, Plus, Check } from 'lucide-react';
import { useSettingsStore } from '@/store';
import { cn } from '@/lib/utils';
import type { Profile } from '@/types';

interface ProfileSelectorProps {
  onSelectProfile: (profile: Profile) => void;
  className?: string;
}

export function ProfileSelector({ onSelectProfile, className }: ProfileSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { settings, getActiveProfile } = useSettingsStore();
  const activeProfile = getActiveProfile();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen]);

  const handleSelect = (profile: Profile) => {
    onSelectProfile(profile);
    setIsOpen(false);
  };

  const getShellIcon = (shell: string): string => {
    if (shell.includes('zsh')) return '🐚';
    if (shell.includes('bash')) return '💻';
    if (shell.includes('fish')) return '🐟';
    if (shell.includes('powershell') || shell.includes('pwsh')) return '⚡';
    if (shell.includes('cmd')) return '📟';
    return '🖥️';
  };

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded',
          'bg-[#3c3c3c] hover:bg-[#4c4c4c] transition-colors',
          'text-sm text-gray-200'
        )}
      >
        <Terminal className="w-4 h-4" />
        <span className="max-w-[120px] truncate">{activeProfile?.name || 'Default'}</span>
        <ChevronDown className={cn(
          'w-3 h-3 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-[#252526] border border-[#3c3c3c] rounded-lg shadow-xl z-50 overflow-hidden">
          <div className="py-1">
            <div className="px-3 py-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              Profiles
            </div>
            {settings.profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleSelect(profile)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                  profile.id === activeProfile?.id 
                    ? 'bg-[#0078d4] text-white' 
                    : 'hover:bg-[#3c3c3c] text-gray-200'
                )}
              >
                <span className="text-lg">{getShellIcon(profile.shell)}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{profile.name}</div>
                  <div className={cn(
                    'text-xs truncate',
                    profile.id === activeProfile?.id ? 'text-white/70' : 'text-gray-500'
                  )}>
                    {profile.shell}
                  </div>
                </div>
                {profile.id === activeProfile?.id && (
                  <Check className="w-4 h-4 shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
