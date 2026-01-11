// SettingsPanel - Application settings with keybinding remapper

import { useState } from 'react';
import { X, Plus, Trash2, Keyboard, Mouse, RotateCcw } from 'lucide-react';
import { useSettingsStore } from '@/store';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import type { KeyBinding, MouseAction } from '@/types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const mouseActionLabels: Record<MouseAction, string> = {
  rightClick: 'Right Click',
  middleClick: 'Middle Click',
  doubleClick: 'Double Click',
  tripleClick: 'Triple Click',
  ctrlClick: 'Ctrl + Click',
  shiftClick: 'Shift + Click',
  altClick: 'Alt + Click',
};

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'keybindings' | 'terminal'>('general');
  const [recordingBindingId, setRecordingBindingId] = useState<string | null>(null);
  
  const {
    settings,
    updateSettings,
    updateTerminalSettings,
    addKeyToBinding,
    removeKeyFromBinding,
    addMouseActionToBinding,
    removeMouseActionFromBinding,
    resetKeyBindings,
    getActiveProfile,
    setActiveProfile,
    getActiveColorScheme,
    setActiveColorScheme,
  } = useSettingsStore();

  const handleKeyDown = (e: React.KeyboardEvent, bindingId: string) => {
    if (!recordingBindingId) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const parts: string[] = [];
    if (e.ctrlKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    if (e.metaKey) parts.push('meta');
    
    // Get the key
    let key = e.key.toLowerCase();
    if (key === ' ') key = 'space';
    if (key === 'escape') {
      setRecordingBindingId(null);
      return;
    }
    
    // Skip if it's just a modifier key
    if (['control', 'shift', 'alt', 'meta'].includes(key)) return;
    
    parts.push(key);
    const combo = parts.join('+');
    
    addKeyToBinding(bindingId, combo);
    setRecordingBindingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="w-225 max-w-[95vw] h-175 max-h-[90vh] bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3c3c3c] bg-[#252526]">
          <h2 className="text-xl font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[#3c3c3c] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-[#3c3c3c] bg-[#252526] p-2">
            {[
              { id: 'general', label: 'General', icon: '⚙️' },
              { id: 'appearance', label: 'Appearance', icon: '🎨' },
              { id: 'terminal', label: 'Terminal', icon: '💻' },
              { id: 'keybindings', label: 'Keybindings', icon: '⌨️' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-[#0078d4] text-white'
                    : 'text-gray-300 hover:bg-[#3c3c3c]'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Profile</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Default Profile</Label>
                      <Select
                        value={settings.activeProfileId || ''}
                        onValueChange={setActiveProfile}
                      >
                        <SelectTrigger className="w-full mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white">
                          <SelectValue placeholder="Select profile" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2d2d2d] border-[#4c4c4c]">
                          {settings.profiles.map((profile) => (
                            <SelectItem 
                              key={profile.id} 
                              value={profile.id}
                              className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white"
                            >
                              {profile.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Theme</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Application Theme</Label>
                      <Select
                        value={settings.theme}
                        onValueChange={(value) => updateSettings({ theme: value as any })}
                      >
                        <SelectTrigger className="w-full mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2d2d2d] border-[#4c4c4c]">
                          <SelectItem value="dark" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">Dark</SelectItem>
                          <SelectItem value="light" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">Light</SelectItem>
                          <SelectItem value="system" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label className="text-gray-300">Color Scheme</Label>
                      <Select
                        value={settings.activeColorSchemeId || ''}
                        onValueChange={setActiveColorScheme}
                      >
                        <SelectTrigger className="w-full mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white">
                          <SelectValue placeholder="Select color scheme" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2d2d2d] border-[#4c4c4c]">
                          {settings.colorSchemes.map((scheme) => (
                            <SelectItem 
                              key={scheme.id} 
                              value={scheme.id}
                              className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white"
                            >
                              <div className="flex items-center gap-2">
                                <div 
                                  className="w-4 h-4 rounded border border-gray-600"
                                  style={{ backgroundColor: scheme.background }}
                                />
                                {scheme.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Font</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Font Family</Label>
                      <Input
                        value={settings.fontFamily}
                        onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                        className="mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Font Size</Label>
                      <Input
                        type="number"
                        value={settings.fontSize}
                        onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) || 14 })}
                        className="mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Line Height</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.lineHeight}
                        onChange={(e) => updateSettings({ lineHeight: parseFloat(e.target.value) || 1.2 })}
                        className="mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-300">Letter Spacing</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={settings.letterSpacing}
                        onChange={(e) => updateSettings({ letterSpacing: parseFloat(e.target.value) || 0 })}
                        className="mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Cursor</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-gray-300">Cursor Style</Label>
                      <Select
                        value={settings.cursorStyle}
                        onValueChange={(value) => updateSettings({ cursorStyle: value as any })}
                      >
                        <SelectTrigger className="w-full mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2d2d2d] border-[#4c4c4c]">
                          <SelectItem value="block" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">Block</SelectItem>
                          <SelectItem value="bar" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">Bar</SelectItem>
                          <SelectItem value="underline" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">Underline</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={settings.cursorBlink}
                          onChange={(e) => updateSettings({ cursorBlink: e.target.checked })}
                          className="w-4 h-4 rounded bg-[#3c3c3c] border-[#4c4c4c]"
                        />
                        <span className="text-gray-300">Cursor Blink</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'terminal' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Behavior</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Right Click Action</Label>
                      <Select
                        value={settings.terminal.rightClickAction}
                        onValueChange={(value) => updateTerminalSettings({ rightClickAction: value as any })}
                      >
                        <SelectTrigger className="w-full mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2d2d2d] border-[#4c4c4c]">
                          <SelectItem value="paste" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">Paste</SelectItem>
                          <SelectItem value="contextMenu" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">Context Menu</SelectItem>
                          <SelectItem value="selectWord" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">Select Word</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.terminal.copyOnSelect}
                        onChange={(e) => updateTerminalSettings({ copyOnSelect: e.target.checked })}
                        className="w-4 h-4 rounded bg-[#3c3c3c] border-[#4c4c4c]"
                      />
                      <span className="text-gray-300">Copy on Select</span>
                    </label>

                    <div>
                      <Label className="text-gray-300">Scrollback Size</Label>
                      <Input
                        type="number"
                        value={settings.scrollbackSize}
                        onChange={(e) => updateSettings({ scrollbackSize: parseInt(e.target.value) || 10000 })}
                        className="mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-white mb-4">Performance</h3>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-gray-300">Renderer</Label>
                      <Select
                        value={settings.terminal.rendererType}
                        onValueChange={(value) => updateTerminalSettings({ rendererType: value as any })}
                      >
                        <SelectTrigger className="w-full mt-1.5 bg-[#3c3c3c] border-[#4c4c4c] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#2d2d2d] border-[#4c4c4c]">
                          <SelectItem value="webgl" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">WebGL (Fastest)</SelectItem>
                          <SelectItem value="canvas" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">Canvas</SelectItem>
                          <SelectItem value="dom" className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white">DOM (Slowest)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.terminal.gpuAcceleration}
                        onChange={(e) => updateTerminalSettings({ gpuAcceleration: e.target.checked })}
                        className="w-4 h-4 rounded bg-[#3c3c3c] border-[#4c4c4c]"
                      />
                      <span className="text-gray-300">GPU Acceleration</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'keybindings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-white">Keybindings</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetKeyBindings}
                    className="border-[#4c4c4c] text-gray-300 hover:bg-[#3c3c3c]"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset to Defaults
                  </Button>
                </div>

                <p className="text-sm text-gray-500">
                  Click on a keybinding to add more shortcuts. Press Escape to cancel recording.
                </p>

                <div className="space-y-2">
                  {settings.keyBindings.map((binding) => (
                    <div 
                      key={binding.id}
                      className="bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-white">{binding.name}</h4>
                          <p className="text-xs text-gray-500 mt-0.5">{binding.command}</p>
                        </div>
                      </div>

                      {/* Keyboard shortcuts */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Keyboard className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Keyboard:</span>
                        </div>
                        <div className="flex flex-wrap gap-2 ml-6">
                          {binding.keys.map((key) => (
                            <div key={key} className="flex items-center gap-1 bg-[#3c3c3c] rounded px-2 py-1">
                              <kbd className="text-xs text-gray-200 font-mono">{key}</kbd>
                              <button
                                onClick={() => removeKeyFromBinding(binding.id, key)}
                                className="text-gray-500 hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => setRecordingBindingId(binding.id)}
                            onKeyDown={(e) => handleKeyDown(e, binding.id)}
                            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
                              recordingBindingId === binding.id
                                ? 'bg-blue-600 text-white animate-pulse'
                                : 'bg-[#3c3c3c] text-gray-400 hover:bg-[#4c4c4c]'
                            }`}
                          >
                            <Plus className="w-3 h-3" />
                            {recordingBindingId === binding.id ? 'Press keys...' : 'Add'}
                          </button>
                        </div>
                      </div>

                      {/* Mouse actions */}
                      <div className="space-y-2 mt-3">
                        <div className="flex items-center gap-2">
                          <Mouse className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-500">Mouse:</span>
                        </div>
                        <div className="flex flex-wrap gap-2 ml-6">
                          {(binding.mouseActions || []).map((action) => (
                            <div key={action} className="flex items-center gap-1 bg-[#3c3c3c] rounded px-2 py-1">
                              <span className="text-xs text-gray-200">{mouseActionLabels[action]}</span>
                              <button
                                onClick={() => removeMouseActionFromBinding(binding.id, action)}
                                className="text-gray-500 hover:text-red-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          <Select
                            value=""
                            onValueChange={(value) => addMouseActionToBinding(binding.id, value as MouseAction)}
                          >
                            <SelectTrigger className="h-7 w-auto px-2 bg-[#3c3c3c] border-none text-xs text-gray-400">
                              <Plus className="w-3 h-3 mr-1" />
                              <span>Add</span>
                            </SelectTrigger>
                            <SelectContent className="bg-[#2d2d2d] border-[#4c4c4c]">
                              {Object.entries(mouseActionLabels).map(([action, label]) => (
                                <SelectItem 
                                  key={action} 
                                  value={action}
                                  className="text-white hover:bg-[#3c3c3c] focus:bg-[#3c3c3c] focus:text-white text-sm"
                                >
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#3c3c3c] bg-[#252526]">
          <Button variant="outline" onClick={onClose} className="border-[#4c4c4c] text-gray-300">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
