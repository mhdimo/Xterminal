// Terminal Component - xterm.js wrapper
// Renders a terminal using xterm.js and handles PTY communication

import { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { SearchAddon } from 'xterm-addon-search';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { usePty } from '@/hooks/usePty';
import { useSettingsStore, useTabStore } from '@/store';
import { usePaneStore } from '@/store';
import { broadcastManager } from '@/lib/broadcast';
import 'xterm/css/xterm.css';

interface TerminalProps {
  paneId: string;
  sessionId: string | null;
  onTitleChange?: (title: string) => void;
  onSearchReady?: (search: {
    findNext: (term: string, options?: { caseSensitive?: boolean; regex?: boolean }) => boolean;
    findPrevious: (term: string, options?: { caseSensitive?: boolean; regex?: boolean }) => boolean;
    clearSearch: () => void;
  }) => void;
}

export function Terminal({ paneId, sessionId, onTitleChange, onSearchReady }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const sessionIdRef = useRef<string | null>(sessionId);
  const hasSpawnedRef = useRef(false);
  const mountedRef = useRef(true);
  const rendererReadyRef = useRef(false);

  const [isReady, setIsReady] = useState(false);

  // Keep ref in sync with prop
  useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  // Get active profile and color scheme
  const { getActiveProfile, getActiveColorScheme, settings } = useSettingsStore();
  const { setSessionId: setPaneSessionId } = usePaneStore();
  const { updateTabTitleByPane } = useTabStore();

  const profile = getActiveProfile();
  const colorScheme = getActiveColorScheme();

  // Safe fit function - only works after renderer is ready
  const safeFit = useCallback(() => {
    if (!mountedRef.current || !rendererReadyRef.current) return;
    const fitAddon = fitAddonRef.current;
    const xterm = xtermRef.current;
    if (!fitAddon || !xterm) return;
    
    // Check if terminal element is still in DOM and has dimensions
    const element = xterm.element;
    if (!element || !element.offsetWidth || !element.offsetHeight) return;
    
    try {
      fitAddon.fit();
    } catch (e) {
      // Silently ignore fit errors
    }
  }, []);

  // Write data callback for PTY - buffers writes until renderer is ready
  const pendingWritesRef = useRef<string[]>([]);
  
  const writeToTerminal = useCallback((data: string) => {
    if (!mountedRef.current) return;
    const xterm = xtermRef.current;
    if (!xterm) return;
    
    // If renderer isn't ready, buffer the data
    if (!rendererReadyRef.current) {
      pendingWritesRef.current.push(data);
      return;
    }
    
    // First, flush any pending writes
    if (pendingWritesRef.current.length > 0) {
      const pending = pendingWritesRef.current.join('');
      pendingWritesRef.current = [];
      try {
        xterm.write(pending);
      } catch (e) {
        // Renderer might still not be ready, re-buffer
        pendingWritesRef.current.push(pending);
        rendererReadyRef.current = false;
      }
    }
    
    try {
      xterm.write(data);
    } catch (e) {
      // If write fails, buffer it and mark renderer as not ready
      pendingWritesRef.current.push(data);
      rendererReadyRef.current = false;
      console.error('[Terminal] Error writing to xterm:', e);
    }
  }, []);

  // Shell exit state
  const [shellExited, setShellExited] = useState<{ exited: boolean; exitCode: number | null }>({
    exited: false,
    exitCode: null,
  });

  // PTY hook
  const { write, resize, spawn } = usePty(sessionId, {
    onData: writeToTerminal,
    onExit: (exitCode) => {
      if (!mountedRef.current) return;
      setShellExited({ exited: true, exitCode });
      if (onTitleChange) {
        const status = exitCode === 0 ? 'exited' : `failed (${exitCode})`;
        onTitleChange(`Terminal (${status})`);
      }
      // Write exit message to terminal
      const xterm = xtermRef.current;
      if (xterm && rendererReadyRef.current) {
        xterm.write('\r\n\r\n');
        if (exitCode === 0) {
          xterm.write('\x1b[32m[Process exited]\x1b[0m');
        } else {
          xterm.write(`\x1b[31m[Process exited with code ${exitCode}]\x1b[0m`);
        }
        xterm.write('\r\n');
      }
    },
  });

  // Restart the shell
  const restartShell = useCallback(async () => {
    if (!mountedRef.current) return;
    const xterm = xtermRef.current;
    const fitAddon = fitAddonRef.current;
    
    if (!xterm || !fitAddon) return;
    
    // Clear the terminal
    xterm.clear();
    xterm.write('\x1b[2J\x1b[H'); // Clear screen and move cursor to home
    
    // Reset exit state
    setShellExited({ exited: false, exitCode: null });
    hasSpawnedRef.current = false;
    
    // Spawn a new shell
    try {
      const shell = profile?.commandline || '';
      const { cols, rows } = fitAddon.proposeDimensions() || { cols: 80, rows: 24 };
      const sessionInfo = await spawn(shell, cols, rows);
      
      // Update pane with new session
      setPaneSessionId(paneId, sessionInfo.id);
      
      if (onTitleChange) {
        onTitleChange(sessionInfo.shell);
      }
    } catch (error) {
      console.error('[Terminal] Failed to restart shell:', error);
      xterm.write(`\x1b[31mFailed to start shell: ${error}\x1b[0m\r\n`);
    }
  }, [paneId, profile, spawn, setPaneSessionId, onTitleChange]);

  // Initialize xterm.js
  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;
    
    // Already initialized
    if (xtermRef.current) return;

    mountedRef.current = true;
    
    // CRITICAL: Ensure container has dimensions BEFORE creating xterm
    // xterm.js crashes if it tries to render into a zero-sized container
    const ensureContainerReady = (): Promise<void> => {
      return new Promise((resolve) => {
        const check = () => {
          if (!mountedRef.current) return;
          
          // Container needs to have actual dimensions
          if (container.offsetWidth > 0 && container.offsetHeight > 0) {
            resolve();
          } else {
            // Container not ready yet, wait a frame
            requestAnimationFrame(check);
          }
        };
        check();
      });
    };
    
    let initTimeout: ReturnType<typeof setTimeout> | undefined;
    let animationFrameId: number | undefined;
    
    const initializeXterm = async () => {
      // Wait for container to have dimensions
      await ensureContainerReady();
      
      if (!mountedRef.current || xtermRef.current) return;

      // Create xterm.js instance with theme
      const theme = colorScheme ? {
        foreground: colorScheme.foreground,
        background: colorScheme.background,
        cursor: colorScheme.cursorColor,
        selectionBackground: colorScheme.selectionBackground,
        black: colorScheme.black,
        red: colorScheme.red,
        green: colorScheme.green,
        yellow: colorScheme.yellow,
        blue: colorScheme.blue,
        magenta: colorScheme.magenta,
        cyan: colorScheme.cyan,
        white: colorScheme.white,
        brightBlack: colorScheme.brightBlack,
        brightRed: colorScheme.brightRed,
        brightGreen: colorScheme.brightGreen,
        brightYellow: colorScheme.brightYellow,
        brightBlue: colorScheme.brightBlue,
        brightMagenta: colorScheme.brightMagenta,
        brightCyan: colorScheme.brightCyan,
        brightWhite: colorScheme.brightWhite,
      } : {
        background: '#0c0c0c',
        foreground: '#cccccc',
      };

      const xterm = new XTerm({
        theme,
        fontFamily: settings.fontFamily || 'Cascadia Code, Consolas, monospace',
        fontSize: settings.fontSize || 14,
        cursorBlink: settings.cursorBlink ?? true,
        cursorStyle: settings.cursorStyle || 'block',
        scrollback: settings.scrollbackSize || 10000,
        allowProposedApi: true,
        convertEol: true,
      });

      // Add custom key handler for copy/paste shortcuts
      xterm.attachCustomKeyEventHandler((event) => {
        // Ctrl+Shift+C - Copy selection
        if (event.ctrlKey && event.shiftKey && event.key === 'C') {
          if (event.type === 'keydown') {
            const selection = xterm.getSelection();
            if (selection) {
              // Copy to clipboard
              (async () => {
                try {
                  const { writeText } = await import('@tauri-apps/plugin-clipboard-manager');
                  await writeText(selection);
                } catch {
                  // Fallback to navigator clipboard
                  if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                    await navigator.clipboard.writeText(selection);
                  }
                }
              })();
            }
          }
          return false; // Prevent xterm from handling this
        }
        
        // Ctrl+Shift+V - Paste
        if (event.ctrlKey && event.shiftKey && event.key === 'V') {
          if (event.type === 'keydown') {
            (async () => {
              try {
                let text = '';
                try {
                  const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
                  text = await readText();
                } catch {
                  if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
                    text = await navigator.clipboard.readText();
                  }
                }
                if (text) {
                  write(text);
                }
              } catch (err) {
                console.error('[Terminal] Failed to paste:', err);
              }
            })();
          }
          return false; // Prevent xterm from handling this
        }
        
        return true; // Let xterm handle other keys
      });

      const fitAddon = new FitAddon();
      const searchAddon = new SearchAddon();
      const webLinksAddon = new WebLinksAddon(
        (event, uri) => {
          // Only open URLs when Ctrl is pressed
          if (event.ctrlKey) {
            window.open(uri, '_blank');
          }
        },
        {
          // Show tooltip with URL and Ctrl hint
          hover: (event, uri, range) => {
            if (container) {
              container.title = event.ctrlKey ? uri : `Ctrl+Click to open: ${uri}`;
            }
          },
          leave: () => {
            if (container) {
              container.title = '';
            }
          },
        }
      );

      xterm.loadAddon(fitAddon);
      xterm.loadAddon(searchAddon);
      xterm.loadAddon(webLinksAddon);

      // Store refs before opening
      xtermRef.current = xterm;
      fitAddonRef.current = fitAddon;
      searchAddonRef.current = searchAddon;

      // Open terminal in container - now safe because container has dimensions
      try {
        xterm.open(container);
      } catch (e) {
        console.error('[Terminal] Error opening xterm:', e);
        return;
      }

      // Wait for xterm to fully render before enabling operations
      // Use requestAnimationFrame to ensure paint cycle completed
      animationFrameId = requestAnimationFrame(() => {
        if (!mountedRef.current) return;
        
        // Double RAF to ensure we're past the initial render
        animationFrameId = requestAnimationFrame(() => {
          if (!mountedRef.current || !xtermRef.current) return;
          
          rendererReadyRef.current = true;
          
          // Now safe to fit
          try {
            fitAddonRef.current?.fit();
          } catch (e) {
            // Ignore fit errors
          }
          
          // Flush any pending writes
          if (pendingWritesRef.current.length > 0 && xtermRef.current) {
            const pending = pendingWritesRef.current.join('');
            pendingWritesRef.current = [];
            try {
              xtermRef.current.write(pending);
            } catch (e) {
              // Ignore
            }
          }
          
          // Expose search API
          if (onSearchReady && searchAddonRef.current) {
            const sa = searchAddonRef.current;
            onSearchReady({
              findNext: (term, options) => sa.findNext(term, options),
              findPrevious: (term, options) => sa.findPrevious(term, options),
              clearSearch: () => sa.clearDecorations(),
            });
          }
          
          setIsReady(true);
        });
      });

      // Handle user input
      const dataDisposable = xterm.onData((data) => {
        if (!mountedRef.current) return;
        
        // Write to local PTY
        write(data).catch((err) => {
          console.error('[Terminal] Failed to write to PTY:', err);
        });
        
        // If broadcast mode is on, send to other panes
        const { broadcastMode } = usePaneStore.getState();
        if (broadcastMode) {
          broadcastManager.broadcast(data, paneId);
        }
      });

      // Register to receive broadcast input from other panes
      broadcastManager.register(paneId, (data) => {
        if (!mountedRef.current) return;
        const { broadcastMode } = usePaneStore.getState();
        if (broadcastMode) {
          write(data).catch(() => {});
        }
      });

      // Handle terminal resize
      const resizeDisposable = xterm.onResize(({ cols, rows }) => {
        if (!mountedRef.current) return;
        resize(cols, rows).catch(() => {});
      });

      // Handle title changes (e.g., when running commands like 'claude', 'ssh user@host')
      const titleDisposable = xterm.onTitleChange((title) => {
        if (!mountedRef.current) return;
        if (title && title.trim()) {
          updateTabTitleByPane(paneId, title);
        }
      });

      // Handle bell (e.g., tab completion with no matches, error alerts)
      const { setTabBell, getTabByPaneId } = useTabStore.getState();
      const bellDisposable = xterm.onBell(() => {
        if (!mountedRef.current) return;
        const tab = getTabByPaneId(paneId);
        if (tab && tab.id !== useTabStore.getState().activeTabId) {
          setTabBell(tab.id, true);
        }
      });

      // Focus terminal
      xterm.focus();
      
      // Store disposables for cleanup
      (xterm as any)._disposables = [dataDisposable, resizeDisposable, titleDisposable, bellDisposable];
    };
    
    initializeXterm();

    // Cleanup
    return () => {
      mountedRef.current = false;
      rendererReadyRef.current = false;
      
      // Unregister from broadcast
      broadcastManager.unregister(paneId);
      
      // Dispose any stored event listeners
      const xterm = xtermRef.current;
      if (xterm) {
        const disposables = (xterm as any)._disposables;
        if (disposables) {
          for (const d of disposables) {
            try { d.dispose(); } catch (e) {}
          }
        }
      }
      
      // Clear refs before disposal
      const xtermToDispose = xtermRef.current;
      xtermRef.current = null;
      fitAddonRef.current = null;
      
      // Dispose xterm in next tick
      if (xtermToDispose) {
        setTimeout(() => {
          try {
            xtermToDispose.dispose();
          } catch (e) {
            // Ignore disposal errors
          }
        }, 0);
      }
    };
  }, []); // Only run once

  // Handle font size changes (zoom)
  useEffect(() => {
    const xterm = xtermRef.current;
    if (!xterm || !rendererReadyRef.current) return;
    
    const newSize = settings.fontSize || 14;
    if (xterm.options.fontSize !== newSize) {
      xterm.options.fontSize = newSize;
      safeFit();
    }
  }, [settings.fontSize, safeFit]);

  // Handle container resize
  useEffect(() => {
    const container = terminalRef.current;
    if (!container) return;

    let resizeTimeout: ReturnType<typeof setTimeout>;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(safeFit, 16);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(resizeTimeout);
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [safeFit]);

  // Spawn PTY when ready
  useEffect(() => {
    if (!isReady || sessionId || hasSpawnedRef.current || !mountedRef.current) return;

    hasSpawnedRef.current = true;

    const doSpawn = async () => {
      try {
        const shell = profile?.shell || '/bin/bash';
        const cols = xtermRef.current?.cols || 80;
        const rows = xtermRef.current?.rows || 24;


        const sessionInfo = await spawn(shell, cols, rows);
        
        if (!mountedRef.current) return;

        
        setPaneSessionId(paneId, sessionInfo.id);
        sessionIdRef.current = sessionInfo.id;
      } catch (error) {
        console.error('[Terminal] Failed to spawn PTY:', error);
        hasSpawnedRef.current = false;
      }
    };

    doSpawn();
  }, [isReady, sessionId, profile, spawn, paneId, setPaneSessionId]);

  // Handle right-click for paste
  const handleContextMenu = useCallback(async (e: React.MouseEvent) => {
    const rightClickAction = settings.terminal?.rightClickAction || 'paste';
    
    if (rightClickAction === 'paste') {
      e.preventDefault();
      try {
        // Try Tauri clipboard API first (works in Tauri app)
        let text = '';
        try {
          const { readText } = await import('@tauri-apps/plugin-clipboard-manager');
          text = await readText();
        } catch {
          // Fallback to web clipboard API (requires HTTPS or localhost)
          if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
            text = await navigator.clipboard.readText();
          }
        }
        
        if (text && xtermRef.current && rendererReadyRef.current) {
          write(text).catch(console.error);
        }
      } catch (err) {
        console.error('[Terminal] Failed to paste:', err);
      }
    } else if (rightClickAction === 'selectWord') {
      e.preventDefault();
      // Select word at cursor position - handled by xterm
    }
    // For 'contextMenu', let the default browser context menu show
  }, [settings.terminal?.rightClickAction, write]);

  return (
    <div 
      className="h-full w-full overflow-hidden relative" 
      style={{ backgroundColor: colorScheme?.background || '#0c0c0c' }}
      onContextMenu={handleContextMenu}
    >
      <div ref={terminalRef} className="h-full w-full" />
      
      {/* Shell Exit Overlay */}
      {shellExited.exited && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-800 rounded-lg p-6 shadow-xl border border-zinc-700 max-w-sm">
            <div className="text-center">
              {shellExited.exitCode === 0 ? (
                <div className="text-green-400 text-lg font-semibold mb-2">
                  Process Exited
                </div>
              ) : (
                <div className="text-red-400 text-lg font-semibold mb-2">
                  Process Failed (code {shellExited.exitCode})
                </div>
              )}
              <p className="text-zinc-400 text-sm mb-4">
                The shell process has ended.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={restartShell}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Restart Shell
                </button>
                <button
                  onClick={() => setShellExited({ exited: false, exitCode: null })}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-md text-sm font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
