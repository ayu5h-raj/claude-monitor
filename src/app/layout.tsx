import type { Metadata } from "next";
import { Nav } from "@/src/components/nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Monitor",
  description: "Terminal-themed monitoring dashboard for Claude Code sessions",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Claude Monitor",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="icon" href="/icon-192.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.svg" />
      </head>
      <body>
        <script dangerouslySetInnerHTML={{ __html: `
(function() {
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

  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-copy-resume]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    window.__copyCmd(btn.getAttribute('data-cmd'), btn, 'icon');
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
})();
        `}} />
        <Nav />
        <main>{children}</main>
      </body>
    </html>
  );
}
