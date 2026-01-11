// PluginsPanel - Browse and install plugins/tools
// Opened with Ctrl+Shift+P (or similar hotkey)

import { useState, useMemo } from 'react';
import { X, Download, Trash2, ExternalLink, Search, Check, Loader2 } from 'lucide-react';
import { pluginsCatalog, categoryLabels, type Plugin, type PluginCategory } from '../types/plugins';
import { usePluginsStore } from '../store/pluginsStore';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface PluginsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onRunCommand: (command: string) => void;
}

export function PluginsPanel({ isOpen, onClose, onRunCommand }: PluginsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<PluginCategory | 'all'>('all');
  const { 
    isInstalled, 
    isInstalling, 
    markInstalling,
    markInstalled,
    markUninstalled,
    getInstallCommand,
    getUninstallCommand,
  } = usePluginsStore();

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(pluginsCatalog.map(p => p.category));
    return Array.from(cats).sort();
  }, []);

  // Filter plugins
  const filteredPlugins = useMemo(() => {
    return pluginsCatalog.filter(plugin => {
      const matchesSearch = 
        plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plugin.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || plugin.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Group plugins by category
  const groupedPlugins = useMemo(() => {
    const groups: Record<PluginCategory, Plugin[]> = {} as any;
    
    filteredPlugins.forEach(plugin => {
      if (!groups[plugin.category]) {
        groups[plugin.category] = [];
      }
      groups[plugin.category].push(plugin);
    });
    
    return groups;
  }, [filteredPlugins]);

  const handleInstall = (plugin: Plugin) => {
    const command = getInstallCommand(plugin);
    markInstalling(plugin.id);
    onRunCommand(command);
    
    // For now, mark as installed after a delay (in real implementation, you'd detect completion)
    setTimeout(() => {
      markInstalled(plugin, 'latest');
    }, 3000);
  };

  const handleUninstall = (plugin: Plugin) => {
    const command = getUninstallCommand(plugin);
    onRunCommand(command);
    markUninstalled(plugin.id);
  };

  const handleLaunch = (plugin: Plugin) => {
    onRunCommand(plugin.command);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="w-[800px] max-w-[90vw] h-[600px] max-h-[80vh] bg-[#1e1e1e] border border-[#3c3c3c] rounded-lg shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#3c3c3c] bg-[#252526]">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <span>🧩</span> Plugins & Apps
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#3c3c3c] rounded transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="px-4 py-3 border-b border-[#3c3c3c]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Search plugins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-[#3c3c3c] border-[#4c4c4c] text-white placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Main content with sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Category Sidebar */}
          <div className="w-48 border-r border-[#3c3c3c] bg-[#252526] p-2 overflow-y-auto">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                selectedCategory === 'all'
                  ? 'bg-[#0078d4] text-white'
                  : 'text-gray-300 hover:bg-[#3c3c3c]'
              }`}
            >
              <span>📦</span>
              <span>All Plugins</span>
              <span className="ml-auto text-xs opacity-60">{pluginsCatalog.length}</span>
            </button>
            {categories.map(cat => {
              const count = pluginsCatalog.filter(p => p.category === cat).length;
              const icons: Record<PluginCategory, string> = {
                'ai-assistant': '🤖',
                'git': '📚',
                'files': '📁',
                'search': '🔍',
                'monitoring': '📊',
                'editor': '✏️',
                'shell': '💻',
                'utility': '⚙️',
                'docker': '🐳',
                'networking': '🌐',
              };
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#0078d4] text-white'
                      : 'text-gray-300 hover:bg-[#3c3c3c]'
                  }`}
                >
                  <span>{icons[cat] || '📦'}</span>
                  <span>{categoryLabels[cat]}</span>
                  <span className="ml-auto text-xs opacity-60">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Plugin Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filteredPlugins.map(plugin => {
                  const installed = isInstalled(plugin.id);
                  const installing = isInstalling(plugin.id);
                  
                  return (
                    <div
                      key={plugin.id}
                      className="bg-[#2d2d2d] border border-[#3c3c3c] rounded-lg p-4 hover:border-[#4c4c4c] transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{plugin.icon}</span>
                          <div>
                            <h4 className="font-medium text-white">{plugin.name}</h4>
                            <span className="text-xs text-gray-500">{plugin.command}</span>
                          </div>
                        </div>
                        {installed && (
                          <span className="text-xs bg-green-600/20 text-green-400 px-2 py-0.5 rounded">
                            Installed
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                        {plugin.description}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        {installed ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleLaunch(plugin)}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                            >
                              Launch
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUninstall(plugin)}
                              className="border-red-600/50 text-red-400 hover:bg-red-600/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleInstall(plugin)}
                            disabled={installing}
                            className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50"
                          >
                            {installing ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Installing...
                              </>
                            ) : (
                              <>
                                <Download className="w-4 h-4 mr-2" />
                                Install
                              </>
                            )}
                          </Button>
                        )}
                        
                        {plugin.website && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(plugin.website, '_blank')}
                            className="text-gray-400 hover:text-white"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            
            {filteredPlugins.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No plugins found matching your search.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-[#3c3c3c] bg-[#252526]">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1.5 py-0.5 bg-[#3c3c3c] rounded text-gray-300">Ctrl+Shift+E</kbd> to toggle this panel
          </p>
        </div>
      </div>
    </div>
  );
}
