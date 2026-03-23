import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Nav } from "@/src/components/nav";
import { NewSessionDialog } from "@/src/components/new-session-dialog";
import "./globals.css";

export const metadata: Metadata = {
  title: "claude-monitor",
  description: "Terminal-themed monitoring dashboard for Claude Code sessions",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Script strategy="afterInteractive" dangerouslySetInnerHTML={{ __html: `
(function() {
  // ─── Copy utilities ───────────────────────────────────
  window.__showCopyToast = function(msg) {
    var existing = document.getElementById('copy-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'copy-toast';
    toast.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;background:#0a0a0a;border:1px solid #00ff41;border-radius:4px;padding:10px 14px;font-family:monospace;font-size:12px;max-width:420px;box-shadow:0 4px 12px rgba(0,255,65,0.15);opacity:0;transform:translateY(-8px);transition:opacity 0.2s,transform 0.2s;';
    var line1 = document.createElement('div');
    line1.style.cssText = 'color:#00ff41;margin-bottom:4px;font-size:11px;';
    line1.textContent = '$ copied to clipboard';
    var line2 = document.createElement('div');
    line2.style.cssText = 'color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    line2.textContent = msg;
    toast.appendChild(line1);
    toast.appendChild(line2);
    document.body.appendChild(toast);
    requestAnimationFrame(function() { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
    setTimeout(function() {
      toast.style.opacity = '0'; toast.style.transform = 'translateY(-8px)';
      setTimeout(function() { toast.remove(); }, 200);
    }, 2000);
  };

  window.__copyToClipboard = function(text, label) {
    function onDone() {
      window.__showCopyToast(label || text);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(onDone);
    } else {
      var ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      onDone();
    }
  };

  window.__copyCmd = function(cmd, btn, origContent) {
    function onSuccess() {
      btn.textContent = origContent === 'icon' ? '\\u2713' : '[ copied! ]';
      btn.style.color = 'var(--green)';
      window.__showCopyToast(cmd);
      setTimeout(function() {
        if (origContent === 'icon') { btn.innerHTML = '\\u25b6'; } else { btn.textContent = '[ copy resume cmd ]'; }
        btn.style.color = 'var(--text-muted)';
        if (btn.style.borderColor) btn.style.borderColor = 'var(--border)';
      }, 1500);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cmd).then(onSuccess);
    } else {
      var ta = document.createElement('textarea');
      ta.value = cmd; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      onSuccess();
    }
  };

  // ─── Global event delegation ──────────────────────────
  document.addEventListener('click', function(e) {
    if (!e.target || !e.target.closest) return;

    // Open new-session dialog
    var openNew = e.target.closest('[data-open-new-session]');
    if (openNew) {
      e.preventDefault();
      var dlg = document.getElementById('new-session-dialog');
      if (dlg && dlg.showModal) dlg.showModal();
      return;
    }
    // Close dialog
    var closeDlg = e.target.closest('[data-close-dialog]');
    if (closeDlg) {
      e.preventDefault();
      var pdlg = closeDlg.closest('dialog');
      if (pdlg) pdlg.close();
      return;
    }

    // Copy resume button (session rows)
    var copyResume = e.target.closest('[data-copy-resume]');
    if (copyResume) {
      e.preventDefault();
      e.stopPropagation();
      window.__copyCmd(copyResume.getAttribute('data-cmd'), copyResume, 'icon');
      return;
    }

    // Resume copy button (session detail header)
    var resumeBtn = e.target.closest('#resume-copy-btn');
    if (resumeBtn) {
      e.preventDefault();
      var cmd = resumeBtn.getAttribute('data-cmd');
      if (window.__copyCmd) {
        window.__copyCmd(cmd, resumeBtn, 'button');
      }
      return;
    }

    // Quick actions copy buttons
    var copyAction = e.target.closest('#quick-actions [data-copy-action]');
    if (copyAction) {
      var text = copyAction.getAttribute('data-copy-action');
      var label = copyAction.getAttribute('data-copy-label');
      if (window.__copyToClipboard) {
        window.__copyToClipboard(text, label);
      }
      return;
    }

    // Session row more-actions menu
    var moreActions = e.target.closest('details[data-more-actions]');
    if (moreActions) {
      var maSummary = e.target.closest('details[data-more-actions] > summary');
      if (maSummary) {
        e.stopPropagation();
        e.preventDefault();
        moreActions.open = !moreActions.open;
        return;
      }
      var maCopy = e.target.closest('details[data-more-actions] [data-copy-action]');
      if (maCopy) {
        e.preventDefault();
        e.stopPropagation();
        var maText = maCopy.getAttribute('data-copy-action');
        var maLabel = maCopy.getAttribute('data-copy-label');
        if (window.__copyToClipboard) window.__copyToClipboard(maText, maLabel);
        moreActions.removeAttribute('open');
        return;
      }
      e.stopPropagation();
      e.preventDefault();
      return;
    }

    // Sidebar repo toggle (triangle vs link)
    var summary = e.target.closest('summary');
    if (summary) {
      var details = summary.parentElement;
      if (details && details.hasAttribute('data-repo-details')) {
        var toggle = e.target.closest('[data-repo-toggle]');
        var link = e.target.closest('[data-repo-link]');
        if (link) {
          e.preventDefault();
          window.location.href = link.getAttribute('href');
          return;
        }
        e.preventDefault();
        details.open = !details.open;
        return;
      }
    }
  });

  // Hover effects for resume copy btn
  document.addEventListener('mouseenter', function(e) {
    if (!e.target || !e.target.closest) return;
    var btn = e.target.closest('#resume-copy-btn');
    if (btn) { btn.style.borderColor = 'var(--green)'; btn.style.color = 'var(--green)'; }
    var qa = e.target.closest('#quick-actions [data-copy-action]');
    if (qa) { qa.style.color = '#00ff41'; qa.style.borderColor = '#00ff41'; }
  }, true);

  document.addEventListener('mouseleave', function(e) {
    if (!e.target || !e.target.closest) return;
    var btn = e.target.closest('#resume-copy-btn');
    if (btn) { btn.style.borderColor = 'var(--border)'; btn.style.color = 'var(--text-muted)'; }
    var qa = e.target.closest('#quick-actions [data-copy-action]');
    if (qa) { qa.style.color = '#888'; qa.style.borderColor = '#333'; }
  }, true);

  // ─── Sidebar resize handle (event delegation for Suspense compat) ────
  var sidebarDragState = { dragging: false, startX: 0, startW: 0 };

  document.addEventListener('mousedown', function(e) {
    if (!e.target || !e.target.closest) return;
    var dragHandle = e.target.closest('#sidebar-drag');
    if (dragHandle) {
      var sidebar = document.getElementById('sidebar');
      if (sidebar) {
        sidebarDragState = { dragging: true, startX: e.clientX, startW: sidebar.offsetWidth };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      }
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (!sidebarDragState.dragging) return;
    var sidebar = document.getElementById('sidebar');
    if (sidebar) {
      var w = Math.max(180, Math.min(sidebarDragState.startW + e.clientX - sidebarDragState.startX, window.innerWidth * 0.5));
      sidebar.style.width = w + 'px';
      sidebar.style.minWidth = w + 'px';
    }
  });

  document.addEventListener('mouseup', function() {
    if (!sidebarDragState.dragging) return;
    sidebarDragState.dragging = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  document.addEventListener('mouseenter', function(e) {
    if (!e.target || !e.target.closest) return;
    var dragHandle = e.target.closest('#sidebar-drag');
    if (dragHandle) dragHandle.style.background = 'var(--green)';
  }, true);

  document.addEventListener('mouseleave', function(e) {
    if (!e.target || !e.target.closest) return;
    var dragHandle = e.target.closest('#sidebar-drag');
    if (dragHandle && !sidebarDragState.dragging) dragHandle.style.background = 'var(--border)';
  }, true);

  // ─── IDE resize handles (event delegation) ────────────
  var ideDragState = { type: null, startX: 0, startY: 0, startSize: 0 };

  document.addEventListener('mousedown', function(e) {
    if (!e.target || !e.target.closest) return;

    // Sidebar horizontal resize
    var sidebarDrag = e.target.closest('#ide-sidebar-drag');
    if (sidebarDrag) {
      var sb = document.querySelector('.ide-sidebar');
      if (sb) {
        ideDragState = { type: 'sidebar', startX: e.clientX, startY: 0, startSize: sb.offsetWidth };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      }
      return;
    }

    // Dock vertical resize
    var dockDrag = e.target.closest('#ide-dock-drag');
    if (dockDrag) {
      var dc = document.getElementById('ide-dock-content');
      if (dc) {
        ideDragState = { type: 'dock', startX: 0, startY: e.clientY, startSize: dc.offsetHeight };
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';
        e.preventDefault();
      }
      return;
    }
  });

  document.addEventListener('mousemove', function(e) {
    if (!ideDragState.type) return;
    if (ideDragState.type === 'sidebar') {
      var ideMain = document.querySelector('.ide-main');
      if (ideMain) {
        var w = Math.max(200, Math.min(ideDragState.startSize + e.clientX - ideDragState.startX, window.innerWidth * 0.45));
        ideMain.style.gridTemplateColumns = w + 'px 5px 1fr';
      }
    } else if (ideDragState.type === 'dock') {
      var dc = document.getElementById('ide-dock-content');
      if (dc) {
        var h = Math.max(150, Math.min(ideDragState.startSize - (e.clientY - ideDragState.startY), window.innerHeight * 0.7));
        dc.style.height = h + 'px';
      }
    }
  });

  document.addEventListener('mouseup', function() {
    if (!ideDragState.type) return;
    ideDragState.type = null;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // ─── Search form loading state ────────────────────────
  var searchForm = document.getElementById('search-form');
  var searchBtn = document.getElementById('search-btn');
  var searchPrompt = document.getElementById('search-prompt');
  if (searchForm && searchBtn) {
    searchForm.addEventListener('submit', function() {
      var q = searchForm.querySelector('input[name="q"]');
      if (q && !q.value.trim()) return;
      searchBtn.textContent = '[searching...]';
      searchBtn.style.color = 'var(--amber)';
      if (searchPrompt) { searchPrompt.textContent = '~'; searchPrompt.style.color = 'var(--amber)'; }
      searchBtn.disabled = true;
    });
  }

  // ─── File page auto-submit ────────────────────────────
  var repoSelect = document.getElementById('repo-select');
  if (repoSelect) {
    repoSelect.addEventListener('change', function() {
      repoSelect.closest('form').submit();
    });
  }
})();
        `}} />
        <Nav />
        <Suspense fallback={null}>
          <NewSessionDialog />
        </Suspense>
        <main>{children}</main>
      </body>
    </html>
  );
}
